import { isAdmin } from "../../util/user";

describe("User is admin", () => {
  it("should retur true is user has admin role", () => {
    expect(isAdmin({ roles: ["ADMIN"] })).toBeTruthy();
  });

  it("should return false if user has roles other then admin", () => {
    expect(isAdmin({ roles: ["USER"] })).toBeFalsy();
  });

  it("should return false if user has no roles", () => {
    expect(isAdmin(null)).toBeFalsy();
  });
});
