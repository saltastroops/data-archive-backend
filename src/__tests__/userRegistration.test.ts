// tslint:disable-next-line:no-submodule-imports
import * as iconv from "mysql2/node_modules/iconv-lite";
iconv.encodingExists("cesu8");

jest.mock("../db/postgresql_pool.ts");
jest.mock("uuid");
jest.mock("bcrypt");

import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { ssdaPool } from "../db/postgresql_pool";
import { resolvers } from "../resolvers";

afterEach(() => {
  // Cleaning up
  (ssdaPool.query as any).mockReset();
  (ssdaPool.connect as any).mockReset();
});

describe("User registration", () => {
  it("should register the user successfully", async () => {
    // Mock the database querying
    // 1. Mocks get user by email address to register with not to exist.
    // 2. Mocks get user by username to register with not to exist.
    // 3. Mocks get auth provider used to register.
    // 4. Mocks get user by username of the newly created user to exist.
    // 5. Mocks get user roles of the newly created user to be empty.
    (ssdaPool.query as any)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ auth_provider_id: 1 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            affiliation: "Test1 Affiliation",
            authProvider: "SSDA",
            authProviderUserId: 1,
            email: "test1@gmail.com",
            familyName: "Test1",
            givenName: "Test1",
            id: 1,
            password: "testpassword",
            username: "test1"
          }
        ]
      })
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
        .mockImplementationOnce(() => ({ rows: [{ ssda_user_id: 1 }] }))
        .mockImplementationOnce(
          () => "Insert user to auth to the SSDA auth database"
        )
        .mockImplementationOnce(() => "COMMIT"),
      release: jest.fn().mockReturnValueOnce("release connection")
    });

    // Mocks the UUID
    (uuid as any).mockReturnValueOnce("test1-uuid");

    // Mock the bcrypt password hashing to hash the password.
    (bcrypt.hash as any).mockResolvedValueOnce("hashed-password");

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
      await resolvers.Mutation.signup({}, args, {
        user: { id: "", authProvider: "SSDA" }
      });

      // Expect ssdaPool query to have been called 4 times
      expect(ssdaPool.query).toHaveBeenCalledTimes(5);

      // Expect the first ssdaPool query to
      // have been called with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[0][0]).toContain(
        "WHERE email = $1"
      );
      expect((ssdaPool.query as any).mock.calls[0][1]).toEqual([
        "test1@gmail.com",
        "SSDA"
      ]);

      // Expect the second ssdaPool query to
      // have been called with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[1][0]).toContain(
        "WHERE username = $1"
      );
      expect((ssdaPool.query as any).mock.calls[1][1]).toEqual(["test1"]);

      // Expect the third ssdaPool query to
      // have been called with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[2][0]).toContain(
        "WHERE auth_provider = $1"
      );
      expect((ssdaPool.query as any).mock.calls[2][1]).toEqual(["SSDA"]);

      // Expect the fourth ssdaPool query to
      // have been called with the correct sql query and the suplied params
      expect((ssdaPool.query as any).mock.calls[3][0]).toContain(
        "WHERE username = $1"
      );
      expect((ssdaPool.query as any).mock.calls[3][1]).toEqual(["test1"]);

      // Expect the ssdaPool client connection for transaction to have been called
      expect(client).toHaveBeenCalled();

      // Expect the ssdaPool client query to have been called 4 times
      expect(client().query).toHaveBeenCalledTimes(4);

      // Expect the ssdaPool client transaction to have began
      expect(client().query.mock.calls[0][0]).toContain("BEGIN");

      // Expect the first ssdaPool client transaction query to
      // have been called with the correct sql query and the suplied params
      expect(client().query.mock.calls[1][0]).toContain(
        "INSERT INTO admin.ssda_user"
      );
      expect(client().query.mock.calls[1][1]).toEqual([
        "Test1 Affiliation",
        "test1@gmail.com",
        "Test1",
        "Test1",
        1,
        "test1-uuid"
      ]);

      // Expect the second ssdaPool client transaction query to
      // have been called with the correct sql query and the suplied params
      expect(client().query.mock.calls[2][0]).toContain(
        "INSERT INTO admin.ssda_user_auth"
      );
      expect(client().query.mock.calls[2][1]).toEqual([
        1,
        "test1",
        "hashed-password"
      ]);

      // Expect the ssdaPool client transaction to have been committed
      expect(client().query.mock.calls[3][0]).toContain("COMMIT");
    } finally {
      // Expect ssdaPool client transaction to be released
      expect(client().release).toHaveBeenCalled();
    }
  });

  it("should not register the user with an empty username", async () => {
    // Mock the database querying
    // 1. Mocks get user by email address to register with not to exist.
    (ssdaPool.query as any).mockResolvedValueOnce({ rows: [] });

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
      await resolvers.Mutation.signup({}, args, {
        user: { id: "", authProvider: "SSDA" }
      });
    } catch (e) {
      expect(e.message).toContain("empty");
    }
  });

  it("should not register the user with a username containing an upper case character", async () => {
    // Mock the database querying
    // 1. Mocks the get user by email address to register with not to exist.
    (ssdaPool.query as any).mockResolvedValueOnce({ rows: [] });

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
      await resolvers.Mutation.signup({}, args, {
        user: { id: "", authProvider: "SSDA" }
      });
    } catch (e) {
      expect(e.message).toContain("tesT3");
    }
  });

  it("should not register a user with an existing username", async () => {
    // Mock the database querying
    // 1. Mocks get user by email address to register with not to exist.
    // 2. & 3. Mocks get use by username to already exists
    (ssdaPool.query as any)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: [] });

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
      await resolvers.Mutation.signup({}, args, {
        user: { id: "", authProvider: "SSDA" }
      });
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
      await resolvers.Mutation.signup({}, args, {
        user: { id: "", authProvider: "SSDA" }
      });
    } catch (e) {
      expect(e.message).toContain("invalid");
      expect(e.message).toContain("invalidemail");
    }
  });

  it("should not register a user with an existing email address", async () => {
    // Mock the database querying
    // 1. & 2. Mocks the get user by email address to register with to already exist.
    (ssdaPool.query as any)
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: [] });

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
      await resolvers.Mutation.signup({}, args, {
        user: { id: "", authProvider: "SSDA" }
      });
    } catch (e) {
      expect(e.message).toContain("exists");
      expect(e.message).toContain("existing@gmail.com");
    }
  });

  it("should not register the user with a password shorter than 7 characters", async () => {
    // Mock the database querying
    // 1. Mocks get user by email address to register with not to exist.
    (ssdaPool.query as any).mockResolvedValueOnce({ rows: [] });

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
      await resolvers.Mutation.signup({}, args, {
        user: { id: "", authProvider: "SSDA" }
      });
    } catch (e) {
      expect(e.message).toContain("at least 7 characters long");
    }
  });
});
