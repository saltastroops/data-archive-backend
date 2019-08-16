jest.mock("../db/pool.ts");
jest.mock("uuid");
jest.mock("bcrypt");

import bcrypt from "bcrypt";
import { ssdaAdminPool } from "../db/pool";
import { resolvers } from "../resolvers";
import { IUserUpdateInput } from "../util/user";

// Defining update user interface
interface IUserUpdateInputArgs extends IUserUpdateInput {
  newPassword?: string;
}

afterEach(() => {
  // Cleaning up
  (ssdaAdminPool.query as any).mockReset();
  (ssdaAdminPool.getConnection as any).mockReset();
});

describe("User update", () => {
  describe("Update user information of the currently logged in user", () => {
    it("should update the user with valid information having a different unique username and email address", async () => {
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]]);

      (bcrypt.compare as any).mockReturnValueOnce(true);
      (bcrypt.hash as any).mockReturnValueOnce("new-hashed-password");

      // Updating user with valid information having a different unique username and email address.
      const args: IUserUpdateInputArgs = {
        affiliation: "New affiliation",
        email: "newunique@gmail.com",
        familyName: "New family name",
        givenName: "New given name",
        newPassword: "New password",
        password: "oldpassword",
        username: "newuniqueusername"
      };

      // Update the user
      await resolvers.Mutation.updateUser({}, args, {
        user: { id: "1", authProvider: "SSDA" }
      });

      // Expect ssdaAdminPool query to have been called 4 times
      expect(ssdaAdminPool.query).toHaveBeenCalledTimes(8);

      // Expect the first, sixth and last ssdaAdminPool query to
      // have been called with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[0][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[0][1]).toEqual(["1"]);

      expect((ssdaAdminPool.query as any).mock.calls[6][0]).toContain(
        "UPDATE User u"
      );
      expect((ssdaAdminPool.query as any).mock.calls[6][1]).toEqual([
        "New affiliation",
        "newunique@gmail.com",
        "New family name",
        "New given name",
        "new-hashed-password",
        "newuniqueusername",
        1
      ]);

      expect((ssdaAdminPool.query as any).mock.calls[7][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[7][1]).toEqual([1]);
    });

    it("should update the user with valid information having the same unique username and email address", async () => {
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]]);

      (bcrypt.compare as any).mockReturnValueOnce(true);
      (bcrypt.hash as any).mockReturnValueOnce("new-hashed-password");

      // Update user information.
      const args: IUserUpdateInputArgs = {
        affiliation: "New affiliation",
        email: "test@gmail.com",
        familyName: "New family name",
        givenName: "New given name",
        newPassword: "New password",
        password: "test",
        username: "test"
      };

      // Update the user
      await resolvers.Mutation.updateUser({}, args, {
        user: { id: "1", authProvider: "SSDA" }
      });

      // Expect ssdaAdminPool query to have been called 4 times
      expect(ssdaAdminPool.query).toHaveBeenCalledTimes(8);

      // Expect the first, sixth and last ssdaAdminPool query to
      // have been called with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[0][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[0][1]).toEqual(["1"]);

      expect((ssdaAdminPool.query as any).mock.calls[6][0]).toContain(
        "UPDATE User u"
      );
      expect((ssdaAdminPool.query as any).mock.calls[6][1]).toEqual([
        "New affiliation",
        "test@gmail.com",
        "New family name",
        "New given name",
        "new-hashed-password",
        "test",
        1
      ]);

      expect((ssdaAdminPool.query as any).mock.calls[7][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[7][1]).toEqual([1]);
    });

    it("should raise an error if the current password is wrong", async () => {
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]]);

      (bcrypt.compare as any).mockReturnValueOnce(false);

      // Updating user with an invalid password.
      const args: IUserUpdateInputArgs = {
        password: "wrongpassword"
      };

      // Expect the user update to fail with the appropriate error
      let message = null;
      try {
        await resolvers.Mutation.updateUser({}, args, {
          user: { id: "1", authProvider: "SSDA" }
        });
      } catch (e) {
        message = e.message;
      }
      expect(message).toContain("The old password is wrong");
    });

    it("should raise an error if the email address is used by another user", async () => {
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ email: "existing@email.address", id: 2 }]])
        .mockReturnValueOnce([[]]);

      (bcrypt.compare as any).mockReturnValueOnce(true);

      // Updating user with an email that is in use already
      const args: IUserUpdateInput = {
        email: "existing@email.address",
        password: "test"
      };

      // Expect the user update to fail with the appropriate error
      let message = null;
      try {
        await resolvers.Mutation.updateUser({}, args, {
          user: { id: "1", authProvider: "SSDA" }
        });
      } catch (e) {
        message = e.message;
      }
      expect(message).toContain("already exists");
      expect(message).toContain("email address");
    });

    it("should raise an error if the username is used by another user", async () => {
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ username: "existingusername", id: 2 }]])
        .mockReturnValueOnce([[]]);

      (bcrypt.compare as any).mockReturnValueOnce(true);
      // Updating user with a username that is in use already
      const args: IUserUpdateInputArgs = {
        password: "test",
        username: "existingusername"
      };

      // Expect the user update to fail with the appropriate error
      let message = null;
      try {
        await resolvers.Mutation.updateUser({}, args, {
          user: { id: "1", authProvider: "SSDA" }
        });
      } catch (e) {
        message = e.message;
      }
      expect(message).toContain("already exists");
      expect(message).toContain("username");
    });
  });

  describe("Update user information of a user other than the currently logged in user", () => {
    it("should update the user information of a user other than the logged in user", async () => {
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[{ role: "ADMIN" }]])
        .mockReturnValueOnce([[{ id: 2 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]]);

      (bcrypt.compare as any).mockReturnValueOnce(true);
      (bcrypt.hash as any).mockReturnValueOnce("new-hashed-password");

      // Updating user with valid information.
      const args: IUserUpdateInputArgs = {
        affiliation: "New affiliation",
        email: "new@unique.email",
        familyName: "New family name",
        givenName: "New given name",
        id: 2,
        newPassword: "New password",
        password: "test",
        username: "new unique username"
      };

      // Update the user
      await resolvers.Mutation.updateUser({}, args, {
        user: { id: 1, authProvider: "SSDA" }
      });

      // Expect ssdaAdminPool query to have been called 4 times
      expect(ssdaAdminPool.query).toHaveBeenCalledTimes(8);

      // Expect the first, sixth and last ssdaAdminPool query to
      // have been called with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[0][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[0][1]).toEqual([1]);

      expect((ssdaAdminPool.query as any).mock.calls[6][0]).toContain(
        "UPDATE User u"
      );
      expect((ssdaAdminPool.query as any).mock.calls[6][1]).toEqual([
        "New affiliation",
        "new@unique.email",
        "New family name",
        "New given name",
        "new-hashed-password",
        "new unique username",
        2
      ]);

      expect((ssdaAdminPool.query as any).mock.calls[7][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[7][1]).toEqual([2]);
    });

    it("should throw an error if the user does not exist", async () => {
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[{ role: "ADMIN" }]])
        .mockReturnValueOnce([[]]);

      (bcrypt.compare as any).mockReturnValueOnce(true);
      // Updating a user that does not exist
      const args: IUserUpdateInputArgs = {
        id: 2,
        password: "test"
      };

      // Expect the user update to fail with the appropriate error
      let message = null;
      try {
        await resolvers.Mutation.updateUser({}, args, {
          user: { id: 1, authProvider: "SSDA" }
        });
      } catch (e) {
        message = e.message;
      }
      expect(message).toContain(`ID ${args.id}`);
      expect(message).toContain("no user");
    });
  });
});
