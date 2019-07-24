// TODO UPDATE according to mysql database
export interface IUser {
  id: string; // In mysql this is a number
  roles: string[];
}
/**
 * A function that checks if the user has an admin role.
 *
 * @param user user information
 */
const isAdmin = (user: IUser | undefined) =>
  user && user.roles.some((role: string) => role === "ADMIN");

/**
 * A function that checks if the user owns the data file
 *
 * @param user  user information
 * @param fileId data file id
 */
const ownsDataFile = (user: IUser | undefined, fileId: number) => false;

/**
 * A function that checks if the user owns the data request
 *
 * @param dataReqeust the data reuest
 * @param user user information
 */
const ownsDataRequest = (dataReqeust: any, user: IUser) =>
  dataReqeust.user.id === user.id;

export { isAdmin, ownsDataFile, ownsDataRequest };
