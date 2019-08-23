jest.mock("../../db/pool.ts");

import { Role } from "../../generated/prisma-client";
import { isAdmin } from "../../util/user";

describe("User is admin", () => {
  it("should return true if the user has the admin role", () => {
    // An admin user
    const adminUser = isAdmin({
      affiliation: "string",
      authProvider: "SSDA",
      authProviderUserId: "string",
      email: "string",
      familyName: "string",
      givenName: "string",
      id: "",
      password: "string",
      roles: new Set<Role>(["ADMIN"]),
      username: "string"
    });

    expect(adminUser).toBeTruthy();
  });

  it("should return false if the user has only roles other than admin", () => {
    // A normal user
    const normalUser = isAdmin({
      affiliation: "string",
      authProvider: "SSDA",
      authProviderUserId: "string",
      email: "string",
      familyName: "string",
      givenName: "string",
      id: "",
      password: "string",
      roles: new Set<Role>([]),
      username: "string"
    });
    expect(normalUser).toBeFalsy();
  });

  it("should return false if the user has no roles", () => {
    expect(isAdmin(undefined)).toBeFalsy();
  });
});
