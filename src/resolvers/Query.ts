import { Prisma } from "../generated/prisma-client";
import { userLoggedin } from "../util";

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
    if (!ctx.user) {
      throw new Error("You must be logged in to call this query");
    }
    return ctx.prisma.user({
      id: ctx.user.id
    });
  },
  // TODO Make sure that the user is defined / authenticated
  dataRequestById(
    root: any,
    { dataRequestId }: any,
    { prisma, user }: IContext
  ) {
    userLoggedin(user);
    return prisma.dataRequest({ id: dataRequestId });
  },
  // TODO Make sure that the user is defined / authenticated
  dataRequestsForUser(root: any, { userId }: any, { prisma, user }: IContext) {
    userLoggedin(user);
    return prisma.dataRequests({ where: { user: { id: userId } } });
  }
};

export { Query };
