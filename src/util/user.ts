import bcrypt from "bcrypt";
import { validate } from "isemail";
import { PoolClient } from "pg";
import { v4 as uuid } from "uuid";
import { sdbPool } from "../db/mysql_pool";
import { ssdaPool } from "../db/postgresql_pool";
import AuthProvider, {
  AuthProviderName,
  getAuthProvider
} from "./authProvider";

export interface IAuthProviderUser {
  affiliation: string;
  authProvider: AuthProviderName;
  authProviderUserId: string;
  email: string;
  familyName: string;
  givenName: string;
  institutionId?: string;
  institutionMember?: boolean;
  institutionUserId?: string;
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
  institutionMember?: boolean;
  password?: string;
  username?: string;
}

export interface IUserUpdateInput {
  affiliation?: string;
  email?: string;
  familyName?: string;
  givenName?: string;
  id?: string | number;
  newPassword?: string;
  password: string;
  username?: string;
}

export type Role = "Admin";

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
    institutionMember,
    password,
    username
  } = args;

  // Check if the submitted email address is valid
  if (!validate(email, { minDomainAtoms: 2 })) {
    throw new Error(`The email address "${args.email}" is invalid.`);
  }

  // Transform the email address to lower case.
  const lowerCaseEmail = email.toLowerCase();

  // Check if there already exists a user with the submitted email address
  const userWithGivenEmail = await getUserByEmail(email, authProvider);

  if (userWithGivenEmail) {
    throw new Error(
      `There already exists a user with the email address ${email} for this authentication provider.`
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
    if (!username) {
      throw new Error(`The username must not be empty.`);
    }

    // Check if there already exists a user with the submitted username
    const userWithGivenUsername = await getUserByUsername(username);

    if (userWithGivenUsername) {
      throw new Error(
        `There already exists a user with the username ${username}.`
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
  let error: Error | null = null;
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

    // If an auth provider other than SSDA is used, we should store the user's
    // details for that institution
    if (authProvider === "SSDA") {
      // do nothing
    } else if (authProvider === "SDB") {
      // Does the user belong to a SALT partner?

      createInstitutionUser(
        client,
        "Southern African Large Telescope",
        !!institutionMember,
        authProviderUserId as string,
        userId
      );
    } else {
      // We'll have to re-throw the error later, but we first have to catch it
      // to roll back the database transaction
      error = new Error(`Not implemented for auth provider: ${authProvider}`);
      throw error;
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  // Re-throw error
  if (error) {
    throw error;
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
      SELECT r.role
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
      SELECT u.ssda_user_id AS id,
             affiliation,
             email,
             family_name,
             given_name,
             password,
             username,
             auth_provider,
             auth_provider_user_id,
             institution_id,
             institution_user_id
      FROM admin.ssda_user AS u
               JOIN admin.auth_provider AS ap ON u.auth_provider_id = ap.auth_provider_id
               LEFT JOIN admin.ssda_user_auth AS ua ON ua.user_id = u.ssda_user_id
               LEFT JOIN admin.institution_user AS i ON u.ssda_user_id = i.ssda_user_id
       WHERE u.ssda_user_id = $1
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
      SELECT u.ssda_user_id AS id,
             affiliation,
             email,
             family_name,
             given_name,
             password,
             username,
             auth_provider,
             u.auth_provider_user_id,
             institution_id,
             institution_user_id
      FROM admin.ssda_user AS u
               JOIN admin.auth_provider AS ap ON u.auth_provider_id = ap.auth_provider_id
               LEFT JOIN admin.ssda_user_auth AS ua ON ua.user_id = u.ssda_user_id
               LEFT JOIN admin.institution_user AS i ON u.ssda_user_id = i.ssda_user_id
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
      SELECT u.ssda_user_id AS id,
             affiliation,
             email,
             family_name,
             given_name,
             password,
             username,
             auth_provider,
             auth_provider_user_id,
             institution_id,
             institution_user_id
      FROM admin.ssda_user AS u
               LEFT JOIN admin.ssda_user_auth AS ua ON ua.user_id = u.ssda_user_id
               JOIN admin.auth_provider AS ap USING (auth_provider_id)
               LEFT JOIN admin.institution_user AS i ON u.ssda_user_id = i.ssda_user_id
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
      SELECT u.ssda_user_id AS id,
             affiliation,
             email,
             family_name,
             given_name,
             password,
             username,
             password_reset_token,
             password_reset_token_expiry,
             auth_provider,
             auth_provider_user_id,
             institution_id,
             institution_user_id
      FROM admin.ssda_user AS u
               JOIN admin.auth_provider AS ap ON u.auth_provider_id = ap.auth_provider_id
               LEFT JOIN admin.ssda_user_auth As ua ON ua.user_id = u.ssda_user_id
               LEFT JOIN admin.institution_user AS i ON u.ssda_user_id = i.ssda_user_id
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
      SELECT u.ssda_user_id AS id,
             affiliation,
             email,
             family_name,
             given_name,
             password,
             username,
             password_reset_token,
             password_reset_token_expiry,
             auth_provider,
             auth_provider_user_id,
             institution_id,
             institution_user_id
      FROM admin.ssda_user AS u
               JOIN admin.auth_provider AS ap ON u.auth_provider_id = ap.auth_provider_id
               LEFT JOIN admin.ssda_user_auth As ua ON ua.user_id = u.ssda_user_id
               LEFT JOIN admin.institution_user AS i ON u.ssda_user_id = i.ssda_user_id
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
    institutionId: user.institution_id || undefined,
    institutionUserId: user.institution_user_id || undefined,
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
    if (authProvider === "SSDA") {
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

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
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
export const isAdmin = (user: User | undefined) => {
  return user && user.roles && user.roles.has("Admin");
};

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
  const releaseDates = new Map<string, Date>();
  results.rows.forEach((row: any) =>
    releaseDates.set(row.artifact_id, row.data_release)
  );

  // Filter out the files that are public
  const now = new Date();
  const proprietaryIds = ids.filter(
    id => !(releaseDates.has(id) && (releaseDates.get(id) as Date) <= now)
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
  const institution = getAuthProvider(user.authProvider).institution;
  const sql = `
  SELECT artifact_id
  FROM observations.artifact a
JOIN observations.plane p on a.plane_id = p.plane_id
JOIN observations.observation o on p.observation_id = o.observation_id
JOIN observations.proposal p2 on o.proposal_id = p2.proposal_id
JOIN admin.proposal_investigator pi ON p2.proposal_id = pi.proposal_id
JOIN observations.institution i ON p2.institution_id = i.institution_id
WHERE pi.institution_user_id=$1 AND i.abbreviated_name=$2 AND a.artifact_id = ANY($3)
  `;
  const res: any = await ssdaPool.query(sql, [
    user.institutionUserId,
    institution,
    ids
  ]);
  const ownedIds = res.rows.map((row: any) => row.artifact_id);

  return new Set(ownedIds);
};

/**
 * A function that checks if the user owns the data request
 *
 * @param dataRequest the data request
 * @param user user information
 */
export const ownsDataRequest = (dataRequest: any, user: User) =>
  dataRequest.user.id === user.id;

// Check whether a password is sufficiently strong.
function checkPasswordStrength(password: string) {
  if (password.length < 7) {
    throw new Error(`The password must be at least 7 characters long.`);
  }
}

async function createInstitutionUser(
  client: PoolClient,
  institution: string,
  institutionMember: boolean,
  userId: string,
  ssdaUserId: string
) {
  // Inserting a new record if the institution user does not exist.
  // Update the ssda_user_id if the institution user already exosts.
  const insertOrUpdateInstitutionUserSQL = `
    WITH institution_id (id) AS (
      SELECT institution_id FROM institution WHERE name=$1
    )
    INSERT INTO institution_user (
      institution_id,
      user_id,
      ssda_user_id
    )
    VALUES (
      (SELECT id FROM institution_id),
      $2,
      $3
    )
    ON CONFLICT (user_id, institution_id) 
    DO UPDATE
    SET ssda_user_id=$4
    RETURNING institution_user_id
  `;
  const res: any = await client.query(insertOrUpdateInstitutionUserSQL, [
    institution,
    userId,
    ssdaUserId,
    ssdaUserId
  ]);
  const institutionUserId = res.rows[0].institution_user_id;

  // Update the membership details for the user.
  await updateInstitutionMembershipDetails(
    institution,
    institutionUserId,
    userId
  );
}

async function updateInstitutionMembershipDetails(
  institution: string,
  institutionUserId: string,
  userId: string
) {
  if (institution === "Southern African Large Telescope") {
    // TODO: This should be replaced with an improved version, getting the date
    // intervals from the SDB
    const partnerMembershipIntervals: Map<
      string,
      Array<[Date, Date]>
    > = new Map([
      ["AMNH", [[new Date(2011, 8, 1), new Date(2100, 0, 1)]]],
      ["CMU", [[new Date(2011, 8, 1), new Date(2013, 3, 30)]]],
      ["DC", [[new Date(2011, 8, 1), new Date(2100, 0, 1)]]],
      ["DUR", [[new Date(2017, 4, 1), new Date(2019, 3, 30)]]],
      [
        "GU",
        [
          [new Date(2011, 8, 1), new Date(2015, 3, 30)],
          [new Date(2016, 4, 1), new Date(2017, 9, 31)]
        ]
      ],
      ["HET", [[new Date(2011, 8, 1), new Date(2015, 3, 30)]]],
      ["IUCAA", [[new Date(2011, 8, 1), new Date(2100, 0, 1)]]],
      ["POL", [[new Date(2011, 8, 1), new Date(2100, 0, 1)]]],
      ["RSA", [[new Date(2011, 8, 1), new Date(2100, 0, 1)]]],
      ["RU", [[new Date(2011, 8, 1), new Date(2100, 0, 1)]]],
      [
        "UC",
        [
          [new Date(2011, 8, 1), new Date(2014, 9, 31)],
          [new Date(2015, 4, 1), new Date(2016, 9, 31)],
          [new Date(2017, 4, 1), new Date(2019, 3, 30)]
        ]
      ],
      ["UKSC", [[new Date(2011, 8, 1), new Date(2100, 0, 1)]]],
      ["UNC", [[new Date(2011, 8, 1), new Date(2020, 3, 30)]]],
      ["UW", [[new Date(2011, 8, 1), new Date(2100, 0, 1)]]]
    ]);

    // Get the user's partners from the SDB
    const membershipIntervals = new Set<[Date, Date]>();
    const partnerCodes = await saltUserPartners(userId);

    // Collect the membership intervals
    for (const partnerCode of Array.from(partnerCodes)) {
      const intervals = partnerMembershipIntervals.get(partnerCode);
      if (!intervals) {
        throw new Error(`Unknown partner code: ${partnerCode}`);
      }
      for (const interval of intervals) {
        if (!isDateIntervalInSet(interval, membershipIntervals)) {
          membershipIntervals.add(interval);
        }
      }
    }

    // Insert the membership details
    await updateInstitutionMemberships(institutionUserId, membershipIntervals);
  }
}

function isDateIntervalInSet(
  interval: [Date, Date],
  intervals: Set<[Date, Date]>
): boolean {
  for (const i of Array.from(intervals)) {
    if (
      i[0].getTime() === interval[0].getTime() &&
      i[1].getTime() === interval[1].getTime()
    ) {
      return true;
    }
  }

  return false;
}

async function updateInstitutionMemberships(
  institutionUserId: string,
  institutionMemberships: Set<[Date, Date]>
) {
  await deleteInstitutionMemberships(institutionUserId);
  await insertInstitutionMemberships(institutionUserId, institutionMemberships);
}

async function deleteInstitutionMemberships(institutionUserId: string) {
  const sql = `
  DELETE FROM institution_membership WHERE institution_user_id=$1
  `;

  await ssdaPool.query(sql, [institutionUserId]);
}

async function insertInstitutionMemberships(
  institutionUserId: string,
  institutionMemberships: Set<[Date, Date]>
) {
  const sql = `
  INSERT INTO institution_membership (
                                      institution_user_id,
                                      membership_start,
                                      membership_end
                                      )
  VALUES ($1, $2, $3)
  `;

  for (const institutionMembership of Array.from(institutionMemberships)) {
    await ssdaPool.query(sql, [
      institutionUserId,
      institutionMembership[0],
      institutionMembership[1]
    ]);
  }
}

/**
 * Get the partner codes of the partners a SALT user is associated with.
 */
async function saltUserPartners(userId: string): Promise<Set<string>> {
  const sql = `
  SELECT Partner_Code
  FROM PiptUser
  JOIN Investigator ON PiptUser.PiptUser_Id = Investigator.PiptUser_Id
  JOIN Institute ON Investigator.Institute_Id = Institute.Institute_Id
  JOIN Partner ON Institute.Partner_Id = Partner.Partner_Id
  WHERE PiptUser.PiptUser_Id=? AND Partner.Partner_Code != "OTH" AND Partner.Virtual = 0
  `;
  const result = await sdbPool.query(sql, [userId]);

  const partnerCodes = new Set<string>();
  for (const row of result[0] as any) {
    partnerCodes.add(row.Partner_Code);
  }
  return partnerCodes;
}
