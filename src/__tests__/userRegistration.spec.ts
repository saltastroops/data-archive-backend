jest.mock("../generated/prisma-client");

import bcrypt from "bcrypt";
import {
  prisma,
  UserCreateInput,
  UserWhereUniqueInput
} from "../generated/prisma-client";
import { resolvers } from "../resolvers";

beforeAll(() => {
  // Mocking the createUser mutation
  (prisma.createUser as any).mockImplementation((data: UserCreateInput) =>
    Promise.resolve({
      affiliation: data.affiliation,
      email: data.email,
      familyName: data.familyName,
      givenName: data.familyName,
      id: `${data.username}10111`,
      password: data.password,
      username: data.username
    })
  );
});

afterAll(() => {
  // Cleaning up
  (prisma.users as any).mockReset();
  (prisma.createUser as any).mockReset();
});

describe("User registration", () => {
  afterEach(() => {
    // Cleaning up
    (prisma.users as any).mockReset();
  });

  it("should register the user successfully", async () => {
    // User signing up with valid information.
    const args = {
      affiliation: "Test1 Affiliation",
      email: "test1@gmail.com",
      familyName: "Test1",
      givenName: "Test1",
      password: "testpassword",
      username: "test1"
    };

    // Mock the users query. For the first two calls an empty array is returned
    // (the user does not exist yet), for the third call an array with the new
    // user is returned.
    (prisma.users as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          affiliation: "Test Affiliation",
          email: "test@gmail.com",
          familyName: "Test",
          givenName: "Test",
          id: "1",
          password: "hashedpassword",
          roles: [],
          username: "test"
        }
      ]);

    // Register the user
    await resolvers.Mutation.signup({}, args, {
      prisma,
      user: { id: "" }
    });

    // Expect createUser to have been called
    expect(prisma.createUser).toHaveBeenCalled();

    // createUser should have been called with the submitted arguments, but
    // the password shou,d have been hashed. So for comparison purposes we
    // need the arguments without the password.
    const argumentsWithoutPassword = { ...args };
    delete argumentsWithoutPassword.password;

    const storedDataWithoutPassword = {
      ...(prisma.createUser as any).mock.calls[0][0]
    };
    delete storedDataWithoutPassword.password;

    // Expect the submitted user information to have been stored in the
    // database.
    expect(storedDataWithoutPassword).toEqual(argumentsWithoutPassword);

    // Expect the submitted user password stored in the database to have been
    // hashed.
    expect((prisma.createUser as any).mock.calls[0][0].password).not.toBe(
      args.password
    );
  });

  it("should not register the user with a username containing an upper case character", async () => {
    // User signing up with a username that contains an upper case character
    const args = {
      affiliation: "Test2 Affiliation",
      email: "test2@gmail.com",
      familyName: "Test2",
      givenName: "Test2",
      password: "test2",
      username: "tesT2"
    };

    // Mock the users query with an empty array (the user does not exist yet)
    (prisma.users as any).mockResolvedValue([]);

    // Expect signing up to fail with the appropriate error
    let message = "";
    try {
      await resolvers.Mutation.signup({}, args, {
        prisma,
        user: { id: "" }
      });
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain("tesT2");
  });

  it("should not register a user with an existing username", async () => {
    // User signing up with a username that already exists
    const args = {
      affiliation: "Test3 Affiliation",
      email: "test3@gmail.com",
      familyName: "Test3",
      givenName: "Test3",
      password: "test3",
      username: "existingusername"
    };

    // Mock the users query. A non-empty array is returned (the user exists
    // already).
    (prisma.users as any).mockResolvedValue([{ id: "42" }]);

    // Expect signing up to fail with the appropriate error.
    let message = "";
    try {
      await resolvers.Mutation.signup({}, args, {
        prisma,
        user: { id: "" }
      });
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain("exists");
    expect(message).toContain("existingusername");
  });

  it("should not register a user with an existing email address", async () => {
    // User signing up with an email address that already exists
    const args = {
      affiliation: "Test4 Affiliation",
      email: "existing@gmail.com",
      familyName: "Test4",
      givenName: "Test4",
      password: "test4",
      username: "test4"
    };

    // Mock the users query. The first call returns an empty array (there is no
    // user with the given username yet), the second call returns a non-empty
    // array (there exists a user with the email address already).
    (prisma.users as any)
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: 7 }]);

    // Expect signing up to fail with the appropriate error.
    let message = null;
    try {
      await resolvers.Mutation.signup({}, args, {
        prisma,
        user: { id: "" }
      });
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain("exists");
    expect(message).toContain("existing@gmail.com");
  });

  it("should not register the user with a password shorter than 7 characters", async () => {
    // User signing up with the password less than 6 characters.
    const args = {
      affiliation: "Test5 Affiliation",
      email: "test5@gmail.com",
      familyName: "Test5",
      givenName: "Test5",
      password: "test5",
      username: "test5"
    };

    // Mock the users query with an empty array (the user does not exist yet)
    (prisma.users as any).mockResolvedValue([]);

    // Expect signing up to fail with the appropriate error.
    let message = "";
    try {
      await resolvers.Mutation.signup({}, args, {
        prisma,
        user: { id: "" }
      });
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain("at least 7 characters long");
  });
});
