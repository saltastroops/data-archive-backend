import moment = require("moment");
import { ssdaAdminPool, ssdaPool } from "../db/pool";
import bcrypt from "bcrypt";
import { validate } from "isemail";
import { v4 as uuid } from "uuid";
import authProvider, { AuthProviderName } from "./authProvider";

export interface AuthProviderUser {
  affiliation: string;
  authProvider: AuthProviderName;
  authProviderUserId: string;
  email: string;
  familyName: string;
  givenName: string;
  password: string;
  username: string;
}

export type User = AuthProviderUser & {
  id: string;
  passwordResetToken: string;
  passwordResetTokenExpiry: Date;
  roles: Set<Role>;
};

export interface UserCreateInput {
  affiliation: string;
  authProvider: AuthProviderName;
  authProviderUserId?: string;
  email: string;
  familyName: string;
  givenName: string;
  password?: string;
  username?: string;
}

type Role = "ADMIN";

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
  const userWithGivenEmail = await getUserByEmail(
    args.email,
    args.authProvider
  );
  if (userWithGivenEmail) {
    throw new Error(
      `There already exists a user with the email address ${
        args.email
      } for this authentication provider.`
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

  // Get the id of the auth provider
  const authProviderIdSQL = `
      SELECT authProviderId FROM AuthProvider WHERE authProvider=?
      `;
  const result: any = await ssdaAdminPool.query(authProviderIdSQL, [
    authProvider
  ]);
  if (result[0].length === 0) {
    throw new Error(`Unknown authentication provider: ${authProvider}`);
  }
  const authProviderId = result[0][0].authProviderId;

  // Insert the user with the given details into the database
  const userInsertSQL = `
      INSERT INTO User (affiliation, email, familyName, givenName, authProviderId, authProviderUserId)
      VALUES (?, ?, ?, ?, ?, ?)
  `;
  const connection = await ssdaAdminPool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(userInsertSQL, [
      affiliation,
      lowerCaseEmail,
      familyName,
      givenName,
      authProviderId,
      authProvider !== "SSDA" ? authProviderUserId : uuid()
    ]);

    // If SSDA is used as the auth provider, we have to store the user credentials
    if (authProvider === "SSDA") {
      // As the email is unique we can identify the new user by their email
      const userIdSQL = `SELECT userId
                         FROM User
                         WHERE email = ?`;
      const { userId } = ((await connection.query(userIdSQL, [
        email
      ])) as any)[0][0];

      // Hash the password before storing it in the database
      const hashedPassword = await bcrypt.hash(args.password, 10);

      // Store the user credentials
      const authInsertSQL = `INSERT INTO SSDAUserAuth (userId, username, password)
                             VALUES (?, ?, ?)`;

      // Add the new user to the database
      await connection.query(authInsertSQL, [userId, username, hashedPassword]);
    }

    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
};

/**
 * A function for retrieving the user roles
 */
export const userRoles = async (
  user: User | null | undefined
): Promise<Set<Role>> => {
  // Gracefuylly handle the case of a missing user id
  if (!user) {
    return new Set<Role>();
  }

  // Query for retrieving user roles
  const sql = `
    SELECT role
    FROM Role AS r
    JOIN UserRole AS ur ON ur.roleId = r.roleId
    WHERE ur.userId = ?
  `;

  // Querying and returning the user roles
  const roles = ((await ssdaAdminPool.query(sql, [user.id])) as any)[0].map(
    (row: any) => row.role
  );

  return new Set<Role>(roles);
};

export const getUserById = async (
  userId: string | number
): Promise<User | null> => {
  // Query for retrieving a user with the supplied id
  const sql = `
    SELECT u.userId AS id, affiliation, email, familyName, givenName, password, username, authProvider, authProviderUserId
    FROM User AS u
    JOIN AuthProvider AS ap ON u.authProviderId = ap.authProviderId
    LEFT JOIN SSDAUserAuth As ua ON ua.userId = u.userId
    WHERE u.userId = ?
  `;

  // Querying the user
  const result: any = await ssdaAdminPool.query(sql, [userId]);

  return userFromResult(result);
};

export const getUserByUsername = async (
  username: string
): Promise<User | null> => {
  // Query for retrieving a user with the supplied username
  const sql = `
    SELECT u.userId AS id, affiliation, email, familyName, givenName, password, username, authProvider, authProviderUserId
    FROM User AS u
    JOIN AuthProvider AS ap ON u.authProviderId = ap.authProviderId
    LEFT JOIN SSDAUserAuth As ua ON ua.userId = u.userId
    WHERE ua.username = ?
  `;

  // Querying the user
  const result: any = await ssdaAdminPool.query(sql, [username]);

  return userFromResult(result);
};

export const getUserByEmail = async (
  email: string,
  authProvider: AuthProviderName
): Promise<User | null> => {
  // Query for retrieving a user with the supplied email
  const sql = `
    SELECT u.userId AS id, affiliation, email, familyName, givenName, password, username, authProvider, authProviderUserId
    JOIN AuthProvider AS ap ON u.authProviderId = ap.authProviderId
    FROM User AS u
    LEFT JOIN SSDAUserAuth AS ua ON ua.userId = u.userId
    JOIN AuthProvider AS ap USING (authProviderId)
    WHERE u.email = ? AND ap.authProvider = ?
  `;

  // Querying the user
  const result: any = await ssdaAdminPool.query(sql, [email, authProvider]);

  return userFromResult(result);
};

export const getUserByAuthProviderDetails = async (
  authProviderName: AuthProviderName,
  authProviderUserId: string
): Promise<User | null> => {
  // Query for retrieving a user with the supplied email
  const sql = `
    SELECT u.userId AS id, affiliation, email, familyName, givenName, 
    password, username, passwordResetToken, passwordResetTokenExpiry, authProvider, authProviderUserId
    FROM User AS u
    JOIN AuthProvider AS ap ON u.authProviderId = ap.authProviderId
    LEFT JOIN SSDAUserAuth As ua ON ua.userId = u.userId
    WHERE ap.authProvider = ? AND u.authProviderUserId = ?
  `;

  // Querying the user
  const result: any = await ssdaAdminPool.query(sql, [
    authProviderName,
    authProviderUserId
  ]);

  return userFromResult(result);
};

export const getUserByToken = async (
  passwordResetToken: string
): Promise<User | null> => {
  // Query for retrieving a user with the supplied email
  const sql = `
    SELECT u.userId AS id, affiliation, email, familyName, givenName, 
    password, username, passwordResetToken, passwordResetTokenExpiry, authProvider, authProviderUserId
    FROM User AS u
    JOIN AuthProvider AS ap ON u.authProviderId = ap.authProviderId
    LEFT JOIN SSDAUserAuth As ua ON ua.userId = u.userId
    WHERE ua.passwordResetToken = ?
  `;

  // Querying the user
  const result: any = await ssdaAdminPool.query(sql, [passwordResetToken]);

  return userFromResult(result);
};

const userFromResult = async (result: any): Promise<User | null> => {
  if (result[0].length === 0) {
    return null;
  }
  const user: any = result[0][0];

  const roles = await userRoles(user);

  return {
    affiliation: user.affiliation,
    authProvider: user.authProvider,
    authProviderUserId: user.authProviderUserId,
    email: user.email,
    familyName: user.familyName,
    givenName: user.givenName,
    id: user.id,
    password: user.password || "",
    passwordResetToken: user.passwordResetToken,
    passwordResetTokenExpiry: user.passwordResetTokenExpiry,
    roles,
    username: user.username || ""
  };
};

// TODO UPDATE only SSDAUserAuth may update their information
export const updateUser = async (
  userUpdateInfo: any,
  userId: string | number
) => {
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
export const isAdmin = (user: User | undefined) =>
  user && user.roles.has("ADMIN");

/**
 * Check whether a user may view a data file.
 *
 * @param user  user information
 * @param fileId data file id
 */
export const mayViewDataFile = async (
  user: User | undefined,
  fileId: string
): Promise<boolean> => {
  return mayViewAllOfDataFiles(user, [fileId]);
};

/**
 * Check whether the user may view a list of data files.
 *
 * Parameters
 * ----------
 * fileIds: Array<string>
 *     List of file ids to check
 *
 * Return
 * ------
 * Whether the user may view all the files in the list.
 */
export const mayViewAllOfDataFiles = async (
  user: User | undefined,
  fileIds: string[]
) => {
  // Admins may view everything
  if (isAdmin(user)) {
    return true;
  }

  // Remove duplicate ids
  const ids = Array.from(new Set(fileIds));

  // Get all the release dates
  const sql = `
    SELECT dataFileId, publicFrom
           FROM DataFile JOIN Observation USING (observationId)
    WHERE dataFileId IN (?)
  `;
  const results: any = await ssdaPool.query(sql, [ids]);

  // Collect the release dates
  const releaseDates = new Map<string, number>();
  results[0].forEach((row: any) =>
    releaseDates.set(row.dataFileId, row.publicFrom)
  );

  // Filter out the files that are public
  const now = Date.now();
  const proprietaryIds = ids.filter(
    id => !(releaseDates.has(id) && (releaseDates.get(id) as number) <= now)
  );

  // Check which of the remaining files the user owns
  const ownedIds = await ownsOutOfDataFiles(user, proprietaryIds);

  // Are all the remaining files owned by the user?
  return proprietaryIds.every(id => ownedIds.has(id));
};

/**
 * A function that checks which files a user owns out of a list of data files.
 *
 * The function returns an array of those given files that are owned by the
 * user.
 *
 * @param user  user information
 * @param fileIds data file ids
 */
export const ownsOutOfDataFiles = async (
  user: User | undefined,
  fileIds: string[]
): Promise<Set<string>> => {
  // Anonymous users don't own anything
  if (!user) {
    return new Set();
  }

  // Empty lists would lead to malformed SQL
  if (!fileIds.length) {
    return new Set();
  }

  // Remove duplicate file ids
  const ids = Array.from(new Set(fileIds));

  // Get the list of files owned by the user
  const institution = authProvider(user.authProvider).institution;
  const sql = `
SELECT dataFileId
    FROM DataFile
    JOIN Observation ON (DataFile.observationId=Observation.observationId)
    JOIN Proposal ON (Observation.proposalId=Proposal.proposalId)
    JOIN ProposalInvestigator ON (Proposal.proposalId=ProposalInvestigator.proposalId)
    JOIN Institution ON (Proposal.institutionId=Institution.institutionId)
WHERE ProposalInvestigator.institutionUserId=?
      AND Institution.institutionName=?
      AND DataFile.dataFileId IN (?)`;

  const results: any = await ssdaPool.query(sql, [
    user.authProviderUserId,
    institution,
    ids
  ]);
  const ownedIds = results[0].map((row: any) => row.dataFileId.toString());

  return new Set(ownedIds);
};

/**
 * A function that checks if the user owns the data request
 *
 * @param dataReqeust the data reuest
 * @param user user information
 */
export const ownsDataRequest = (dataReqeust: any, user: User) =>
  dataReqeust.user.id === user.id;

// Check whether a password is sufficiently strong.
function checkPasswordStrength(password: string) {
  if (password.length < 7) {
    throw new Error(`The password must be at least 7 characters long.`);
  }
}
