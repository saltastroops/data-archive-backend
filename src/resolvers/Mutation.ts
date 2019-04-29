import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { validate } from "isemail";
import moment from "moment";
import { promisify } from "util";
import { prisma, Prisma, UserCreateInput } from "../generated/prisma-client";
import { transporter } from "../util";
import { createDataRequest } from "./DataRequest";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

// Defining  Mutation methods
const Mutation = {
  /**
   * Create a data request.
   * A user need to be logged in to create a dat request
   * @args
   *      parts:
   *          An array of data request part
   *          It can be associate with observation/ it only have a part of the observation
   *      part.ids:
   *          An array of Data files ids
   *          This files id's need to exist within the prisma database.
   *          i.e you can only request data files that exist anything else will fail
   * @return
   *      New data request that has just been created or an error
   */
  createDataRequest: (root: any, args: any, ctx: IContext) =>
    createDataRequest(args, ctx),

  async requestPasswordReset(root: any, { email }: any, ctx: any) {
    // Find a user with given email address
    const user = await prisma.user({
      email
    });
    if (!user) {
      throw new Error(`No user with email ${email}`);
    }

    // Create a reset token
    const randomBytesPromisified = promisify(randomBytes);
    const passwordResetToken = (await randomBytesPromisified(30)).toString(
      "hex"
    );

    // Create a reset token expiry
    const passwordResetTokenExpiry = moment(Date.now())
      .add(2, "hours")
      .toDate();

    // Update the user in prisma with token and expiry date
    const updatedUser = await prisma.updateUser({
      data: {
        passwordResetToken,
        passwordResetTokenExpiry
      },
      where: { email }
    });

    // in case token is not unique which is very rare or prisma fail to update user fro some reasons
    if (!updatedUser) {
      throw new Error(`Fail to generate a reset token, request again`);
    }
    try {
      const url = `${
        process.env.HOST
      }/auth/reset-password/${passwordResetToken}`;
      await transporter.sendMail({
        html: `Please to reset your password click: <a href="${url}">${url}</a> <br/>`,
        subject: "Reset password SAAO/SALT Data archive",
        to: user.email
      });
    } catch (e) {
      throw new Error(`Fail to send reset token to email: ${email}`);
    }
    return user;
  },

  async resetPassword(
    root: any,
    { token, password }: any,
    { prisma }: IContext
  ) {
    if (!(password.length > 6)) {
      throw new Error(`The password must be at least 7 characters long.`);
    }

    // get the user with the token
    const user = await prisma.user({ passwordResetToken: token });
    if (!user) {
      throw new Error(`Fail to reset password of unknown token`);
    }
    if (
      user.passwordResetTokenExpiry &&
      moment(user.passwordResetTokenExpiry) <= moment(Date.now())
    ) {
      throw new Error("Token is expired");
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // updating the user with the new password and expire the token
    await prisma.updateUser({
      data: {
        password: hashedPassword,
        passwordResetTokenExpiry: moment(Date.now()).toDate()
      },
      where: {
        passwordResetToken: token
      }
    });
    return user;
  },

  /**
   * Register a new user.
   *
   * The following arguments must be supplied.
   *
   * affiliation:
   *     The affiliation of the user, such as a university or an institute.
   * email:
   *     Email address. This will be stored in lower case.
   * familyName:
   *     The family name (surname).
   * givenName:
   *     The given name (first name).
   * password:
   *     The password, which must have at least 7 characters.
   * username:
   *     The username, which must not contain upper case letters.
   */
  async signup(root: any, args: UserCreateInput, ctx: IContext) {
    // Check if the submitted username is not empty
    if (!args.username) {
      throw new Error(`The username cannot be empty.`);
    }

    // Check if the submitted username contains upper case characters
    if (args.username !== args.username.toLowerCase()) {
      throw new Error(
        `The username ${args.username} contains upper case characters.`
      );
    }

    // Check if there already exists a user with the submitted username
    const usersWithGivenUsername = await ctx.prisma.users({
      where: { username: args.username }
    });
    if (usersWithGivenUsername.length) {
      throw new Error(
        `There already exists a user with the username ${args.username}.`
      );
    }

    // Check if the submitted email address is valid
    if (!validate(args.email, { minDomainAtoms: 2 })) {
      throw new Error(`The email address "${args.email}" is invalid.`);
    }

    // Transform the email address to lower case.
    args.email = args.email.toLowerCase();

    // Check if there already exists a user with the submitted email address
    const usersWithGivenEmail = await ctx.prisma.users({
      where: { email: args.email }
    });
    if (usersWithGivenEmail.length) {
      throw new Error(
        `There already exists a user with the email address ${args.email}.`
      );
    }

    // Check if the password is secure enough
    if (!(args.password.length > 6)) {
      throw new Error(`The password must be at least 7 characters long.`);
    }

    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(args.password, 10);

    // Add the new user to the database
    return ctx.prisma.createUser({
      affiliation: args.affiliation,
      email: args.email,
      familyName: args.familyName,
      givenName: args.givenName,
      password: hashedPassword,
      username: args.username
    });
  }
};

export { Mutation };
