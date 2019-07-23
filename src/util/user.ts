// TODO UPDATE according to mysql database
export interface IUser {
  roles: string[];
}
/**
 * A function that checks if the user has an admin role.
 *
 * @param user user information
 */
const isAdmin = (user: IUser | undefined) =>
  user && user.roles.some((role: string) => role === "ADMIN");

const ownsDataFile = (user: IUser | undefined) => false;

export { isAdmin, ownsDataFile };
