// tslint:disable-next-line:no-submodule-imports
import * as iconv from "mysql2/node_modules/iconv-lite";
iconv.encodingExists("cesu8");

jest.mock("../db/postgresql_pool.ts");
jest.mock("uuid");
jest.mock("bcrypt");

import bcrypt from "bcrypt";
import { ssdaPool } from "../db/postgresql_pool";
import { resolvers } from "../resolvers";
import { IUserUpdateInput } from "../util/user";

// Defining update user interface
interface IUserUpdateInputArgs extends IUserUpdateInput {
  newPassword?: string;
}

afterEach(() => {
  // Cleaning up
  (ssdaPool.query as any).mockReset();
  (ssdaPool.connect as any).mockReset();
});

describe("User update", () => {
  describe("Update user information of the currently logged in user", () => {
    it("should update the user with valid information having a different unique username and email address", async () => {
      // Mock the database querying
      // 1. & 2. Mocks get user by id of the currently logged in user to exist.
      // 3. & 4. Mocks the get user by id of the user to update to exist.
      // 5. Mocks the get user by username to update with not to exist.
      // 6. Mocks the get user by email address to update with not to exist.
      // 7. & 8. Mocks the get user by id of the updated user to exist.
      (ssdaPool.query as any)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      // Mocks the database transaction
      // 1. Mocks client connection.
      // 2. Mocks beginning of the client transaction.
      // 3. Mocks a select of the user id.
      // 4. Mocks an insert of the user details.
      // 5. Mocks a commit of the client transaction.
      // 6. Mocks a release of the client transaction.
      const client = (ssdaPool.connect as any).mockReturnValue({
        query: jest
          .fn()
          .mockImplementationOnce(() => "BEGIN")
          .mockImplementationOnce(
            () => "Update user in the SSDA user auth table"
          )
          .mockImplementationOnce(() => "COMMIT"),
        release: jest.fn().mockResolvedValueOnce("release connection")
      });

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockResolvedValueOnce(true);
      // Mock the bcrypt password hashing to hash the password.
      (bcrypt.hash as any).mockResolvedValueOnce("new-hashed-password");

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
      expect(ssdaPool.query).toHaveBeenCalledTimes(8);

      // Expect the first and second query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[0][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[0][0]).toContain(
        "WHERE ssda_user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[0][1]).toEqual([1]);

      expect((ssdaPool.query as any).mock.calls[1][0]).toContain(
        "SELECT r.role"
      );
      expect((ssdaPool.query as any).mock.calls[1][0]).toContain(
        "WHERE user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[1][1]).toEqual([1]);

      // Expect the third and forth query to have been called
      // with the correct sql query and the supplied params
      expect((ssdaPool.query as any).mock.calls[2][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[2][0]).toContain(
        "WHERE ssda_user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[2][1]).toEqual([1]);
      expect((ssdaPool.query as any).mock.calls[3][0]).toContain(
        "SELECT r.role"
      );
      expect((ssdaPool.query as any).mock.calls[3][0]).toContain(
        "WHERE user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[3][1]).toEqual([1]);

      // Expect the fith query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[4][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[4][0]).toContain(
        "WHERE username = $1"
      );
      expect((ssdaPool.query as any).mock.calls[4][1]).toEqual([
        "newuniqueusername"
      ]);

      // Expect the sixth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[5][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[5][0]).toContain(
        "WHERE email = $1"
      );
      expect((ssdaPool.query as any).mock.calls[5][1]).toEqual([
        "newunique@gmail.com",
        "SSDA"
      ]);

      // Expect the seventh query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[6][0]).toContain(
        "UPDATE admin.ssda_user"
      );
      expect((ssdaPool.query as any).mock.calls[6][1]).toEqual([
        "New affiliation",
        "newunique@gmail.com",
        "New family name",
        "New given name",
        1
      ]);

      // Expect the eighth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[7][0]).toContain(
        "WHERE ssda_user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[7][1]).toEqual([1]);

      // Expect the ssdaPool client connection for transaction to have been called
      expect(client).toHaveBeenCalled();

      // Expect the ssdaPool client query to have been called 3 times
      expect(client().query).toHaveBeenCalledTimes(3);

      // Expect the ssdaPool client transaction to have began
      expect(client().query.mock.calls[0][0]).toContain("BEGIN");

      // Expect the ssdaPool client transaction query to
      // have been called with the correct sql query and the suplied params
      expect(client().query.mock.calls[1][0]).toContain(
        "UPDATE admin.ssda_user_auth"
      );
      expect(client().query.mock.calls[1][1]).toEqual([
        "newuniqueusername",
        "new-hashed-password",
        1
      ]);

      // Expect the ssdaPool client transaction to have been committed
      expect(client().query.mock.calls[2][0]).toContain("COMMIT");
    });

    it("should update the user with valid information having the same unique username and email address", async () => {
      // Mock the database querying
      // 1. & 2. Mocks get user by id of the currently logged in user to exist.
      // 3. & 4. Mocks the get user by id of the user to update to exist.
      // 5. Mocks the get user by username to update with not to exist.
      // 6. Mocks the get user by email address to update with not to exist.
      // 7. & 8. Mocks the get user by id of the updated user to exist.
      (ssdaPool.query as any)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      // Mocks the database transaction
      // 1. Mocks client connection.
      // 2. Mocks begining of the client transaction.
      // 3. Mocks a select of the user id.
      // 4. Mocks an insert of the user details.
      // 5. Mocks a commit of the client transaction.
      // 6. Mocks a release of the client transaction.
      const client = (ssdaPool.connect as any).mockReturnValue({
        query: jest
          .fn()
          .mockImplementationOnce(() => "BEGIN")
          .mockImplementationOnce(
            () => "Update user in the SSDA user auth table"
          )
          .mockImplementationOnce(() => "COMMIT"),
        release: jest.fn().mockResolvedValueOnce("release connection")
      });

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockResolvedValueOnce(true);
      // Mock the bcrypt password hashing to hash the password.
      (bcrypt.hash as any).mockResolvedValueOnce("new-hashed-password");

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
      expect(ssdaPool.query).toHaveBeenCalledTimes(8);

      // Expect the first and second query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[0][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[0][0]).toContain(
        "WHERE ssda_user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[0][1]).toEqual([1]);

      expect((ssdaPool.query as any).mock.calls[1][0]).toContain(
        "SELECT r.role"
      );
      expect((ssdaPool.query as any).mock.calls[1][0]).toContain(
        "WHERE user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[1][1]).toEqual([1]);

      // Expect the third and forth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[2][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[2][0]).toContain(
        "WHERE ssda_user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[2][1]).toEqual([1]);
      expect((ssdaPool.query as any).mock.calls[3][0]).toContain(
        "SELECT r.role"
      );
      expect((ssdaPool.query as any).mock.calls[3][0]).toContain(
        "WHERE user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[3][1]).toEqual([1]);

      // Expect the fith query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[4][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[4][0]).toContain(
        "WHERE username = $1"
      );
      expect((ssdaPool.query as any).mock.calls[4][1]).toEqual(["test"]);

      // Expect the sixth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[5][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[5][0]).toContain(
        "WHERE email = $1"
      );
      expect((ssdaPool.query as any).mock.calls[5][1]).toEqual([
        "test@gmail.com",
        "SSDA"
      ]);

      // Expect the seventh query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[6][0]).toContain(
        "UPDATE admin.ssda_user"
      );
      expect((ssdaPool.query as any).mock.calls[6][1]).toEqual([
        "New affiliation",
        "test@gmail.com",
        "New family name",
        "New given name",
        1
      ]);

      // Expect the eighth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[7][0]).toContain(
        " WHERE ssda_user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[7][1]).toEqual([1]);

      // Expect the ssdaPool client connection for transaction to have been called
      expect(client).toHaveBeenCalled();

      // Expect the ssdaPool client query to have been called 3 times
      expect(client().query).toHaveBeenCalledTimes(3);

      // Expect the ssdaPool client transaction to have began
      expect(client().query.mock.calls[0][0]).toContain("BEGIN");

      // Expect the ssdaPool client transaction query to
      // have been called with the correct sql query and the suplied params
      expect(client().query.mock.calls[1][0]).toContain(
        "UPDATE admin.ssda_user_auth"
      );
      expect(client().query.mock.calls[1][1]).toEqual([
        "test",
        "new-hashed-password",
        1
      ]);

      // Expect the ssdaPool client transaction to have been committed
      expect(client().query.mock.calls[2][0]).toContain("COMMIT");
    });

    it("should raise an error if the current password is wrong", async () => {
      // Mock the database querying
      // 1. & 2. Mocks get user by id of the currently logged in user to exist.
      (ssdaPool.query as any)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      // Mock the bcrypt password compare to return false.
      (bcrypt.compare as any).mockResolvedValueOnce(false);

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
      // 1. & 2. Mocks get user by id of the currently logged in user to exist.
      // 3. & 4. Mocks get user by id of the user to update to exist.
      // 5. Mocks the get user by email address to update with not to exist.
      (ssdaPool.query as any)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ email: "existing@email.address", id: 2 }]
        })
        .mockResolvedValueOnce({ rows: [] });

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockResolvedValueOnce(true);

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
      // 1. & 2. Mocks get user by id of the currently logged in user to exist.
      // 3. & 4. Mocks get user by id of the user to update to exist.
      // 5. & 6. Mocks get user by username to update with not to exist.
      (ssdaPool.query as any)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ username: "existingusername", id: 2 }]
        })
        .mockResolvedValueOnce({ rows: [] });

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockResolvedValueOnce(true);

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
      // 1. & 2. Mocks get user by id of the currently logged in user to exist.
      // 3. & 4. Mocks the get user by id of the user to update to exist.
      // 5. Mocks the get user by username to update with not to exist.
      // 6. Mocks the get user by email address to update with not to exist.
      // 7. & 8. Mocks the get user by id of the updated user to exist.
      (ssdaPool.query as any)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ role: "Admin" }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      // Mocks the database transaction
      // 1. Mocks client connection.
      // 2. Mocks begining of the client transaction.
      // 3. Mocks a select of the user id.
      // 4. Mocks an insert of the user details.
      // 5. Mocks a commit of the client transaction.
      // 6. Mocks a release of the client transaction.
      const client = (ssdaPool.connect as any).mockReturnValue({
        query: jest
          .fn()
          .mockImplementationOnce(() => "BEGIN")
          .mockImplementationOnce(
            () => "Update user in the SSDA user auth table"
          )
          .mockImplementationOnce(() => "COMMIT"),
        release: jest.fn().mockResolvedValueOnce("release connection")
      });

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockResolvedValueOnce(true);
      // Mock the bcrypt password hashing to hash the password.
      (bcrypt.hash as any).mockResolvedValueOnce("new-hashed-password");

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
      expect(ssdaPool.query).toHaveBeenCalledTimes(8);

      // Expect the first and second query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[0][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[0][0]).toContain(
        "WHERE ssda_user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[0][1]).toEqual([1]);
      expect((ssdaPool.query as any).mock.calls[1][0]).toContain(
        "SELECT r.role"
      );
      expect((ssdaPool.query as any).mock.calls[1][0]).toContain(
        "WHERE user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[1][1]).toEqual([1]);

      // Expect the third and forth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[2][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[2][0]).toContain(
        "WHERE ssda_user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[2][1]).toEqual([2]);
      expect((ssdaPool.query as any).mock.calls[3][0]).toContain(
        "SELECT r.role"
      );
      expect((ssdaPool.query as any).mock.calls[3][0]).toContain(
        "WHERE user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[3][1]).toEqual([2]);

      // Expect the fith query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[4][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[4][0]).toContain(
        "WHERE username = $1"
      );
      expect((ssdaPool.query as any).mock.calls[4][1]).toEqual([
        "newuniqueusername"
      ]);

      // Expect the sixth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[5][0]).toContain(
        "SELECT ssda_user_id AS id"
      );
      expect((ssdaPool.query as any).mock.calls[5][0]).toContain(
        "WHERE email = $1"
      );
      expect((ssdaPool.query as any).mock.calls[5][1]).toEqual([
        "new@unique.email",
        "SSDA"
      ]);

      // Expect the seventh query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[6][0]).toContain(
        "UPDATE admin.ssda_user"
      );
      expect((ssdaPool.query as any).mock.calls[6][1]).toEqual([
        "New affiliation",
        "new@unique.email",
        "New family name",
        "New given name",
        2
      ]);

      // Expect the eighth query to have been called
      // with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[7][0]).toContain(
        "WHERE ssda_user_id = $1"
      );
      expect((ssdaPool.query as any).mock.calls[7][1]).toEqual([2]);

      // Expect the ssdaPool client connection for transaction to have been called
      expect(client).toHaveBeenCalled();

      // Expect the ssdaPool client query to have been called 3 times
      expect(client().query).toHaveBeenCalledTimes(3);

      // Expect the ssdaPool client transaction to have began
      expect(client().query.mock.calls[0][0]).toContain("BEGIN");

      // Expect the ssdaPool client transaction query to
      // have been called with the correct sql query and the suplied params
      expect(client().query.mock.calls[1][0]).toContain(
        "UPDATE admin.ssda_user_auth"
      );
      expect(client().query.mock.calls[1][1]).toEqual([
        "newuniqueusername",
        "new-hashed-password",
        2
      ]);

      // Expect the ssdaPool client transaction to have been committed
      expect(client().query.mock.calls[2][0]).toContain("COMMIT");
    });

    it("should throw an error if the user does not exist", async () => {
      // Mock the database querying
      // 1. & 2. Mocks the get admin user by id of the currently logged in user to exist.
      // 3. Mocks the get user by id of the user to update to not exist.
      (ssdaPool.query as any)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ role: "Admin" }] })
        .mockResolvedValueOnce({ rows: [] });

      // Mock the bcrypt password compare to return true.
      (bcrypt.compare as any).mockResolvedValueOnce(true);

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
