import bcrypt from "bcrypt";
import { validate } from "isemail";
import { AuthProviderName } from "../util/authProvider";
import { CalibrationLevel, CalibrationType } from "../util/calibrations";
import {
  createUser,
  getUserByEmail,
  getUserById,
  getUserByUsername,
  isAdmin,
  IUserCreateInput,
  IUserUpdateInput,
  updateUser
} from "../util/user";
import { createDataRequest } from "./dataRequest";
import { requestPasswordReset, resetPassword } from "./resetPassword";

// Defining the context interface
interface IContext {
  user: { id: string | number; authProvider: AuthProviderName }; // TODO user interface
}

// Check whether a password is sufficiently strong.
function checkPasswordStrength(password: string) {
  if (password.length < 7) {
    throw new Error(`The password must be at least 7 characters long.`);
  }
}

// Defining  Mutation methods
const Mutation = {
  /**
   * Request a password reset.
   *
   * The following arguments must be supplied.
   *
   * email:
   *     The email address to which the link for resetting the password shall
   *     be sent. This must be an existing user's email address.
   */
  requestPasswordReset: (
    root: any,
    { email }: { email: string },
    ctx: IContext
  ) => requestPasswordReset(email, "SSDA"),

  /**
   * Reset a user's password.
   *
   * The following arguments must be supplied.
   *
   * password:
   *     The new password.
   * token:
   *     The unique token identifying the user.
   */
  resetPassword: (
    root: any,
    { password, token }: { password: string; token: string },
    ctx: IContext
  ) => resetPassword(token, password),

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
  async signup(root: any, args: any, ctx: IContext) {
    // Create new user
    const userDetails: IUserCreateInput = {
      ...args,
      authProvider: "SSDA"
    };
    await createUser(userDetails);

    // Querying the user
    const newuser: any = await getUserByUsername(args.username);

    return newuser;
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
   *     The user's old password. This argument is required.
   * newPassword:
   *     The user's new password.
   */
  async updateUser(root: any, args: IUserUpdateInput, ctx: IContext) {
    // Check if the user is logged in
    if (!ctx.user) {
      throw new Error("You must be logged in to update user information.");
    }

    // Get the currently logged user
    const currentUser = await getUserById(ctx.user.id);
    if (!currentUser) {
      throw new Error("There exists no user for the id stored in the context.");
    }

    // Check if the password matches that of the currently logged in user
    if (
      currentUser &&
      !(await bcrypt.compare(args.password, currentUser.password))
    ) {
      throw new Error("The old password is wrong.");
    }

    // Check if the user information to update is for the currently logged in
    // user. If it is for a different user, the currently logged in user must
    // be an admin.
    const loggedInUserId = ctx.user.id;
    const updatedUserId = args.id || loggedInUserId;
    if (updatedUserId !== loggedInUserId) {
      if (!isAdmin(currentUser)) {
        throw Error(
          "You do not have permission to update details of another user."
        );
      }
    }

    // Get the current details of the updated user.
    const userToUpdate = await getUserById(updatedUserId);
    if (!userToUpdate) {
      throw new Error(`There exists no user with the ID ${updatedUserId}.`);
    }
    const userUpdateInfo = userToUpdate;

    // If the username is to change
    if (args.username) {
      if (userToUpdate.username !== args.username) {
        // Check if there already exists a user with the submitted username
        const userWithGivenUsername = await getUserByUsername(args.username);

        if (userWithGivenUsername) {
          throw new Error(
            `There already exists a user with the username ${args.username}.`
          );
        }
      }
      userUpdateInfo.username = args.username;
    }

    // If the email is to change
    if (args.email) {
      if (userToUpdate.email !== args.email.toLowerCase()) {
        // Check if the submitted email address is valid
        if (!validate(args.email, { minDomainAtoms: 2 })) {
          throw new Error(`The email address "${args.email}" is invalid.`);
        }

        // Transform the email address to lower case
        args.email = args.email.toLowerCase();

        // Check if there already exists a user with the submitted email address
        const userWithGivenEmail = await getUserByEmail(
          args.email,
          ctx.user.authProvider
        );

        if (userWithGivenEmail) {
          throw new Error(
            `There already exists a user with the email address ${args.email}.`
          );
        }
      }

      userUpdateInfo.email = args.email;
    }

    // If the password is to change
    if (args.newPassword) {
      // Check if the password is secure enough
      checkPasswordStrength(args.newPassword);

      // Hash the password before storing it in the database
      userUpdateInfo.password = await bcrypt.hash(args.newPassword, 10);
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
    await updateUser(userUpdateInfo, userToUpdate.id, ctx.user.authProvider);

    return getUserById(userToUpdate.id);
  },

  /**
   * Create a data request.
   */
  createDataRequest: (
    root: any,
    {
      dataFiles,
      requestedCalibrationLevels,
      requestedCalibrationTypes
    }: {
      dataFiles: [number];
      requestedCalibrationLevels: [string];
      requestedCalibrationTypes: [string];
    },
    { user }: IContext
  ) =>
    createDataRequest(
      dataFiles,
      new Set(requestedCalibrationLevels as CalibrationLevel[]),
      new Set(requestedCalibrationTypes as CalibrationType[]),
      user
    )
};

export { Mutation };
