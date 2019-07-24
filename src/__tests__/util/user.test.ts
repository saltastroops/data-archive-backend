import { isAdmin, IUser } from "../../util/user";

describe("User is admin", () => {
  const user: IUser = {
    id: "",
    roles: []
  };
  it("should return true if the user has the admin role", () => {
    const adminUser = { ...user, roles: ["ADMIN"] };
    expect(isAdmin(adminUser)).toBeTruthy();
  });

  it("should return false if the user has only roles other than admin", () => {
    const normalUser = { ...user, roles: ["USER"] };
    expect(isAdmin(normalUser)).toBeFalsy();
  });

  it("should return false if the user has no roles", () => {
    expect(isAdmin(undefined)).toBeFalsy();
  });
});
