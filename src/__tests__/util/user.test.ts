// tslint:disable-next-line:no-submodule-imports
import * as iconv from "mysql2/node_modules/iconv-lite";
iconv.encodingExists("cesu8");

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
      authProvider: "SDB",
      id: 42,
      roles: new Set<Role>(["Admin"] as any) as any
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
