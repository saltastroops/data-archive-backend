jest.mock("../generated/prisma-client");

import bcrypt from "bcrypt";
import request from "supertest";
import createServer from "../createServer";
import { prisma } from "../generated/prisma-client";

// Creating an authenticated agent for making subsequent requests
async function createAuthenticatedAgent(username: string, password: string) {
  const server = (await createServer()).createHttpServer({});
  const authenticatedAgent = request.agent(server);
  const response = await authenticatedAgent
    .post("/auth/login")
    .send({ username, password });

  return authenticatedAgent;
}

beforeAll(() => {
  // Mocking the user query
  (prisma.user as any).mockImplementation(async () => ({
    affiliation: "Test Affiliation",
    email: "test@gmail.com",
    familyName: "Test",
    givenName: "Test",
    id: "1",
    password: await bcrypt.hash("test", 10),
    username: "test"
  }));
});

afterAll(() => {
  // Cleaning up
  (prisma.user as any).mockReset();
});

describe("/auth/login", () => {
  it("should log in the user if a valid username and password are supplied", async () => {
    const server = (await createServer()).createHttpServer({});

    // Request the user details
    let response = await request
      .agent(server)
      .post("/")
      .send({
        query: `query { 
          user { 
            givenName 
          } 
        }`
      });

    // Expect an error message, as the user is not authenticated
    expect(JSON.parse(response.text).errors.length).toBe(1);

    // User logging in
    const authenticatedAgent = request.agent(server);

    response = await authenticatedAgent
      .post("/auth/login")
      .send({ username: "test", password: "test" });

    // Expect the user to be authenticated
    expect(JSON.parse(response.text).success).toEqual(true);

    // Request the user details
    response = await authenticatedAgent.post("/").send({
      query: `query { 
          user { 
            givenName 
          } 
        }`
    });

    // Expect the request to have been successful
    expect(JSON.parse(response.text).data.user.givenName).toEqual("Test");
  });

  it("should return an error message and status code 401 if the username or password are wrong", async () => {
    const server = (await createServer()).createHttpServer({});
    // User logging in with invalid credentials.
    const authenticatedAgent = request.agent(server);

    let response = await authenticatedAgent
      .post("/auth/login")
      .send({ username: "test", password: "wrong" });

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(401);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain("username or password");

    // Request the user details
    response = await authenticatedAgent.post("/").send({
      query: `query { 
          user { 
            givenName 
          } 
        }`
    });

    // Expect an error message, as the user is not authenticated any longer
    expect(JSON.parse(response.text).errors.length).toBe(1);
  });
});

describe("/auth/logout", () => {
  it("should log out the user who was logged in", async () => {
    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    // Request the user details
    let response = await agent.post("/").send({
      query: `query { 
          user { 
            givenName 
          } 
        }`
    });

    // Expect the request to have been successful
    expect(JSON.parse(response.text).data.user.givenName).toEqual("Test");

    // Log out the user
    response = await agent.post("/auth/logout");

    // Expect the user has been logged out
    expect(JSON.parse(response.text).success).toEqual(true);

    // Request the user details
    response = await agent.post("/").send({
      query: `query { 
          user { 
            givenName 
          } 
        }`
    });

    // Expect an error message, as the user is not logged in any longer
    expect(JSON.parse(response.text).errors.length).toBe(1);
  });
});
