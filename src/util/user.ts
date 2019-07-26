import moment = require("moment");
import { ssdaAdminPool } from "../db/pool";

export const createUser = async (args: any, hashedPassword: string) => {
  // Query inserting a new user with with the supplied information
  let sql = `
    INSERT INTO User (affiliation, email, familyName, givenName, authProviderId, authProviderUserId) 
    VALUES(?, ?, ?, ?, ?, ?)
  `;

  // Add the new user to the database
  await ssdaAdminPool.query(sql, [
    args.affiliation,
    args.email,
    args.familyName,
    args.givenName,
    1,
    "SSDA"
  ]);

  const { userId } = ((await ssdaAdminPool.query(
    `SELECT MAX(userId) AS userId FROM User`
  )) as any)[0];

  sql = `INSERT INTO SSDAUserAuth (userId, username, password) VALUES (?, ?, ?)`;

  // Add the new user to the database
  await ssdaAdminPool.query(sql, [userId, args.username, hashedPassword]);
};

export interface IUser {
  id: string; // In mysql this is a number
  roles: string[];
}

/**
 * A function that checks if the user has an admin role.
 *
 * @param user user information
 */
export const isAdmin = (user: any) =>
  user && user.roles.some((role: string) => role === "ADMIN");

/**
 * A function for retrieving the user roles
 *
 * @param userId
 */
export const userRoles = async (userId: number) => {
  // Query for retrieving user roles
  const sql = `
    SELECT role
    FROM Role AS r
    JOIN UserRole AS ur ON ur.roleId = r.roleId
    WHERE ur.userId = ?
  `;

  // Querying and returning the user roles
  return ((await ssdaAdminPool.query(sql, [userId])) as any).map(
    (role: any) => role.role
  );
};

export const getUserById = async (userId: number) => {
  // Query for retrieving a user with the supplied id
  const sql = `
    SELECT u.userId AS id, affiliation, email, familyName, givenName, password, username
    FROM User AS u
    JOIN SSDAUserAuth As ua ON ua.userId = u.userId
    WHERE u.userId = ?
  `;

  // Querying the user
  const result: any = await ssdaAdminPool.query(sql, [userId]);

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
  const result: any = await ssdaAdminPool.query(sql, [username]);

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
  const result: any = await ssdaAdminPool.query(sql, [email]);

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
  const result: any = await ssdaAdminPool.query(sql, [passwordResetToken]);

  const user = result.length ? result[0] : null;

  const roles = user && (await userRoles(user.id));

  return user && { ...user, roles };
};

// TODO UPDATE only SSDAUserAuth may update their information
const updateUser = async (userUpdateInfo: any, userId: number) => {
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
