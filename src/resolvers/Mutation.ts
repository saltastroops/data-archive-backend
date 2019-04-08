import bcrypt from "bcrypt";
import { validate } from "isemail";
import {
  Prisma,
  User,
  UserCreateInput,
  UserUpdateInput
} from "../generated/prisma-client";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

// Defining the update user interface
interface IUserUpdateInput extends UserUpdateInput {
  id?: string;
  newPassword?: string;
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
    const newUser = await ctx.prisma.createUser({
      affiliation: args.affiliation,
      email: args.email,
      familyName: args.familyName,
      givenName: args.givenName,
      password: hashedPassword,
      username: args.username
    });

    return newUser;
  },

  /**
   * Update the user information.
   *
   * The following arguments may be supplied. Apart from the password argument
   * all arguments are optional.
   *
   * id:
   *     The unique id of the user to update his or her information.
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
   * password:
   *     The user old password (Must be supplied).
   * newPassword:
   *     The user new pasword.
   */
  async updateUser(root: any, args: IUserUpdateInput, ctx: IContext) {
    // Check if the user is logged in
    if (!ctx.user) {
      throw new Error("You must be logged in to update user information");
    }

    // Get the currently logged user
    const currentUser = await ctx.prisma.user({
      id: ctx.user.id
    });

    // Check if the password matches that of the currently logged in user
    if (!(await bcrypt.compare(args.password, currentUser.password))) {
      throw new Error("Please make sure you provide a correct password.");
    }

    const userUpdateInfo: UserUpdateInput = {};
    let userToUpdate: User;

    // Check if the user information to update is for the currently logged in
    // user. If it is for a different user, the currently logged in user must
    // be an admin.
    if (args.id) {
      const isAdmin = currentUser.roles.some(role => role === "ADMIN");

      if (!isAdmin) {
        throw Error(
          "You do not have permission to update other user information"
        );
      }

      userToUpdate = await ctx.prisma.user({
        id: args.id
      });
    } else {
      userToUpdate = await ctx.prisma.user({
        id: ctx.user.id
      });
    }

    // If the username is to change
    if (args.username && userToUpdate.username !== args.username) {
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

      userUpdateInfo.username = args.username;
    }

    // If the email is to change
    if (args.email && userToUpdate.email !== args.email.toLowerCase()) {
      // Check if the submitted email address is valid
      if (!validate(args.email, { minDomainAtoms: 2 })) {
        throw new Error(`The email address "${args.email}" is invalid.`);
      }

      // Transform the email address to lower case
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

      userUpdateInfo.email = args.email;
    }

    // If the password is to change
    if (args.newPassword) {
      // Check if the password is secure enough
      if (!(args.newPassword.length > 6)) {
        throw new Error(`The password must be at least 7 characters long.`);
      }

      // Hash the password before storing it in the database
      const hashedNewPassword = await bcrypt.hash(args.newPassword, 10);

      userUpdateInfo.password = hashedNewPassword;
    }

    // If the given name is to change
    if (args.givenName) {
      userUpdateInfo.givenName = args.givenName;
    }

    // If the family name is change
    if (args.familyName) {
      userUpdateInfo.familyName = args.familyName;
    }

    // If the affiliation is to change
    if (args.affiliation) {
      userUpdateInfo.affiliation = args.affiliation;
    }

    // Update the user details
    return ctx.prisma.updateUser({
      data: {
        ...userUpdateInfo
      },
      where: {
        id: userToUpdate.id
      }
    });
  }
};

export { Mutation };
