import { Prisma } from "../generated/prisma-client";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

// Defining Query methods
const Query = {
  // TODO UPDATE.
  // Query for the current user
  user(root: any, args: {}, ctx: IContext) {
    if (!ctx.user) {
      return null;
    }
    return ctx.prisma.user({
      id: ctx.user.id
    });
  },

  // Query for the current user's data requests
  // TODO UPDATE INCLUDE MORE INFORMATION IN THE FRAGMENT AS REQUIRED
  async dataRequests(
    root: any,
    args: { limit: number; startIndex: number },
    ctx: IContext
  ) {
    if (!ctx.user) {
      throw new Error("You must be logged in");
    }

    const limit = args.limit ? Math.min(args.limit, 200) : 200;

    return ctx.prisma.dataRequests({
      first: limit,
      orderBy: "madeAt_DESC",
      skip: args.startIndex
    }).$fragment(`{
      id
      madeAt
      uri
      parts {
        id
        status
        uri
        dataFiles {
          id
          name
          observation {
            name
          }
        }
      }
    }`);
  }
};

export { Query };
