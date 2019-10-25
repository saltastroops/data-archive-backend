import { sdbPool } from "../db/mysql_pool";
import AuthProvider, { AuthProviderName } from "./authProvider";
import { IAuthProviderUser } from "./user";

export default class SDBAuthProvider extends AuthProvider {
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
