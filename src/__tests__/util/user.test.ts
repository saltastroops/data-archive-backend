import { isAdmin, Role, User } from "../../util/user";

// TODO UPDATE conforming to the IUser interface
const createUser = ({ id, roles, authProvider }: User) => ({
  authProvider,
  id,
  roles
});

describe("User is admin", () => {
  it("should return true if the user has the admin role", () => {
    const adminUser: any = createUser({
      id: 42,
      roles: new Set<Role>(["Admin"] as any) as any,
      authProvider: "SDB"
    } as any);
    expect(isAdmin(adminUser)).toBeTruthy();
  });

  it("should return false if the user has only roles other than admin", () => {
    const normalUser: any = createUser({
      id: "",
      roles: new Set<Role>(["User"] as any) as any
    } as any);
    expect(isAdmin(normalUser)).toBeFalsy();
  });

  it("should return false if the user has no roles", () => {
    expect(isAdmin(undefined)).toBeFalsy();
  });
});
