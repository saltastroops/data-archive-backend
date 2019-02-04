import * as Sentry from "@sentry/node";
import { GraphQLServer } from "graphql-yoga";
import { prisma } from "./generated/prisma-client";
import resolvers from "./resolvers";

// Setting up Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN
});

// Creating a GraphQL-Yoga server
const createServer = () => {
  // Server options
  const serverOptions = {
    context: {
      prisma
    },
    resolvers,
    typeDefs: "./src/schema.graphql"
  };

  return new GraphQLServer(serverOptions);
};

export { createServer };
