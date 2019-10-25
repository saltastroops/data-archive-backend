import bcrypt from "bcrypt";
import AuthProvider, { AuthProviderName } from "./authProvider";
import { getUserByUsername, IAuthProviderUser } from "./user";

export default class SSDAAuthProvider extends AuthProvider {
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
  ): Promise<IAuthProviderUser | null> {
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
