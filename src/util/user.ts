import moment = require("moment");
import { ssdaAdminPool } from "../db/pool";
import bcrypt from "bcrypt";
import { validate } from "isemail";

type AuthProvider = "SDB" | "SSDA";

interface UserCreateInput {
  affiliation: string;
  authProvider: AuthProvider;
  authProviderUserId?: string;
  email: string;
  familyName: string;
  givenName: string;
  password?: string;
  username?: string;
}

/**
 * Create a new user with the given details.
 *
 * The given password must not be encrypted. It must be sufficiently secure.
 *
 * An error is raised if a user with the given email address exists already.
 */
export const createUser = async (args: UserCreateInput) => {
  const {
    affiliation,
    authProvider,
    authProviderUserId,
    email,
    familyName,
    givenName,
    password,
    username
  } = args;

  // Check if the submitted email address is valid
  if (!validate(args.email, { minDomainAtoms: 2 })) {
    throw new Error(`The email address "${args.email}" is invalid.`);
  }

  // Transform the email address to lower case.
  const lowerCaseEmail = args.email.toLowerCase();

  // Check if there already exists a user with the submitted email address
  const userWithGivenEmail = await getUserByEmail(args.email);
  if (userWithGivenEmail) {
    throw new Error(
      `There already exists a user with the email address ${args.email}.`
    );
  }

  // The auth provider SSDA requires a password, and it must be secure; and it
  // also required a valid username
  if (authProvider === "SSDA") {
    if (!password) {
      throw new Error("The password is missing.");
    }

    checkPasswordStrength(password);

    // Check that the submitted username is not empty
    if (!args.username) {
      throw new Error(`The username must not be empty.`);
    }

    // Check that the submitted username does not contain upper case characters
    if (args.username !== args.username.toLowerCase()) {
      throw new Error(
        `The username ${args.username} contains upper case characters.`
      );
    }

    // Check if there already exists a user with the submitted username
    const userWithGivenUsername = await getUserByUsername(args.username);

    if (userWithGivenUsername) {
      throw new Error(
        `There already exists a user with the username ${args.username}.`
      );
    }
  }

  // An auth provider other than SSDA requires the auth provider user id
  if (authProvider !== "SSDA" && !authProviderUserId) {
    throw new Error("The user id for the authentication provider is missing.");
  }

  // Insert the user with the given details into the database
  const userInsertSQL = `
      INSERT INTO User (affiliation, email, familyName, givenName, authProviderId, authProviderUserId)
      VALUES (?, ?, ?, ?, ?, ?)
  `;
  await ssdaAdminPool.query(userInsertSQL, [
    affiliation,
    lowerCaseEmail,
    familyName,
    givenName,
    authProvider !== "SSDA" ? authProvider : null,
    authProvider !== "SSDA" ? authProviderUserId : null
  ]);

  // If SSDA is used as the auth provider, we have to store the user credentials
  if (authProvider === "SSDA") {
    // As the email is unique we can identify the new user by their email
    const userIdSQL = `SELECT userId FROM User WHERE email=?`;
    const { userId } = ((await ssdaAdminPool.query(userIdSQL)) as any)[0];

    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(args.password, 10);

    // Store the user credentials
    const authInsertSQL = `INSERT INTO SSDAUserAuth (userId, username, password) VALUES (?, ?, ?)`;

    // Add the new user to the database
    await ssdaAdminPool.query(userInsertSQL, [
      userId,
      args.username,
      hashedPassword
    ]);
  }
};

export interface IUser {
  id: string; // In mysql this is a number
  roles: string[];
}

/**
 * A function for retrieving the user roles
 *
 * @param userId
 */
export const userRoles = async (userId: string | number) => {
  // Query for retrieving user roles
  const sql = `
    SELECT role
    FROM Role AS r
    JOIN UserRole AS ur ON ur.roleId = r.roleId
    WHERE ur.userId = ?
  `;

  // Querying and returning the user roles
  return ((await ssdaAdminPool.query(sql, [userId])) as any)[0].map(
    (role: any) => role.role
  );
};

export const getUserById = async (userId: string | number) => {
  // Query for retrieving a user with the supplied id
  const sql = `
    SELECT u.userId AS id, affiliation, email, familyName, givenName, password, username
    FROM User AS u
    JOIN SSDAUserAuth As ua ON ua.userId = u.userId
    WHERE u.userId = ?
  `;

  // Querying the user
  const result: any = (await ssdaAdminPool.query(sql, [userId]))[0];

  const user: any = result.length ? result[0] : null;

  const roles = user && (await userRoles(user.id));

  return user && { ...user, roles };
};

