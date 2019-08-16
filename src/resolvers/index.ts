import { AuthProviderName } from "../util/authProvider";
import { Mutation } from "./Mutation";
import { Query } from "./Query";

// Defining the context interface
interface IContext {
  user: { id: string | number; authProvider: AuthProviderName };
}

// Defining resolvers
const resolvers = {
  Mutation,
  Query
};

export { IContext, resolvers };
