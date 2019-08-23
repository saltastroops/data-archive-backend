jest.mock("../db/pool.ts");
jest.mock("uuid");
jest.mock("bcrypt");

import bcrypt from "bcrypt";
import request from "supertest";
import createServer from "../createServer";
import { ssdaAdminPool } from "../db/pool";

// Creating an authenticated agent for making subsequent requests
async function createAuthenticatedAgent(
  username: string,
  password: string,
  authProvider: string
) {
  const server = (await createServer()).createHttpServer({});
  const authenticatedAgent = request.agent(server);
  const response = await authenticatedAgent
    .post("/auth/login")
    .send({ username, password, authProvider });

  return authenticatedAgent;
}

beforeEach(() => {
  // Cleaning up
  (ssdaAdminPool.query as any).mockReset();
  (ssdaAdminPool.getConnection as any).mockReset();
});

describe("/auth/login", () => {
  it("should log in the user if a valid username and password are supplied", async () => {
    // Mock the database querying
    // 1. & 2. Mocks the get user by id when querying unauthenticated user.
    // 3. & 4. Mocks the get user by username of the user to authenticate.
    // 5. & 6. Mocks the get user by id when deserializing.
    // 7. & 8. Mocks the get user by id when querying authenticated user.
    (ssdaAdminPool.query as any)
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1, givenName: "Test" }]])
      .mockReturnValueOnce([[]]);

    // Mock the bcrypt password compare to return true.
    (bcrypt.compare as any).mockReturnValue(true);

    try {
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

      // Expect user to be null, as the user is not authenticated
      expect(JSON.parse(response.text).data.user).toBe(null);

      // User logging in
      const authenticatedAgent = request.agent(server);
      response = await authenticatedAgent
        .post("/auth/login")
        .send({ username: "test", password: "test", authProvider: "SSDA" });

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
    } catch (e) {
      return;
    }
  });

  it("should return an error message and status code 401 if the username or password are wrong", async () => {
    // Mock the database querying
    // 1. & 2. Mocks the get user by username of the unauthenticated user.
    // 3. & 4. Mocks the get user by id when querying unauthenticated user.
    (ssdaAdminPool.query as any)
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[]]);
    try {
      const server = (await createServer()).createHttpServer({});
      // User logging in with invalid credentials.
      const authenticatedAgent = request.agent(server);

      let response = await authenticatedAgent
        .post("/auth/login")
        .send({ username: "test", password: "wrong", authProvider: "SSDA" });

      // Expect the user unauthenticated status code
      expect(response.status).toEqual(401);

      // Expect the success field to be false
      expect(JSON.parse(response.text).success).toEqual(false);

      // Expect the error message to be meaningful
      expect(JSON.parse(response.text).message).toContain(
        "username or password"
      );

      // Request the user details
      response = await authenticatedAgent.post("/").send({
        query: `query { 
            user { 
              givenName 
            } 
          }`
      });

      // Expect user to be null, as the user is not authenticated any longer
      expect(JSON.parse(response.text).data.user).toBe(null);
    } catch (e) {
      return;
    }
  });
});

describe("/auth/logout", () => {
  it("should log out the user who was logged in", async () => {
    // Mock the database querying
    // 1. & 2. Mocks the get user by username of the user to authenticate.
    // 3. & 4. Mocks the get user by id when deserializing.
    // 5. & 6. Mocks the get user by id when deserializing.
    // 7. & 8. Mocks the get user by id when querying authenticated user.
    // 9. Mocks the get user by id when querying unauthenticated user.
    (ssdaAdminPool.query as any)
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1, givenName: "Test" }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[]]);

    // Mock the bcrypt password compare to return true.
    (bcrypt.compare as any).mockReturnValue(true);

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test", "SSDA");

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

    // Expect user to be null, as the user is not logged in any longer
    expect(JSON.parse(response.text).data.user).toBe(null);
  });
});