export const getUserByUsername = async (username: string) => {
  // Query for retrieving a user with the supplied username
  const sql = `
    SELECT u.userId AS id, affiliation, email, familyName, givenName, password, username
    FROM User AS u
    JOIN SSDAUserAuth As ua ON ua.userId = u.userId
    WHERE ua.username = ?
  `;

  // Querying the user
  const result: any = (await ssdaAdminPool.query(sql, [username]))[0];

  const user = result.length ? result[0] : null;

  const roles = user && (await userRoles(user.id));

  return user && { ...user, roles };
};

export const getUserByEmail = async (email: string) => {
  // Query for retrieving a user with the supplied email
  const sql = `
    SELECT u.userId AS id, affiliation, email, familyName, givenName, password, username
    FROM User AS u
    JOIN SSDAUserAuth As ua ON ua.userId = u.userId
    WHERE u.email = ?
  `;

  // Querying the user
  const result: any = (await ssdaAdminPool.query(sql, [email]))[0];

  const user = result.length ? result[0] : null;

  const roles = user && (await userRoles(user.id));

  return user && { ...user, roles };
};

export const getUserByToken = async (passwordResetToken: string) => {
  // Query for retrieving a user with the supplied email
  const sql = `
    SELECT u.userId AS id, affiliation, email, familyName, givenName, 
    password, username, passwordResetToken, passwordResetTokenExpiry
    FROM User AS u
    JOIN SSDAUserAuth As ua ON ua.userId = u.userId
    WHERE ua.passwordResetToken = ?
  `;

  // Querying the user
  const result: any = (await ssdaAdminPool.query(sql, [passwordResetToken]))[0];

  const user = result.length ? result[0] : null;

  const roles = user && (await userRoles(user.id));

  return user && { ...user, roles };
};

// TODO UPDATE only SSDAUserAuth may update their information
export const updateUser = async (userUpdateInfo: any, userId: number) => {
  // Query for updating user unformation.
  const sql = `
    UPDATE User SET affiliation=?, email=?, familyName=?, givenName=?, password=?, username=?
    WHERE userId=?
  `;

  // Update the user details
  await ssdaAdminPool.query(sql, [
    userUpdateInfo.affiliation,
    userUpdateInfo.email,
    userUpdateInfo.familyName,
    userUpdateInfo.givenName,
    userUpdateInfo.password,
    userUpdateInfo.username,
    userId
  ]);
};

// TODO UPDATE only SSDAUserAuth may request taken to reset their password
export const setUserToken = async (
  passwordResetToken: string,
  passwordResetTokenExpiry: Date,
  email: string
) => {
  // Query for setting user password reset token.
  const sql = `
    UPDATE User SET passwordResetToken=?, passwordResetTokenExpiry=?
    WHERE email=?
  `;

  // Update the user details
  await ssdaAdminPool.query(sql, [
    passwordResetToken,
    passwordResetTokenExpiry,
    email
  ]);

  return true;
};

// TODO UPDATE only SSDAUserAuth may change their passwords
export const changeUserPassword = async (
  newPassword: string,
  passwordResetToken: string
) => {
  // Query for setting user password reset token.
  const sql = `
    UPDATE User SET password=?, passwordResetToken=?, passwordResetTokenExpiry=?
    WHERE passwordResetToken=?
  `;

  // Update the user details
  await ssdaAdminPool.query(sql, [
    newPassword,
    "",
    moment(Date.now()).toDate(),
    passwordResetToken
  ]);

  return true;
};

/**
 * A function that checks if the user has an admin role.
 *
 * @param user user information
 */
export const isAdmin = (user: IUser | undefined) =>
  user && user.roles.some((role: string) => role === "ADMIN");

/**
 * A function that checks if the user owns the data file
 *
 * @param user  user information
 * @param fileId data file id
 */
export const ownsDataFile = (user: IUser | undefined, fileId: string) => false;

/**
 * A function that checks if the user owns the data request
 *
 * @param dataReqeust the data reuest
 * @param user user information
 */
export const ownsDataRequest = (dataReqeust: any, user: IUser) =>
  dataReqeust.user.id === user.id;

// Check whether a password is sufficiently strong.
function checkPasswordStrength(password: string) {
  if (password.length < 7) {
    throw new Error(`The password must be at least 7 characters long.`);
  }
}
