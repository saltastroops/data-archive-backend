import bcrypt from "bcrypt";
import { Prisma, UserCreateInput } from "../generated/prisma-client";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

// Defining  Mutation methods
const Mutation = {
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
   * username:
   *     The username, which must not contain upper case letters.
   */
  async signup(root: any, args: UserCreateInput, ctx: IContext) {
    // Check if submitted username does not contain uppercased character(s).
    if (args.username !== args.username.toLowerCase()) {
      return new Error(
        `The username ${
          args.username
        } is not lowercase, make sure to provide a lowercase username.`
      ) as any;
    }

    // Check if there already exists a user with the submitted username.
    if (await ctx.prisma.user({ username: args.username })) {
      return new Error(
        `There already exists a user with the username ${args.username}.`
      );
    }

    // Transform the email address to lower case.
    args.email = args.email.toLowerCase();

    // Check if there already exists a user with the submitted email address.
    if (await ctx.prisma.user({ email: args.email })) {
      return new Error(
        `There already exists a user with the email address ${args.email}.`
      );
    }

    // Check if the password is secure enough.
    if (!(args.password.length > 6)) {
      return new Error(
        `The password should be no less than 6 characters long.`
      );
    }

    // Hash the password before storing it in the database.
    const hashedPassword = await bcrypt.hash(args.password, 10);

    // Add the new user to the database.
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
