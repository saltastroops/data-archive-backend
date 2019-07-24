import moment = require("moment");
import { ssdaAdminPool } from "../db/pool";

const createUser = async (args: any, hashedPassword: string) => {
  // Query inserting a new user with with the supplied information
  let sql = `
    INSERT INTO User (affiliation, email, familyName, givenName) 
    VALUES(?, ?, ?, ?)
  `;

  // Add the new user to the database
  await ssdaAdminPool.query(sql, [
    args.affiliation,
    args.email,
    args.familyName,
    args.givenName
  ]);

  const { userId } = ((await ssdaAdminPool.query(
    `SELECT MAX(userId) AS userId FROM User`
  )) as any)[0];

  sql = `INSERT INTO UserAdmin (userId, username, password) VALUES (?, ?, ?)`;

  // Add the new user to the database
  await ssdaAdminPool.query(sql, [userId, args.username, hashedPassword]);
};

/**
 * A function that checks if the user has an admin role.
 *
 * @param user user information
 */
const isAdmin = (user: any) =>
  user && user.roles.some((role: string) => role === "ADMIN");

/**
 * A function for retrieving the user roles
 *
 * @param userId
 */
const userRoles = async (userId: number) => {
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

const getUserById = async (userId: number) => {
  // Query for retrieving a user with the supplied id
  const sql = `
    SELECT u.userId AS id, affiliation, email, familyName, givenName, password, username
    FROM UserAdmin AS ua
    JOIN User As u ON u.userId = ua.userId
    WHERE u.userId = ?
  `;

  // Querying the user
  const result: any = await ssdaAdminPool.query(sql, [userId]);

  const user: any = result.length ? result[0] : null;

  const roles = user && (await userRoles(user.id));

  return user && { ...user, roles };
};

const getUserByUsername = async (username: string) => {
  // Query for retrieving a user with the supplied username
  const sql = `
    SELECT ua.userId AS id, affiliation, email, familyName, givenName, password, username
    FROM UserAdmin AS ua
    JOIN User As u ON u.userId = ua.userId
    WHERE ua.username = ?
  `;

  // Querying the user
  const result: any = await ssdaAdminPool.query(sql, [username]);

  const user = result.length ? result[0] : null;

  const roles = user && (await userRoles(user.id));

  return user && { ...user, roles };
};

const getUserByEmail = async (email: string) => {
  // Query for retrieving a user with the supplied email
  const sql = `
    SELECT ua.userId AS id, affiliation, email, familyName, givenName, password, username
    FROM UserAdmin AS ua
    JOIN User As u ON u.userId = ua.userId
    WHERE u.email = ?
  `;

  // Querying the user
  const result: any = await ssdaAdminPool.query(sql, [email]);

  const user = result.length ? result[0] : null;

  const roles = user && (await userRoles(user.id));

  return user && { ...user, roles };
};

const getUserByToken = async (passwordResetToken: string) => {
  // Query for retrieving a user with the supplied email
  const sql = `
    SELECT ua.userId AS id, affiliation, email, familyName, givenName, 
    password, username, passwordResetToken, passwordResetTokenExpiry
    FROM UserAdmin AS ua
    JOIN User As u ON u.userId = ua.userId
    WHERE ua.passwordResetToken = ?
  `;

  // Querying the user
  const result: any = await ssdaAdminPool.query(sql, [passwordResetToken]);

  const user = result.length ? result[0] : null;

  const roles = user && (await userRoles(user.id));

  return user && { ...user, roles };
};

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

const setUserToken = async (
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

const changeUserPassword = async (
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

export {
  changeUserPassword,
  createUser,
  isAdmin,
  getUserByEmail,
  getUserById,
  getUserByToken,
  getUserByUsername,
  setUserToken,
  updateUser,
  userRoles
};
