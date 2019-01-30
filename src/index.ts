import * as Sentry from "@sentry/node";
import dotenv from "dotenv";
import { GraphQLServer } from "graphql-yoga";
import { prisma } from "./generated/prisma-client";
import resolvers from "./resolvers";

// Config dotenv
dotenv.config();

// Setting up Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN
});

// Creating server options
const serverOptions = {
  context: {
    prisma
  },
  resolvers,
  typeDefs: "./src/schema.graphql"
};

// Instatiating GraphQL-Yoga server
const server = new GraphQLServer(serverOptions);

// Starting the server with the cors enabled
server.start(
  {
    cors: {
      credentials: true,
      origin: process.env.FRONTEND_URL
    }
  } /* ,
  () =>
    console.log(
      `The server is listening on http://localhost:${process.env.PORT}`
    ) */
);

export { server };
