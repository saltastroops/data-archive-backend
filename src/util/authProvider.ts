import {
  createUser,
  getUserByAuthProviderDetails,
  getUserByUsername,
  User,
  userRoles,
  AuthProviderUser
} from "./user";
import bcrypt from "bcrypt";
import { sdbPool } from "../db/pool";

export type AuthProviderName = "SDB" | "SSDA";

export default function authProvider(
  authProviderName: AuthProviderName
): AuthProvider {
  switch (authProviderName) {
    case "SDB":
      return new SDBAuthProvider();
    case "SSDA":
      return new SSDAAuthProvider();
    default:
      throw new Error(`Unknown authentication provider: ${authProviderName}`);
  }
}

/**
 * An authentication provider.
 *
 * This interface provides an authenticate function which takes a username and
 * password and checks whether these are the valid credentials of an existing
 * user. If so, it returns this user; otherwise it returns null.
 */
abstract class AuthProvider {
  /**
   * Check the given username and password. If they are valid return the user,
   * otherwise return null.
   *
   * If the authentication provider is not the SSDA and there exists no entry
   * for the user in the user table yet, an entry is created.
   */
  authenticate = async (
    username: string,
    password: string
  ): Promise<User | null> => {
    const user = await this._findAndAuthenticateUser(username, password);
    if (!user) {
      return null;
    }

    // If this is not the SSDA, we need to ensure that there exists a user in
    // the user table
    const authProviderName = this.name;
    if (authProviderName !== "SSDA") {
      const ssdaUser = await getUserByAuthProviderDetails(
        user.authProvider,
        user.authProviderUserId
      );
      if (!ssdaUser) {
        await createUser(user);
      }
    }

    // Return the user
    if (authProviderName === "SSDA") {
      return await getUserByUsername(username);
    } else {
      return await getUserByAuthProviderDetails(
        user.authProvider,
        user.authProviderUserId
      );
    }
  };

  /**
   * Find the user with the given username and check that the password is
   * correct. If the user exists and the password is valid the user, otherwise
   * null is returned.
   *
   * This method should not be used outside the AuthProvider class.
   *
   * Parameters
   * ----------
   * username: string
   *     Username.
   * password: string
   *     Password.
   *
   * Return
   * ------
   * The user or null if the username and password are not valid.
   */
  abstract async _findAndAuthenticateUser(
    username: string,
    password: string
  ): Promise<AuthProviderUser | null>;

  /**
   * The name of this authentication provider.
   *
   * Return
   * ------
   * The name of this authentication provider.
   */
  abstract get name(): AuthProviderName;

  /**
   * The institution using this authentication provider.
   *
   * This must be consistent with the column Institution.institutionName in the
   * SSDA database.
   *
   * Return
   * ------
   * The institution using this authentication provider.
   */
  abstract get institution(): string;
}

class SSDAAuthProvider extends AuthProvider {
  /**
   * Find the user with the given username and check that the password is
   * correct. If the user exists and the password is valid the user, otherwise
   * null is returned.
   *
   * This method should not be used outside the AuthProvider class.
   *
   * Parameters
   * ----------
   * username: string
   *     Username.
   * password: string
   *     Password.
   *
   * Return
   * ------
   * The user or null if the username and password are not valid.
   */
  async _findAndAuthenticateUser(
    username: string,
    password: string
  ): Promise<AuthProviderUser | null> {
    const user = await getUserByUsername(username);

    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    } else {
      return null;
    }
  }

  /**
   * The name of this authentication provider.
   *
   * Return
   * ------
   * The name of this authentication provider.
   */
  get name(): AuthProviderName {
    return "SSDA";
  }

  /**
   * The institution using this authentication provider.
   *
   * This must be consistent with the column Institution.institutionName in the
   * SSDA database.
   *
   * Return
   * ------
   * The institution using this authentication provider.
   */
  get institution(): string {
    return "SSDA";
  }
}

class SDBAuthProvider extends AuthProvider {
  /**
   * Find the user with the given username and check that the password is
   * correct. If the user exists and the password is valid the user, otherwise
   * null is returned.
   *
   * This method should not be used outside the AuthProvider class.
   *
   * Parameters
   * ----------
   * username: string
   *     Username.
   * password: string
   *     Password.
   *
   * Return
   * ------
   * The user or null if the username and password are not valid.
   */
  async _findAndAuthenticateUser(
    username: string,
    password: string
  ): Promise<AuthProviderUser | null> {
    const result: any = await sdbPool.query(
      `
SELECT * FROM PiptUser JOIN Investigator USING (Investigator_Id) JOIN Institute USING (Institute_Id) JOIN InstituteName USING (InstituteName_Id) WHERE Username=? AND Password=MD5(?);
      `,
      [username, password]
    );

    if (result[0].length > 0) {
      const user = result[0][0];
      return {
        affiliation: user.InstituteName_Name,
        authProvider: "SDB",
        authProviderUserId: user.PiptUser_Id.toString(),
        email: user.Email,
        familyName: user.Surname,
        givenName: user.FirstName,
        password,
        username
      };
    } else {
      return null;
    }
  }

  /**
   * The name of this authentication provider.
   *
   * Return
   * ------
   * The name of this authentication provider.
   */
  get name(): AuthProviderName {
    return "SDB";
  }

  /**
   * The institution using this authentication provider.
   *
   * This must be consistent with the column Institution.institutionName in the
   * SSDA database.
   *
   * Return
   * ------
   * The institution using this authentication provider.
   */
  get institution(): string {
    return "SALT";
  }
}
