jest.mock("../generated/prisma-client");

import bcrypt from "bcrypt";
import request from "supertest";
import createServer from "../createServer";
import { prisma, UserWhereInput } from "../generated/prisma-client";

beforeAll(() => {
  interface IUserCreateInput {
    familyName: string;
    givenName: string;
    username: string;
    email: string;
    affiliation: string;
    password: string;
  }

  // Mocking the user query
  (prisma.user as any).mockImplementation(async (where: UserWhereInput) => {
    if (where.username === "test" || where.email === "test@gmail.com") {
      return {
        affiliation: "Test Affiliation",
        email: "test@gmail.com",
        familyName: "Test",
        givenName: "Test",
        id: "1",
        password: await bcrypt.hash("test", 10),
        username: "test"
      };
    }
  });

  // Mocking the createUser mutation
  (prisma.createUser as any).mockImplementation(
    async (data: IUserCreateInput) => ({
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
    const server = (await createServer()).createHttpServer({});
    const agent = request.agent(server);

    // Registering user
    const response = await agent.post("/").send({
      query: `
          mutation{
            signup(
              familyName: "Test1"
              givenName: "Test1"
              username: "test1"
              email: "test1@gmail.com"
              affiliation: "Test1 Affiliation"
              password: "test1"
            ){ 
              id
              givenName
            }
          } 
        `
    });

    // Expect the user to be registered.
    expect(JSON.parse(response.text).data.signup.givenName).toBe("Test1");

    // Expect the user to be assigned a unique ID when registered.
    expect(JSON.parse(response.text).data.signup.id).toBe("test110111");
  });
});

describe("User not registered", () => {
  it("should not register the user with an exixting username", async () => {
    const server = (await createServer()).createHttpServer({});
    const agent = request.agent(server);

    // Registering user
    const response = await agent.post("/").send({
      query: `
          mutation{
            signup(
              familyName: "Test2"
              givenName: "Test2"
              username: "test"
              email: "test2@gmail.com"
              affiliation: "Test2 Affiliation"
              password: "test2"
            ){ 
              id
              givenName
            }
          } 
        `
    });

    // Expect the error message to be meaningful.
    expect(response.text).toContain("test");
    expect(response.text).toContain("exists");
  });

  it("should not register the user with an existing email address", async () => {
    const server = (await createServer()).createHttpServer({});
    const agent = request.agent(server);

    // Registering user
    const response = await agent.post("/").send({
      query: `
          mutation{
            signup(
              familyName: "Test3"
              givenName: "Test3"
              username: "test3"
              email: "test@gmail.com"
              affiliation: "Test3 Affiliation"
              password: "test3"
            ){ 
              id
              givenName
            }
          } 
        `
    });

    // Expect the error message to be meaningful.
    expect(response.text).toContain("test@gmail.com");
    expect(response.text).toContain("exists");
  });
});
