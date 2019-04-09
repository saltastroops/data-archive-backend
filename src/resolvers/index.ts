import { DataRequestsTypes } from "./DataRequest";
import { Mutation } from "./Mutation";
import { Query } from "./Query";

// Defining resolvers
const resolvers = {
  ...DataRequestsTypes,
  Mutation,
  Query
};

export { resolvers };
