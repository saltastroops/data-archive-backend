import { isAdmin, IUser } from "../../util/user";

// TODO UPDATE conforming to the IUser interface
const createUser = ({ id, roles }: IUser) => ({
  id,
  roles
});

describe("User is admin", () => {
  it("should return true if the user has the admin role", () => {
    const adminUser = createUser({ id: "", roles: ["ADMIN"] });
    expect(isAdmin(adminUser)).toBeTruthy();
  });

  it("should return false if the user has only roles other than admin", () => {
    const normalUser = createUser({ id: "", roles: ["USER"] });
    expect(isAdmin(normalUser)).toBeFalsy();
  });

  it("should return false if the user has no roles", () => {
    expect(isAdmin(undefined)).toBeFalsy();
  });
});
