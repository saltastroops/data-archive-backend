import bcrypt from "bcrypt";
import { validate } from "isemail";
import moment = require("moment");
import { v4 as uuid } from "uuid";
import { ssdaPool } from "../db/postgresql_pool";
import authProvider, { AuthProviderName } from "./authProvider";

export interface IAuthProviderUser {
  affiliation: string;
  authProvider: AuthProviderName;
  authProviderUserId: string;
  email: string;
  familyName: string;
  givenName: string;
  password: string;
  username: string;
}

export type User = IAuthProviderUser & {
  id: string;
  passwordResetToken: string;
  passwordResetTokenExpiry: Date;
  roles: Set<Role>;
};

export interface IUserCreateInput {
  affiliation: string;
  authProvider: AuthProviderName;
  authProviderUserId?: string;
  email: string;
  familyName: string;
  givenName: string;
  password?: string;
  username?: string;
}

export interface IUserUpdateInput {
  affiliation: string;
  email: string;
  familyName: string;
  givenName: string;
  id: string;
  password: string;
  username: string;
}

type Role = "ADMIN";

/**
 * Create a new user with the given details.
 *
 * The given password must not be encrypted. It must be sufficiently secure.
 *
 * An error is raised if a user with the given email address exists already.
 */
export const createUser = async (args: IUserCreateInput) => {
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
      SELECT auth_provider_id
      FROM admin.auth_provider
      WHERE auth_provider = $1
  `;
  const result: any = await ssdaPool.query(authProviderIdSQL, [authProvider]);
  if (result.rows.length === 0) {
    throw new Error(`Unknown authentication provider: ${authProvider}`);
  }
  const authProviderId = result.rows[0].auth_provider_id;

  // Insert the user with the given details into the database
  const userInsertSQL = `
      INSERT INTO admin.ssda_user (affiliation, email, family_name, given_name, auth_provider_id, auth_provider_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ssda_user_id
  `;
  const client = await ssdaPool.connect();
  try {
    await client.query("BEGIN");
    const res: any = await client.query(userInsertSQL, [
      affiliation,
      lowerCaseEmail,
      familyName,
      givenName,
      authProviderId,
      authProvider !== "SSDA" ? authProviderUserId : uuid()
    ]);
    const userId = res.rows[0].ssda_user_id;

    // If SSDA is used as the auth provider, we have to store the user credentials
    if (authProvider === "SSDA") {
      // Hash the password before storing it in the database
      const hashedPassword = await bcrypt.hash(args.password, 10);

      // Store the user credentials
      const authInsertSQL = `INSERT INTO admin.ssda_user_auth (user_id, username, password)
                             VALUES ($1, $2, $3)`;

      // Add the new user to the database
      await client.query(authInsertSQL, [userId, username, hashedPassword]);
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
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
      FROM admin.role AS r
               JOIN admin.user_role AS ur ON ur.role_id = r.role_id
      WHERE user_id = $1
  `;

  // Querying and returning the user roles
  const res = await ssdaPool.query(sql, [user.id]);
  const roles = res.rows.map((row: any) => row.role);

  return new Set<Role>(roles);
};

export const getUserById = async (
  userId: string | number
): Promise<User | null> => {
  // Query for retrieving a user with the supplied id
  const sql = `
      SELECT ssda_user_id AS id,
             affiliation,
             email,
             family_name,
             given_name,
             password,
             username,
             auth_provider,
             auth_provider_user_id
      FROM admin.ssda_user AS u
               JOIN admin.auth_provider AS ap ON u.auth_provider_id = ap.auth_provider_id
               LEFT JOIN admin.ssda_user_auth As ua ON ua.user_id = u.ssda_user_id
      WHERE ssda_user_id = $1
  `;

  // Querying the user
  const result: any = await ssdaPool.query(sql, [userId]);

  return userFromResult(result);
};

export const getUserByUsername = async (
  username: string
): Promise<User | null> => {
  // Query for retrieving a user with the supplied username
  const sql = `
      SELECT ssda_user_id AS id,
             affiliation,
             email,
             family_name,
             given_name,
             password,
             username,
             auth_provider,
             u.auth_provider_user_id
      FROM admin.ssda_user AS u
               JOIN admin.auth_provider AS ap ON u.auth_provider_id = ap.auth_provider_id
               LEFT JOIN admin.ssda_user_auth As ua ON ua.user_id = u.ssda_user_id
      WHERE username = $1
  `;

  // Querying the user
  const result: any = await ssdaPool.query(sql, [username]);

  return userFromResult(result);
};

export const getUserByEmail = async (
  email: string,
  authProvider: AuthProviderName
): Promise<User | null> => {
  // Query for retrieving a user with the supplied email
  const sql = `
      SELECT ssda_user_id AS id,
             affiliation,
             email,
             family_name,
             given_name,
             password,
             username,
             auth_provider,
             auth_provider_user_id
      FROM admin.ssda_user AS u
               LEFT JOIN admin.ssda_user_auth AS ua ON ua.user_id = u.ssda_user_id
               JOIN admin.auth_provider AS ap USING (auth_provider_id)
      WHERE email = $1
        AND auth_provider = $2
  `;

  // Querying the user
  const result: any = await ssdaPool.query(sql, [email, authProvider]);

  return userFromResult(result);
};

export const getUserByAuthProviderDetails = async (
  authProviderName: AuthProviderName,
  authProviderUserId: string
): Promise<User | null> => {
  // Query for retrieving a user with the supplied email
  const sql = `
      SELECT ssda_user_id AS id,
             affiliation,
             email,
             family_name,
             given_name,
             password,
             username,
             password_reset_token,
             password_reset_token_expiry,
             auth_provider,
             auth_provider_user_id
      FROM admin.ssda_user AS u
               JOIN admin.auth_provider AS ap ON u.auth_provider_id = ap.auth_provider_id
               LEFT JOIN admin.ssda_user_auth As ua ON ua.user_id = u.ssda_user_id
      WHERE auth_provider = $1
        AND auth_provider_user_id = $2
  `;

  // Querying the user
  const result: any = await ssdaPool.query(sql, [
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
      SELECT ssda_user_id AS id,
             affiliation,
             email,
             family_name,
             given_name,
             password,
             username,
             password_reset_token,
             password_reset_token_expiry,
             auth_provider,
             auth_provider_user_id
      FROM admin.ssda_user AS u
               JOIN admin.auth_provider AS ap ON u.auth_provider_id = ap.auth_provider_id
               LEFT JOIN admin.ssda_user_auth As ua ON ua.user_id = u.ssda_user_id
      WHERE password_reset_token = $1
  `;

  // Querying the user
  const result: any = await ssdaPool.query(sql, [passwordResetToken]);

  return userFromResult(result);
};

const userFromResult = async (result: any): Promise<User | null> => {
  if (result.rows.length === 0) {
    return null;
  }
  const user: any = result.rows[0];

  const roles = await userRoles(user);

  return {
    affiliation: user.affiliation,
    authProvider: user.auth_provider,
    authProviderUserId: user.auth_provider_user_id,
    email: user.email,
    familyName: user.family_name,
    givenName: user.given_name,
    id: user.id,
    password: user.password || "",
    passwordResetToken: user.password_reset_token,
    passwordResetTokenExpiry: user.password_reset_token_expiry,
    roles,
    username: user.username || ""
  };
};

/**
 * A function to update the user information
 *
 * @param userUpdateInfo user information to update
 * @param userId user id to update
 * @param authProvider authentication provider
 */
export const updateUser = async (
  userUpdateInfo: IUserUpdateInput,
  userId: string | number,
  authProvider: AuthProviderName
) => {
  const client = await ssdaPool.connect();
  await client.query("BEGIN");

  try {
    // Query for updating user information.
    const userUpdateSQL = `
        UPDATE admin.ssda_user
        SET affiliation=$1,
            email=$2,
            family_name=$3,
            given_name=$4
        WHERE ssda_user_id = $5
    `;

    // Update the user details
    await ssdaPool.query(userUpdateSQL, [
      userUpdateInfo.affiliation,
      userUpdateInfo.email,
      userUpdateInfo.familyName,
      userUpdateInfo.givenName,
      userId
    ]);

    // Query for updating authentication details.
    if (authProvider == "SSDA") {
      const authUpdateQuery = `
          UPDATE admin.ssda_user_auth
          SET username=$1,
              password=$2
          WHERE user_id = $3
      `;

      // Update the authentication details.
      client.query(authUpdateQuery, [
        userUpdateInfo.username,
        userUpdateInfo.password,
        userUpdateInfo.id
      ]);
    }

    client.query("COMMIT");
  } catch (e) {
    client.query("ROLLBACK");
  } finally {
    client.release();
  }
};

/**
 * A function to request the reset password
 *
 * @param passwordResetToken a password reset token
 * @param passwordResetTokenExpiry an expiry date time of the password reset token
 * @param email the email of the user requesting the reset password
 */
export const setUserToken = async (
  passwordResetToken: string,
  passwordResetTokenExpiry: Date,
  email: string
) => {
  // Query for setting user password reset token.
  const setUserTokenSQL = `
      WITH id (id) AS (
          SELECT user_id
          FROM admin.ssda_user_auth ua
          JOIN admin.ssda_user u ON ua.user_id=u.ssda_user_id
          JOIN admin.auth_provider ap ON u.auth_provider_id=ap.auth_provider_id
          WHERE email=$1 AND auth_provider=$2
      )
      UPDATE ssda_user_auth
      SET password_reset_token=$3, password_reset_token_expiry=$4
      WHERE user_id=(SELECT id FROM id);
  `;

  // Update the user details
  await ssdaPool.query(setUserTokenSQL, [
    email,
    "SSDA",
    passwordResetToken,
    passwordResetTokenExpiry
  ]);

  return true;
};

/**
 * A function to reset the user password
 *
 * @param newPassword the new user password
 * @param passwordResetToken a reset password token
 */
export const changeUserPassword = async (
  newPassword: string,
  passwordResetToken: string
) => {
  // Query for setting user password reset token.
  const sql = `
      UPDATE admin.ssda_user_auth
      SET password=$1,
          password_reset_token=NULL,
          password_reset_token_expiry=NULL
      WHERE password_reset_token=$2
  `;

  // Update the user details
  await ssdaPool.query(sql, [newPassword, passwordResetToken]);

  return true;
};

/**
 * A function that checks if the user has an admin role.
 *
 * @param user user information
 */
export const isAdmin = (user: User | undefined) =>
  user && user.roles && user.roles.has("ADMIN");

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
      SELECT artifact_id, data_release
      FROM artifact a
      JOIN plane p on a.plane_id = p.plane_id
      JOIN observation o on p.observation_id = o.observation_id
      WHERE artifact_id = ANY($1)
  `;
  const results: any = await ssdaPool.query(sql, [ids]);

  // Collect the release dates
  const releaseDates = new Map<string, number>();
  results.rows.forEach((row: any) =>
    releaseDates.set(row.artifact_id.toString(), row.data_release)
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
               JOIN Observation ON (DataFile.observationId = Observation.observationId)
               JOIN Proposal ON (Observation.proposalId = Proposal.proposalId)
               JOIN ProposalInvestigator ON (Proposal.proposalId = ProposalInvestigator.proposalId)
               JOIN Institution ON (Proposal.institutionId = Institution.institutionId)
      WHERE ProposalInvestigator.institutionUserId = ?
        AND Institution.institutionName = ?
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
