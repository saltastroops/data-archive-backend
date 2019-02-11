import * as Sentry from "@sentry/node";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import session from "express-session";
import { GraphQLServer } from "graphql-yoga";
import passport from "passport";
import passportLocal from "passport-local";
import { prisma } from "./generated/prisma-client";
import { resolvers } from "./resolvers";

// Setting up Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN
});

// Creating a GraphQL-Yoga server
const createServer = async () => {
  // Setting up passport for managing user authentication
  passport.use(
    // Using a passport local strategy for controling user logging in
    new passportLocal.Strategy(
      { usernameField: "username", passwordField: "password" },
      async (username, password, done) => {
        // Only retrieving a user with the supplied username.
        const user = (await prisma.users({ where: { username } }))[0];
        // Check if the user exist and return it content for use in subsequent request.
        if (user && (await bcrypt.compare(password, user.password))) {
          done(null, { id: user.id, name: user.name, username: user.username });
        } else {
          done(null, false);
        }
      }
    )
  );

  // Creating the server, adding the options for context, resolvers and typeDefs.
  const server = new GraphQLServer({
    context: (req: any) => ({
      prisma,
      user: req.request.user
    }),
    resolvers,
    typeDefs: "./src/schema.graphql"
  });

  // Make the server use the body parser for handlin JSON format.
  server.express.use(bodyParser.json());

  // Make the server use the persisted session for subsequents request.
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
  // Initializing the use of passport with the session.
  server.express.use(passport.initialize());
  server.express.use(passport.session());

  // Serializing and deserializing for every request to authenticate user session.
  passport.serializeUser((user: { id: string }, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    const user = (await prisma.users({ where: { id } }))[0];
    done(
      null,
      user ? { id: user.id, username: user.username, name: user.name } : false
    );
  });

  // Login authenticator endpoint by means of passport local athenticate function.
  server.express.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
      if (err) {
        return res
          .status(500)
          .send("Authentication failure due to an internal server error");
      } else if (!user) {
        return res.status(400).send("Username or password wrong");
      } else {
        req.login(user, error => {
          if (error) {
            return next(error);
          }
          return res.send("You have been logged in");
        });
      }
    })(req, res, next);
  });

  // Logout endpoint.
  server.express.post("/logout", (req, res) => {
    req.logout();
    res.send("You have been logged out");
  });

  // Returning the server
  return server;
};

export default createServer;
