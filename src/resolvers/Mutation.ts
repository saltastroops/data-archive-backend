import bcrypt from "bcrypt";
import { validate } from "isemail";
import { Prisma, UserCreateInput } from "../generated/prisma-client";
// import { createDataRequest } from "./dataRequest";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

// Defining  Mutation methods
const Mutation = {
  async createDataRequest(root: any, { data }: any, { prisma }: IContext) {
    // if (!user) {
    //   throw new Error("You must be logged in to call this query");
    // }
    const user = await prisma.user({ id: "cju8eq9yxxaj90b26br1gwy2y" }); // TODO use context user
    const madeAt = new Date();

    // Creating a data request
    const dr = await prisma.createDataRequest({
      madeAt,
      user: { connect: { id: user.id } }
    });

    // Creating parts of this data request
    data.parts.forEach(async (part: any) => {
      const drp = await prisma.createDataRequestPart({});
      await prisma.updateDataRequest({
        data: {
          parts: {
            connect: { id: drp.id }
          }
        },
        where: {
          id: dr.id
        }
      });
      // connecting Data files to this DataRequest Part
      await part.ids.forEach(async (file: string) => {
        await prisma.updateDataRequestPart({
          data: {
            dataFiles: {
              connect: { id: file }
            }
          },
          where: {
            id: drp.id
          }
        });
      });
    });
    return dr;
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
