import moment from "moment";
import { prisma, Prisma } from "../generated/prisma-client";

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
      throw new Error("You must be logged in to call this query");
    }
    return ctx.prisma.user({
      id: ctx.user.id
    });
  },
  async verifyPasswordResetToken(
    root: any,
    { token }: any,
    { prisma }: IContext
  ) {
    const user = await prisma.user({
      passwordResetToken: token
    });
    if (!user) {
      return { success: false, message: "Token is outdated or unknown." };
    }

    // Check if token is not expired
    if (
      user.passwordResetTokenExpiry &&
      moment(user.passwordResetTokenExpiry) <= moment(Date.now())
    ) {
      return { success: false, message: "Token Expired." };
    }

    return { success: true };
  }
};

export { Query };
