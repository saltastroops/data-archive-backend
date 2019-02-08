import { Prisma } from "../generated/prisma-client";

// Defining Query methods
const Query = {
  // Query for users
  users(root: any, args: { limit: number }, ctx: { prisma: Prisma }) {
    const limit = args.limit ? Math.min(args.limit, 10) : 10;
    return ctx.prisma.users({
      first: limit,
      orderBy: "createdAt_DESC"
    });
  },

  // To be well done when Authentication approved.
  // Query for users
  user(root: any, args: {}, ctx: { prisma: Prisma; user: { id: string } }) {
    if (!ctx.user) {
      throw new Error("You must be logged in to call this query");
    }
    return ctx.prisma.user({
      id: ctx.user.id
    });
  }
};

export { Query };
