jest.mock("../generated/prisma-client");

import bcrypt from "bcrypt";
import { prisma, UserWhereInput } from "../generated/prisma-client";
import { resolvers } from "../resolvers";

beforeAll(() => {
  // Mocking the user query
  (prisma.user as any).mockImplementation(async (where: UserWhereInput) => {
    if (where.username === "test" || where.email === "test@gmail.com") {
      return {
        affiliation: "Test Affiliation",
        email: "test@gmail.com",
        familyName: "Test",
        givenName: "Test",
        id: "1",
        password: await bcrypt.hash("testpassword", 10),
        roles: [],
        username: "test"
      };
    }
  });

  // Mocking the createUser mutation
  (prisma.createUser as any).mockImplementation(
    async (data: UserWhereInput) => ({
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
  (prisma.user as any).mockReset();
  (prisma.createUser as any).mockReset();
});

describe("User registered", () => {
  it("should register the user successfuly", async () => {
    // User signing up with valid information.
    const args = {
      affiliation: "Test1 Affiliation",
      email: "test1@gmail.com",
      familyName: "Test1",
      givenName: "Test1",
      password: "testpassword",
      username: "test1"
    };

    const response = await resolvers.Mutation.signup({}, args, {
      prisma,
      user: { id: "" }
    });

    // Expect the user to be registered.
    expect(response.givenName).toBe("Test1");

    // Expect the user to be assigned a unique ID when registered.
    expect(response.id).toBe("test110111");
  });
});

describe("User not registered", () => {
  it("should not register the user submitted a username containing an uppercase character", async () => {
    // User signing up with a username that contains an uppercased character(s).
    const args = {
      affiliation: "Test2 Affiliation",
      email: "test2@gmail.com",
      familyName: "Test2",
      givenName: "Test2",
      password: "test2",
      username: "tesT2"
    };

    const response = await resolvers.Mutation.signup({}, args, {
      prisma,
      user: { id: "" }
    });

    // Expect the error message to be meaningful.
    expect(response.message).toContain("tesT2");
  });

  it("should not register the user with an existing username", async () => {
    // User signing up with a username that already exists.
    const args = {
      affiliation: "Test3 Affiliation",
      email: "test3@gmail.com",
      familyName: "Test3",
      givenName: "Test3",
      password: "test3",
      username: "test"
    };

    const response = await resolvers.Mutation.signup({}, args, {
      prisma,
      user: { id: "" }
    });

    // Expect the error message to be meaningful.
    expect(response.message).toContain("test");
    expect(response.message).toContain("exists");
  });

  it("should not register the user with an existing email address", async () => {
    // User signing up with an email address that already exists.
    const args = {
      affiliation: "Test4 Affiliation",
      email: "test@gmail.com",
      familyName: "Test4",
      givenName: "Test4",
      password: "test4",
      username: "test4"
    };

    const response = await resolvers.Mutation.signup({}, args, {
      prisma,
      user: { id: "" }
    });

    // Expect the error message to be meaningful.
    expect(response.message).toContain("test@gmail.com");
    expect(response.message).toContain("exists");
  });

  it("should not register the user submitted a password with less than 6 characters", async () => {
    // User signing up with the password less than 6 characters.
    const args = {
      affiliation: "Test5 Affiliation",
      email: "test5@gmail.com",
      familyName: "Test5",
      givenName: "Test5",
      password: "test5",
      username: "test5"
    };

    const response = await resolvers.Mutation.signup({}, args, {
      prisma,
      user: { id: "" }
    });

    // Expect the error message to be meaningful.
    expect(response.message).toContain("6 characters long");
  });
});
