import bcrypt from "bcrypt";
import { Prisma } from "../generated/prisma-client";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}
// Defining ht args interface
interface IArgs {
  familyName: string;
  givenName: string;
  username: string;
  email: string;
  affiliation: string;
  password: string;
}

// Defining  Mutation methods
const Mutation = {
  async signup(root: any, args: IArgs, ctx: IContext) {
    // Transform username address to lowercase.
    args.username = args.username.toLowerCase();

    // Transform email address to lowercase.
    args.email = args.email.toLowerCase();

    // Check if the submitted username for registering already exists.
    if (await ctx.prisma.user({ username: args.username })) {
      throw new Error("username already exists.");
    }

    // Check if the submitted email for registering already exists.
    if (await ctx.prisma.user({ email: args.email })) {
      throw new Error("email address already exists.");
    }

    // Hash the password before stored in the database.
    const password = await bcrypt.hash(args.password, 10);

    // Adding the new entry in database.
    const user = await ctx.prisma.createUser({
      affiliation: args.affiliation,
      email: args.email,
      familyName: args.familyName,
      givenName: args.givenName,
      password,
      username: args.username
    });

    return user;
  }
};

export { Mutation };
