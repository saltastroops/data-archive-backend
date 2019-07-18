/**
 * A function that checks if the user has an admin role.
 *
 * @param user user information
 */
const isAdmin = (user: any) =>
  user.roles.find((role: string) => role === "ADMIN");

export { isAdmin };
