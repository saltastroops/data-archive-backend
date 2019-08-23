jest.mock("../db/pool.ts");
jest.mock("uuid");
jest.mock("bcrypt");

import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { ssdaAdminPool } from "../db/pool";
import { resolvers } from "../resolvers";

afterEach(() => {
  // Cleaning up
  (ssdaAdminPool.query as any).mockReset();
  (ssdaAdminPool.getConnection as any).mockReset();
});

describe("User registration", () => {
  it("should register the user successfully", async () => {
    // Mock the database querying
    // 1. Mocks the get user by email address to register with not to exist.
    // 2. Mocks the get user by username to register with not to exist.
    // 3. Mocks the auth provider used to register.
    // 4. Mocks the creation of the new user entry.
    // 5. Mocks the get user by username of the newly created user to exist.
    (ssdaAdminPool.query as any)
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ authProviderId: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([
        [
          {
            affiliation: "Test1 Affiliation",
            authProvider: "SSDA",
            authProviderUserId: 1,
            email: "test1@gmail.com",
            familyName: "Test1",
            givenName: "Test1",
            id: 1,
            password: "testpassword",
            roles: [],
            username: "test1"
          }
        ]
      ]);

    // Mocks the database transaction
    // 1. Mocks database connection.
    // 2. Mocks begining of the transaction.
    // 3. Mocks the inserting of the user details.
    // 4. Mocks the selection of the user.
    // 5. Mocks the inserting ot the user credentials.
    // 6. Mocks the transaction commit.
    // 7. Mocks the transaction roll back.
    // 8. Mocks the connection release.
    const connection = (ssdaAdminPool.getConnection as any).mockReturnValue({
      beginTransaction: jest.fn().mockReturnValueOnce("begin transaction"),
      commit: jest.fn().mockReturnValueOnce("commit"),
      query: jest
        .fn()
        .mockImplementationOnce(() => "Inser user details to the User table")
        .mockImplementationOnce(() => [[{ userId: 1 }]])
        .mockImplementationOnce(
          () => "Insert user to auth to the SSDA auth database"
        ),
      release: jest.fn().mockReturnValueOnce("release connection"),
      rollback: jest.fn().mockReturnValueOnce("rool back")
    });

    // Mocks the UUID
    (uuid as any).mockReturnValue("test1-uuid");

    // Mock the bcrypt password hashing to hash the password.
    (bcrypt.hash as any).mockReturnValue("hashed-password");

    // User signing up with valid information.
    const args = {
      affiliation: "Test1 Affiliation",
      email: "test1@gmail.com",
      familyName: "Test1",
      givenName: "Test1",
      password: "testpassword",
      username: "test1"
    };

    try {
      // Register the user
      await resolvers.Mutation.signup({}, args, {});

      // Expect ssdaAdminPool query to have been called 4 times
      expect(ssdaAdminPool.query).toHaveBeenCalledTimes(4);

      // Expect the first ssdaAdminPool query to
      // have been called with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[0][0]).toContain(
        "WHERE u.email = ? AND ap.authProvider = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[0][1]).toEqual([
        "test1@gmail.com",
        "SSDA"
      ]);

      // Expect the second ssdaAdminPool query to
      // have been called with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[1][0]).toContain(
        "WHERE ua.username = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[1][1]).toEqual(["test1"]);

      // Expect the third ssdaAdminPool query to
      // have been called with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[2][0]).toContain(
        "WHERE authProvider = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[2][1]).toEqual(["SSDA"]);

      // Expect the fourth ssdaAdminPool query to
      // have been called with the correct sql query and the suplied params
      expect((ssdaAdminPool.query as any).mock.calls[3][0]).toContain(
        "WHERE ua.username = ?"
      );
      expect((ssdaAdminPool.query as any).mock.calls[3][1]).toEqual(["test1"]);

      // Expect the ssdaAdmin getConnection to have been called
      expect(connection).toHaveBeenCalled();

      // Expect the ssdaAdmin beginTransaction to have been called
      expect(connection().beginTransaction).toHaveBeenCalled();

      // Expect the ssdaAdmin getConnection query to have been called 3 times
      expect(connection().query).toHaveBeenCalledTimes(3);

      // Expect the first ssdaAdmin getConnection query to
      // have been called with the correct sql query and the suplied params
      expect(connection().query.mock.calls[0][0]).toContain("INSERT INTO User");
      expect(connection().query.mock.calls[0][1]).toEqual([
        "Test1 Affiliation",
        "test1@gmail.com",
        "Test1",
        "Test1",
        1,
        "test1-uuid"
      ]);

      // Expect the second ssdaAdmin getConnection query to
      // have been called with the correct sql query and the suplied params
      expect(connection().query.mock.calls[1][0]).toContain("WHERE email = ?");
      expect(connection().query.mock.calls[1][1]).toEqual(["test1@gmail.com"]);

      // Expect the third ssdaAdmin getConnection query to
      // have been called with the correct sql query and the suplied params
      expect(connection().query.mock.calls[2][0]).toContain(
        "INSERT INTO SSDAUserAuth"
      );
      expect(connection().query.mock.calls[2][1]).toEqual([
        1,
        "test1",
        "hashed-password"
      ]);

      // Expect commit to have been called
      expect(connection().commit).toHaveBeenCalled();
    } finally {
      expect(connection().release).toHaveBeenCalled();
    }
  });

  it("should not register the user with an empty username", async () => {
    // Mock the database querying
    // 1. Mocks the get user by email address to register with not to exist.
    (ssdaAdminPool.query as any).mockReturnValueOnce([[]]);

    // User signing up with an empty username
    const args = {
      affiliation: "Test2 Affiliation",
      email: "test2@gmail.com",
      familyName: "Test2",
      givenName: "Test2",
      password: "test2password",
      username: ""
    };

    // Expect signing up to fail with the appropriate error
    try {
      await resolvers.Mutation.signup({}, args, {});
    } catch (e) {
      expect(e.message).toContain("empty");
    }
  });

  it("should not register the user with a username containing an upper case character", async () => {
    // Mock the database querying
    // 1. Mocks the get user by email address to register with not to exist.
    (ssdaAdminPool.query as any).mockReturnValueOnce([[]]);

    // User signing up with a username that contains an upper case character
    const args = {
      affiliation: "Test3 Affiliation",
      email: "test3@gmail.com",
      familyName: "Test3",
      givenName: "Test3",
      password: "test3password",
      username: "tesT3"
    };

    // Expect signing up to fail with the appropriate error
    try {
      await resolvers.Mutation.signup({}, args, {});
    } catch (e) {
      expect(e.message).toContain("tesT3");
    }
  });

  it("should not register a user with an existing username", async () => {
    // Mock the database querying
    // 1. Mocks the get user by email address to register with not to exist.
    // 2. & 3. Mocks get use by username to already exists
    (ssdaAdminPool.query as any)
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 42 }]])
      .mockReturnValueOnce([[]]);

    // User signing up with a username that already exists
    const args = {
      affiliation: "Test4 Affiliation",
      email: "test4@gmail.com",
      familyName: "Test4",
      givenName: "Test4",
      password: "test4password",
      username: "existingusername"
    };

    // Expect signing up to fail with the appropriate error.
    try {
      await resolvers.Mutation.signup({}, args, {});
    } catch (e) {
      expect(e.message).toContain("exists");
      expect(e.message).toContain("existingusername");
    }
  });

  it("should not register a user with an invalid email address", async () => {
    // User signing up with an invalid email address
    const args = {
      affiliation: "Test5 Affiliation",
      email: "invalidemail@gmail",
      familyName: "Test5",
      givenName: "Test5",
      password: "test5",
      username: "test5"
    };

    // Expect signing up to fail with the appropriate error
    try {
      await resolvers.Mutation.signup({}, args, {});
    } catch (e) {
      expect(e.message).toContain("invalid");
      expect(e.message).toContain("invalidemail");
    }
  });

  it("should not register a user with an existing email address", async () => {
    // Mock the database querying
    // 1. & 2. Mocks the get user by email address to register with to already exist.
    (ssdaAdminPool.query as any)
      .mockReturnValueOnce([[{ id: 42 }]])
      .mockReturnValueOnce([[]]);

    // User signing up with an email address that already exists
    const args = {
      affiliation: "Test6 Affiliation",
      email: "existing@gmail.com",
      familyName: "Test6",
      givenName: "Test6",
      password: "test6",
      username: "test6"
    };

    // Expect signing up to fail with the appropriate error.
    try {
      await resolvers.Mutation.signup({}, args, {});
    } catch (e) {
      expect(e.message).toContain("exists");
      expect(e.message).toContain("existing@gmail.com");
    }
  });

  it("should not register the user with a password shorter than 7 characters", async () => {
    // Mock the database querying
    // 1. Mocks the get user by email address to register with not to exist.
    (ssdaAdminPool.query as any).mockReturnValueOnce([[]]);

    // User signing up with the password less than 6 characters.
    const args = {
      affiliation: "Test7 Affiliation",
      email: "test7@gmail.com",
      familyName: "Test7",
      givenName: "Test7",
      password: "test7",
      username: "test7"
    };

    // Expect signing up to fail with the appropriate error.
    try {
      await resolvers.Mutation.signup({}, args, {});
    } catch (e) {
      expect(e.message).toContain("at least 7 characters long");
    }
  });
});
