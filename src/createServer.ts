import * as Sentry from "@sentry/node";
import bodyParser from "body-parser";
import compression from "compression";
import { Request, Response } from "express";
import session from "express-session";
import { GraphQLServer } from "graphql-yoga";
import moment from "moment";
import passport from "passport";
import passportLocal from "passport-local";
import * as path from "path";
import { ssdaPool } from "./db/postgresql_pool";
import { resolvers } from "./resolvers";
import { getAuthProvider } from "./util/authProvider";
import {
  dataFileDataLoader,
  dataRequestDataLoader,
  userDataLoader
} from "./util/loaders";
import {
  getUserById,
  isAdmin,
  mayViewDataFile,
  ownsDataRequest,
  User
} from "./util/user";
import { downloadZippedDataRequest } from "./util/zipDataRequest";
// tslint:disable-next-line
const pgSession = require("connect-pg-simple")(session);

// Set up Sentry
if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.SENTRY_DSN
  });
}

/**
 * Create the server.
 *
 * The server provides the following endpoints.
 *
 * /: Endpoint for GraphQL queries and mutations.
 * /auth/login: Endpoint for logging a user in.
 * /auth/logout: Endpoint for logging a user out.
 *
 * This functions returns a promise resolving to the server.
 *
 * See the file index.ts for an example of how to launch the server.
 */
const createServer = async () => {
  // Set up passport for managing user authentication
  passport.use(
    // Authenticate against a username and password
    new passportLocal.Strategy(
      {
        passReqToCallback: true,
        passwordField: "password",
        usernameField: "username"
      },
      async (request, username, password, done) => {
        const authenticationProvider = getAuthProvider(
          request.body.authProvider
        );
        const user = await authenticationProvider.authenticate(
          username,
          password
        );
        done(null, user ? user : false);
      }
    )
  );

  // Create the server
  const server = new GraphQLServer({
    context: (req: any) => ({
      loaders: {
        dataFileLoader: dataFileDataLoader(req.request.user),
        dataRequestLoader: dataRequestDataLoader(),
        userLoader: userDataLoader()
      },
      user: req.request.user
    }),
    resolvers,
    typeDefs: "./src/schema.graphql"
  });

  // Compress the returned response.
  server.express.use(
    compression({
      // Only compress what can be compressed.
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 0
    })
  );

  // Enable CORS
  server.express.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", process.env.FRONTEND_HOST);
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  });

  // Handle JSON input
  server.express.use(bodyParser.json());

  // Make the server use the persisted session for subsequent requests
  server.express.use(
    session({
      cookie: {
        httpOnly: true,
        path: "/",
        sameSite: true,
        secure: false
      },
      name: "connect.sid",
      proxy: true,
      resave: true,
      rolling: false,
      saveUninitialized: true,
      secret: "" + process.env.SESSION_SECRET,
      store:
        process.env.NODE_ENV === "test"
          ? new session.MemoryStore()
          : new pgSession({
              pool: ssdaPool,
              schemaName: "admin",
              tableName: "ssda_session"
            }),
      unset: "keep"
    })
  );

  // NB! Make sure this comes after the express session
  // Initialise the use of passport with the session
  server.express.use(passport.initialize());
  server.express.use(passport.session());

  // Serialize and deserialize for every request. Only the user id is stored
  // in the session.

  passport.serializeUser((user: any, done) => {
    done(null, { userId: user.id });
  });

  passport.deserializeUser(async (user: any, done) => {
    const ssdaUser = await getUserById(user.userId);
    done(null, ssdaUser ? ssdaUser : false);
  });

  /**
   * Login endpoint.
   *
   * The request body must be a JSON object with the following fields:
   *
   * username: The username.
   * password: The password.
   *
   * The endpoint returns a JSON object with the following fields:
   *
   * success: Whether the user was logged in successfully.
   * message: A success or error message.
   *
   * The following HTTP status codes are used:
   *
   * 200: If the user is logged in successfully.
   * 401: If the username or password are wrong.
   * 500: If a server-side error occurs.
   */
  server.express.post("/?/auth/login", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
      if (err) {
        return res.status(500).send({
          message:
            "You have not been logged in due to an internal server error.",
          success: false
        });
      } else if (!user) {
        return res.status(401).send({
          message: "The username or password is wrong.",
          success: false
        });
      } else {
        req.login(user, error => {
          if (error) {
            return next(error);
          }
          return res.send({
            message: "You have been logged in.",
            success: true
          });
        });
      }
    })(req, res, next);
  });

  /**
   * Logout endpoint.
   *
   * No request body is expected.
   *
   * The endpoint returns a JSON object with the following fields:
   *
   * success: true.
   * message: A success message.
   *
   * The success field is always true.
   */
  server.express.post("/?/auth/logout", (req, res) => {
    req.logout();
    res.send({
      message: "You have been logged out.",
      success: true
    });
  });

  /**
   * Endpoint for downloading the FITS file.
   *
   * The URL includes the following parameters.
   *
   * :dataFileId
   *     The id of the data file.
   * :dataFilename
   *     The data filename.
   */
  server.express.get("/?/data/:dataFileId/:dataFilename", async (req, res) => {
    // Not found error
    const notFound = {
      message: "The requested FITS file does not exist.",
      success: false
    };

    // Internal server error
    const internalServerError = {
      message:
        "There has been an internal server error while retrieving the FITS file.",
      success: false
    };

    // Proprietary error
    const proprietary = {
      message: "The file you are trying to download is proprietary.",
      success: false
    };

    // Get all the params from the request
    const { dataFileId, dataFilename } = req.params;

    // Query for retrieving the FITS file.
    // The path of the reduced data file is retrieved.
    const sql = `
        SELECT (paths).reduced as path, data_release
        FROM observations.artifact AS a
        JOIN observations.plane AS p ON a.plane_id = p.plane_id
        JOIN observations.observation AS o ON p.observation_id = o.observation_id
        WHERE artifact_id = $1
      `;

    const queryResults: any = await ssdaPool.query(sql, [dataFileId]);
    const rows = queryResults.rows;
    if (!rows.length) {
      Sentry.captureMessage(notFound.message);
      return res.status(404).send(notFound);
    }

    const { path: filePath, data_release: publicFrom } = rows[0];

    // Check whether the data file is public or the user may access it
    // because they own the data or are an administrator.
    if (!(await mayViewDataFile(req.user as User, dataFileId))) {
      return res.status(403).send(proprietary);
    }

    // Get the base path
    const basePath = process.env.FITS_BASE_DIR || "";

    // Form a full path for the FITS file location.
    const fullPath = path.join(basePath, filePath);

    // Download the FITS file
    res.type("application/fits");
    res.download(fullPath, dataFilename, err => {
      if (err) {
        if (!res.headersSent) {
          Sentry.captureMessage(internalServerError.message);
          res.status(500).send(internalServerError);
        } else {
          res.end();
        }
      }
    });
  });

  /**
   * Endpoint for downloading the data for a full data request.
   *
   * The URL includes the following parameters.
   *
   * :dataRequestId
   *     The id of the data request.
   */
  server.express.get(
    "/?/downloads/data-requests/:dataRequestId",
    downloadZippedDataRequest
  );

  // Returning the server
  return server;
};
export default createServer;
