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
      // Mock the database querying
      // 1. & 2. Mocks the get user by id of the currently logged in user to exist.
      // 3. & 4. Mocks the get user by id of the user to update to exist.
      // 5. Mocks the get user by username to update with not to exist.
      // 6. Mocks the get user by email address to update with not to exist.
      // 7. Mocks the updation of the user to succeed.
      // 8. & 9. Mocks the get user by id of the updated user to exist.
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]]);

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockReturnValueOnce(true);
      // Mock the bcrypt password hashing to hash the password.
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
        user: { id: 1, authProvider: "SSDA" }
      });

      // Expect ssdaAdminPool query to have been called 8 times
      expect(ssdaAdminPool.query).toHaveBeenCalledTimes(8);

      // Expect the first and second query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[0][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[0][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[0][1]).toEqual([1]);
      expect((ssdaAdminPool.query as any).mock.calls[1][0]).toContain(
        "SELECT role"
      );
      expect((ssdaAdminPool.query as any).mock.calls[1][0]).toContain(
        "WHERE ur.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[1][1]).toEqual([1]);

      // Expect the third and forth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[2][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[2][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[2][1]).toEqual([1]);
      expect((ssdaAdminPool.query as any).mock.calls[3][0]).toContain(
        "SELECT role"
      );
      expect((ssdaAdminPool.query as any).mock.calls[3][0]).toContain(
        "WHERE ur.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[3][1]).toEqual([1]);

      // Expect the fith query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[4][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[4][0]).toContain(
        "WHERE ua.username = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[4][1]).toEqual([
        "newuniqueusername"
      ]);

      // Expect the sixth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[5][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[5][0]).toContain(
        "WHERE u.email = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[5][1]).toEqual([
        "newunique@gmail.com",
        "SSDA"
      ]);

      // Expect the seventh query to have been called
      // with the correct sql query and the suplied params
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

      // Expect the eighth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[7][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[7][1]).toEqual([1]);
    });

    it("should update the user with valid information having the same unique username and email address", async () => {
      // Mock the database querying
      // 1. & 2. Mocks the get user by id of the currently logged in user to exist.
      // 3. & 4. Mocks the get user by id of the user to update to exist.
      // 5. Mocks the get user by username to update with not to exist.
      // 6. Mocks the get user by email address to update with not to exist.
      // 7. Mocks the updation of the user to succeed.
      // 8. & 9. Mocks the get user by id of the updated user to exist.
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]]);

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockReturnValueOnce(true);
      // Mock the bcrypt password hashing to hash the password.
      (bcrypt.hash as any).mockReturnValueOnce("new-hashed-password");

      // Update user information having same username and email address.
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
        user: { id: 1, authProvider: "SSDA" }
      });

      // Expect ssdaAdminPool query to have been called 8 times
      expect(ssdaAdminPool.query).toHaveBeenCalledTimes(8);

      // Expect the first and second query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[0][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[0][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[0][1]).toEqual([1]);
      expect((ssdaAdminPool.query as any).mock.calls[1][0]).toContain(
        "SELECT role"
      );
      expect((ssdaAdminPool.query as any).mock.calls[1][0]).toContain(
        "WHERE ur.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[1][1]).toEqual([1]);

      // Expect the third and forth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[2][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[2][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[2][1]).toEqual([1]);
      expect((ssdaAdminPool.query as any).mock.calls[3][0]).toContain(
        "SELECT role"
      );
      expect((ssdaAdminPool.query as any).mock.calls[3][0]).toContain(
        "WHERE ur.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[3][1]).toEqual([1]);

      // Expect the fith query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[4][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[4][0]).toContain(
        "WHERE ua.username = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[4][1]).toEqual(["test"]);

      // Expect the sixth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[5][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[5][0]).toContain(
        "WHERE u.email = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[5][1]).toEqual([
        "test@gmail.com",
        "SSDA"
      ]);

      // Expect the seventh query to have been called
      // with the correct sql query and the suplied params
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

      // Expect the eighth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[7][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[7][1]).toEqual([1]);
    });

    it("should raise an error if the current password is wrong", async () => {
      // Mock the database querying
      // 1. & 2. Mocks the get user by id of the currently logged in user to exist.
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]]);

      // Mock the bcrypt password compare to return false.
      (bcrypt.compare as any).mockReturnValueOnce(false);

      // Updating user with an invalid password.
      const args: IUserUpdateInputArgs = {
        password: "wrongpassword"
      };

      // Expect the user update to fail with an appropriate error
      try {
        await resolvers.Mutation.updateUser({}, args, {
          user: { id: 1, authProvider: "SSDA" }
        });
      } catch (e) {
        expect(e.message).toContain("The old password is wrong");
      }
    });

    it("should raise an error if the email address is used by another user", async () => {
      // Mock the database querying
      // 1. & 2. Mocks the get user by id of the currently logged in user to exist.
      // 3. & 4. Mocks the get user by id of the user to update to exist.
      // 5. Mocks the get user by email address to update with not to exist.
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ email: "existing@email.address", id: 2 }]])
        .mockReturnValueOnce([[]]);

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockReturnValueOnce(true);

      // Updating user with an email that is in use already
      const args: IUserUpdateInput = {
        email: "existing@email.address",
        password: "test"
      };

      // Expect the user update to fail with the appropriate error
      try {
        await resolvers.Mutation.updateUser({}, args, {
          user: { id: "1", authProvider: "SSDA" }
        });
      } catch (e) {
        expect(e.message).toContain("already exists");
        expect(e.message).toContain("email address");
      }
    });

    it("should raise an error if the username is used by another user", async () => {
      // Mock the database querying
      // 1. & 2. Mocks the get user by id of the currently logged in user to exist.
      // 3. & 4. Mocks the get user by id of the user to update to exist.
      // 5. & 6. Mocks the get user by username to update with not to exist.
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ username: "existingusername", id: 2 }]])
        .mockReturnValueOnce([[]]);

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockReturnValueOnce(true);

      // Updating user with a username that is in use already
      const args: IUserUpdateInputArgs = {
        password: "test",
        username: "existingusername"
      };

      // Expect the user update to fail with the appropriate error
      try {
        await resolvers.Mutation.updateUser({}, args, {
          user: { id: 1, authProvider: "SSDA" }
        });
      } catch (e) {
        expect(e.message).toContain("already exists");
        expect(e.message).toContain("username");
      }
    });
  });

  describe("Update user information of a user other than the currently logged in user", () => {
    it("should update the user information of a user other than the logged in user", async () => {
      // Mock the database querying
      // 1. & 2. Mocks the get admin user by id of the currently logged in user to exist.
      // 3. & 4. Mocks the get user by id of the user to update to exist.
      // 5. Mocks the get user by username to update with not to exist.
      // 6. Mocks the get user by email address to update with not to exist.
      // 7. Mocks the updation of the user to succeed.
      // 8. & 9. Mocks the get user by id of the updated user to exist.
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[{ role: "ADMIN" }]])
        .mockReturnValueOnce([[{ id: 2 }]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[]])
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[]]);

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockReturnValueOnce(true);
      // Mock the bcrypt password hashing to hash the password.
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
        username: "newuniqueusername"
      };

      // Update the user
      await resolvers.Mutation.updateUser({}, args, {
        user: { id: 1, authProvider: "SSDA" }
      });

      // Expect ssdaAdminPool query to have been called 8 times
      expect(ssdaAdminPool.query).toHaveBeenCalledTimes(8);

      // Expect the first and second query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[0][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[0][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[0][1]).toEqual([1]);
      expect((ssdaAdminPool.query as any).mock.calls[1][0]).toContain(
        "SELECT role"
      );
      expect((ssdaAdminPool.query as any).mock.calls[1][0]).toContain(
        "WHERE ur.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[1][1]).toEqual([1]);

      // Expect the third and forth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[2][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[2][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[2][1]).toEqual([2]);
      expect((ssdaAdminPool.query as any).mock.calls[3][0]).toContain(
        "SELECT role"
      );
      expect((ssdaAdminPool.query as any).mock.calls[3][0]).toContain(
        "WHERE ur.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[3][1]).toEqual([2]);

      // Expect the fith query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[4][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[4][0]).toContain(
        "WHERE ua.username = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[4][1]).toEqual([
        "newuniqueusername"
      ]);

      // Expect the sixth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[5][0]).toContain(
        "SELECT u.userId AS id"
      );
      expect((ssdaAdminPool.query as any).mock.calls[5][0]).toContain(
        "WHERE u.email = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[5][1]).toEqual([
        "new@unique.email",
        "SSDA"
      ]);

      // Expect the seventh query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[6][0]).toContain(
        "UPDATE User u"
      );
      expect((ssdaAdminPool.query as any).mock.calls[6][1]).toEqual([
        "New affiliation",
        "new@unique.email",
        "New family name",
        "New given name",
        "new-hashed-password",
        "newuniqueusername",
        2
      ]);

      // Expect the eighth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[7][0]).toContain(
        "WHERE u.userId = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[7][1]).toEqual([2]);
    });

    it("should throw an error if the user does not exist", async () => {
      // Mock the database querying
      // 1. & 2. Mocks the get admin user by id of the currently logged in user to exist.
      // 3. Mocks the get user by id of the user to update to not exist.
      (ssdaAdminPool.query as any)
        .mockReturnValueOnce([[{ id: 1 }]])
        .mockReturnValueOnce([[{ role: "ADMIN" }]])
        .mockReturnValueOnce([[]]);

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockReturnValueOnce(true);

      // Updating a user that does not exist
      const args: IUserUpdateInputArgs = {
        id: 2,
        password: "test"
      };

      // Expect the user update to fail with the appropriate error
      try {
        await resolvers.Mutation.updateUser({}, args, {
          user: { id: 1, authProvider: "SSDA" }
        });
      } catch (e) {
        expect(e.message).toContain(`ID ${args.id}`);
        expect(e.message).toContain("no user");
      }
    });
  });
});
