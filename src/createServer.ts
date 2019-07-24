import * as Sentry from "@sentry/node";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import { Request, Response } from "express";
import session from "express-session";
import { GraphQLServer } from "graphql-yoga";
import passport from "passport";
import passportLocal from "passport-local";
import * as path from "path";
import pool from "./db/pool";
import { prisma } from "./generated/prisma-client";
import { resolvers } from "./resolvers";
import { isAdmin, ownsDataFile, ownsDataRequest } from "./util/user";

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
      { usernameField: "username", passwordField: "password" },
      async (username, password, done) => {
        // Only retrieving a user with the supplied username
        const user = await prisma.user({ username });

        // Check if the user exists and add it to the request
        if (user && (await bcrypt.compare(password, user.password))) {
          done(null, user);
        } else {
          done(null, false);
        }
      }
    )
  );

  // Create the server
  const server = new GraphQLServer({
    context: (req: any) => ({
      prisma,
      user: req.request.user
    }),
    resolvers,
    typeDefs: "./src/schema.graphql"
  });

  // Enable CORS
  server.express.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
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
      store: new session.MemoryStore(),
      unset: "keep"
    })
  );

  // NB! Make sure this comes after the express session
  // Initialise the use of passport with the session
  server.express.use(passport.initialize());
  server.express.use(passport.session());

  // Serialize and deserialize for every request. Only the user id is stored
  // in the session.

  passport.serializeUser((user: { id: string }, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    const user = await prisma.user({ id });
    done(null, user ? user : false);
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
  server.express.post("/auth/login", (req, res, next) => {
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
  server.express.post("/auth/logout", (req, res) => {
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
  server.express.get("/data/:dataFileId/:dataFilename", async (req, res) => {
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

    // Query for retrieving the FITS file
    const sql = `
        SELECT path, publicFrom
        FROM DataFile AS df
        JOIN Observation AS ob ON ob.observationId = df.observationId
        WHERE df.dataFileId = ?
      `;

    const results: any = await pool.query(sql, [dataFileId]);
    if (!results.length) {
      return res.status(404).send(notFound);
    }

    const { id, path: previewPath, publicFrom } = results[0];

    // Check whether the data file is public or the user may access it
    // because they own the data or are an administrator.
    if (
      publicFrom > Date.now() &&
      !ownsDataFile(req.user, dataFileId) &&
      !isAdmin(req.user)
    ) {
      return res.status(403).send(proprietary);
    }

    // Get the base path
    const basePath = process.env.FITS_BASE_DIR || "";

    // Form a full path for the FITS file location
    const fullPath = path.join(basePath, previewPath);

    // Download the FITS header file
    res.type("application/fits");
    res.download(fullPath, dataFilename, err => {
      if (err) {
        if (!res.headersSent) {
          res.status(500).send(internalServerError);
        } else {
          res.end();
        }
      }
    });
  });

  /**
   * Endpoint for downloading the data file preview file.
   *
   * The URL includes the following parameters.
   *
   * :dataFileId
   *     The id of the data file.
   * :dataPreviewFileName
   *     The data preview filename.
   */
  server.express.get(
    "/previews/:dataFileId/:dataPreviewFileName",
    async (req, res) => {
      // Get the data request
      const notFound = {
        message: "The requested file does not exist.",
        success: false
      };

      // Internal server error
      const internalServerError = {
        message:
          "There has been an internal server error while retrieving a preview image.",
        success: false
      };

      // Get all the params from the request
      const { dataFileId, dataPreviewFileName } = req.params;

      // Download the data file preview image
      // Query for retrieving the data previews
      const sql = `
      SELECT path
             FROM DataPreview AS dp
      WHERE dp.dataFileId = ? AND dp.dataPreviewFileName = ?
    `;
      // Querying the data preview image path
      const results: any = await pool.query(sql, [
        dataFileId,
        dataPreviewFileName
      ]);
      if (!results.length) {
        return res.status(404).send(notFound);
      }
      const { path: previewPath } = results[0];

      // Get the base path if exist
      const basePath = process.env.PREVIEW_BASE_DIR || "";

      // Form a full path for the image location
      const fullPath = path.join(basePath, previewPath);

      // Download the preview file
      res.download(fullPath, dataPreviewFileName, err => {
        if (err) {
          if (!res.headersSent) {
            res.status(500).send(internalServerError);
          } else {
            res.end();
          }
        }
      });
    }
  );

  /**
   * Endpoint for downloading the data for a full data request.
   *
   * The URL includes the following parameters.
   *
   * :dataRequestId
   *     The id of the data request.
   * :filename
   *     The filename to use for the downloaded file. It is not used for
   *     identifying the data file, but is used in the attachment HTTP header.
   */
  server.express.get(
    "/downloads/data-requests/:dataRequestId/:filename",
    async (req, res) => {
      // Check if the user is logged in
      if (!req.user) {
        return res.status(401).send({
          message: "You must be logged in.",
          success: false
        });
      }

      // Get all the params from the request
      const { dataRequestId, filename } = req.params;

      // Download the data file for the data request
      return downloadDataRequest({ dataRequestId, filename, req, res });
    }
  );

  /**
   * Endpoint for downloading the data for a data request part.
   *
   * The URL includes the following parameters.
   *
   * :dataRequestId
   *     The id of the data request.
   * :dataRequestPartId:
   *     The id of the data request part.
   * :filename
   *     The filename to use for the downloaded file. It is not used for
   *     identifying the data file, but is used in the attachment HTTP header.
   */
  server.express.get(
    "/downloads/data-requests/:dataRequestId/:dataRequestPartId/:filename",
    async (req, res) => {
      // Check if the user is logged in
      if (!req.user) {
        return res.status(401).send({
          message: "You must be logged in.",
          success: false
        });
      }

      // Get all the params from the request
      const { dataRequestId, dataRequestPartId, filename } = req.params;

      // Download the data file for the data request part
      return downloadDataRequest({
        dataRequestId,
        dataRequestPartId,
        filename,
        req,
        res
      });
    }
  );

  // Returning the server
  return server;
};

interface IDataRequestDownloadParameters {
  dataRequestId: string;
  dataRequestPartId?: string;
  filename: string;
  req: Request;
  res: Response;
}

async function downloadDataRequest({
  dataRequestId,
  dataRequestPartId,
  filename,
  req,
  res
}: IDataRequestDownloadParameters) {
  // Get the data request
  const notFound = {
    message: "The requested file does not exist.",
    success: false
  };

  // TODO UPDATE INCLUDE MORE INFORMATION IN THE FRAGMENT AS REQUIRED
  const dataRequest = await prisma.dataRequest({ id: dataRequestId })
    .$fragment(`{
    id
    uri
    parts{
      id
      uri
    }
    user{
      id
    }
  }`);

  if (!dataRequest) {
    return res.status(404).send(notFound);
  }

  // TODO UPDATE include dataRequest interface according to the mysql database
  // Check that the user may download content for the data request, either
  // because they own the request or because they are an administrator.
  const mayDownload =
    ownsDataRequest(dataRequest, req.user) || isAdmin(req.user);

  // If the user does not own the data request to download,
  // nor is an ADMIN, forbid the user from downloading
  if (!mayDownload) {
    return res.status(403).send({
      message: "You are not allowed to download the requested file.",
      success: false
    });
  }

  // Get the download URI
  let uri: string;
  if (dataRequestPartId) {
    const dataRequestPart = (dataRequest as any).parts.find(
      (part: any) => part.id === dataRequestPartId
    );
    if (!dataRequestPart) {
      return res.status(404).send(notFound);
    }
    uri = dataRequestPart.uri;
  } else {
    uri = (dataRequest as any).uri;
  }

  // Download the data request file
  res.download(uri, filename, err => {
    if (err) {
      if (!res.headersSent) {
        res.status(404).send(notFound);
      } else {
        res.end();
      }
    }
  });
}

export default createServer;
