import { Prisma } from "../generated/prisma-client";

// Defining Query methods
const Query = {
  // Query for users
  users(root: any, args: any, ctx: { prisma: Prisma }) {
    const limit = args.limit ? Math.min(args.limit, 5) : 5;
    return ctx.prisma.users({
      first: limit,
      orderBy: "createdAt_DESC"
    });
  }
};

export { Query };
