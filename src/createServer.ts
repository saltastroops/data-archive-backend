import * as Sentry from "@sentry/node";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import session from "express-session";
import { GraphQLServer } from "graphql-yoga";
import passport from "passport";
import passportLocal from "passport-local";
import { prisma } from "./generated/prisma-client";
import { resolvers } from "./resolvers";

// Set up Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN
});

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

  // Returning the server
  return server;
};

export default createServer;
