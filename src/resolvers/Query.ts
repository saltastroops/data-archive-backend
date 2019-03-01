import { Prisma } from "../generated/prisma-client";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

// Defining Query methods
const Query = {
  // TODO UPDATE.
  // Query for users
  user(root: any, args: {}, ctx: IContext) {
    console.log(ctx.user);
    if (!ctx.user) {
      throw new Error("You must be logged in to call this query");
    }
    return ctx.prisma.user({
      id: ctx.user.id
    });
  }
};

export { Query };
