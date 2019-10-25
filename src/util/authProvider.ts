import {
  createUser,
  getUserByAuthProviderDetails,
  getUserByUsername,
  IAuthProviderUser,
  User
} from "./user";

export type AuthProviderName = "SDB" | "SSDA";

/**
 * An authentication provider.
 *
 * This interface provides an authenticate function which takes a username and
 * password and checks whether these are the valid credentials of an existing
 * user. If so, it returns this user; otherwise it returns null.
 */
export default abstract class AuthProvider {
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
      return getUserByUsername(username);
    } else {
      return getUserByAuthProviderDetails(
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
  ): Promise<IAuthProviderUser | null>;

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
