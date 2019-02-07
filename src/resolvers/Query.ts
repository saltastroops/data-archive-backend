import { Prisma } from "../generated/prisma-client";

// Defining Query methods
const Query = {
  // Query for users
  users(root: any, args: any, ctx: any) {
    return "users";
  },

  // Query for users
  user(root: any, args: any, ctx: any) {
    return "user";
  }
};

export { Query };
