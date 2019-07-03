import moment from "moment";
import { Prisma } from "../generated/prisma-client";
import { queryDataFiles } from "./serchResults";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

// Defining Query methods
const Query = {
  /**
   * Get the currently logged in user,
   */
  user(root: any, args: {}, ctx: IContext) {
    if (!ctx.user) {
      return null;
    }
    return ctx.prisma.user({
      id: ctx.user.id
    });
  },

  async dataFiles(root: any, args: any, ctx: IContext) {
    const results = await queryDataFiles(args.columns, args.where);
    return results;
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
  },
  async passwordResetTokenStatus(
    root: any,
    { token }: any,
    { prisma }: IContext
  ) {
    const user = await prisma.user({
      passwordResetToken: token
    });
    if (!user) {
      return { status: false, message: "The token is unknown." };
    }

    // Check if token is not expired
    if (
      user.passwordResetTokenExpiry &&
      moment(user.passwordResetTokenExpiry) <= moment(Date.now())
    ) {
      return { status: false, message: "The token has expired." };
    }

    return { status: true };
  }
};

export { Query };
