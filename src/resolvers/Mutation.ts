import { Prisma } from "../generated/prisma-client";

// Defining  Mutation methods
const Mutation = {
  // Mutation for creating the user
  async addUser(root: any, args: any, ctx: { prisma: Prisma }) {
    return ctx.prisma.createUser({
      name: args.name
    });
  }
};

export { Mutation };
