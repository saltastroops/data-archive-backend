import bcrypt from "bcrypt";
import { validate } from "isemail";
import { Prisma, UserCreateInput } from "../generated/prisma-client";
import { requestReset, resetPassword } from "./resetPassword";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

// Defining  Mutation methods
const Mutation = {
  requestPasswordReset: (root: any, { email }: any, ctx: any) =>
    requestReset(email),

  resetPassword: (root: any, { token, password }: any, ctx: IContext) =>
    resetPassword(token, password),

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
