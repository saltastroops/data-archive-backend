jest.mock("../db/pool.ts");
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

afterEach(() => {
  // Cleaning up
  (ssdaAdminPool.query as any).mockReset();
  (ssdaAdminPool.getConnection as any).mockReset();
});

describe("/downloads/data-requests/:dataRequestId/:filename", () => {
  it("should download the requested data file if the user owns it", async () => {
    // Mock the database querying
    // 1. & 2. Mocks the get user by username of the user to authenticate.
    // 3. & 4. Mocks the get user by id when deserializing.
    // 5. & 6. Mocks get user by id for the logged in normal user.
    // 5. Mocks querying of the data request with existing uri.
    (ssdaAdminPool.query as any)
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([
        [{ userId: 1, uri: "./src/__tests__/data/data-file-request.zip" }]
      ]);

    // Mock the bcrypt password compare to return true.
    (bcrypt.compare as any).mockReturnValue(true);

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test", "SSDA");

    const response = await agent.get(
      "/downloads/data-requests/1/data-file-request.zip"
    );

    // Expect that all went well
    expect(response.status).toEqual(200);

    // Expect the content type of the downloaded file to be application/zip
    expect(response.header["content-type"]).toEqual("application/zip");

    // Expect the disposition to use "data-file-request.zip" as filename
    expect(response.header["content-disposition"]).toContain(
      "data-file-request.zip"
    );

    // Expect that the correct file content has been returned
    expect(response.text).toEqual("This pretends to be a zip file.");
  });

  it("should download the requested data file if the user is an admin", async () => {
    // Mock the database querying
    // 1. & 2. Mocks the get user by username of the user to authenticate.
    // 3. & 4. Mocks the get user by id when deserializing.
    // 5. & 6. Mocks get user by id for the logged in an admin user.
    // 5. Mocks querying of the data request with existing uri.
    (ssdaAdminPool.query as any)
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[{ role: "ADMIN" }]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[{ role: "ADMIN" }]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[{ role: "ADMIN" }]])
      .mockReturnValueOnce([
        [{ userId: 2, uri: "./src/__tests__/data/data-file-request.zip" }]
      ]);

    // Mock the bcrypt password compare to return true.
    (bcrypt.compare as any).mockReturnValue(true);

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test", "SSDA");

    const response = await agent.get(
      "/downloads/data-requests/1/data-file-request.zip"
    );

    // Expect that all went well
    expect(response.status).toEqual(200);

    // Expect the content type of the downloaded file to be application/zip
    expect(response.header["content-type"]).toEqual("application/zip");

    // Expect the disposition to use "data-file-request.zip" as filename
    expect(response.header["content-disposition"]).toContain(
      "data-file-request.zip"
    );

    // Expect that the correct file content has been returned
    expect(response.text).toEqual("This pretends to be a zip file.");
  });

  it("should return a Not Found error if the requested data file no longer exists", async () => {
    // Mock the database querying
    // 1. & 2. Mocks the get user by username of the user to authenticate.
    // 3. & 4. Mocks the get user by id when deserializing.
    // 5. & 6. Mocks get user by id for the logged user.
    // 5. Mocks querying of the data request with no longer existing uri.
    (ssdaAdminPool.query as any)
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([
        [{ userId: 1, uri: "path/to/no-longer-existing/data-request" }]
      ]);

    // Mock the bcrypt password compare to return true.
    (bcrypt.compare as any).mockReturnValue(true);

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test", "SSDA");

    const response = await agent.get("/downloads/data-requests/1/filename.zip");

    // Expect the Not Found status code
    expect(response.status).toEqual(404);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain("does not exist");
  });

  it("should return a Forbidden error if the user may not download the file", async () => {
    // Mock the database querying
    // 1. & 2. Mocks the get user by username of the user to authenticate.
    // 3. & 4. Mocks the get user by id when deserializing.
    // 5. & 6. Mocks get user by id for the logged user.
    // 5. Mocks querying of the data request for a different user than the one who is logged in.
    (ssdaAdminPool.query as any)
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([
        [{ userId: 2, uri: "./src/__tests__/data/data-file-request.zip" }]
      ]);

    // Mock the bcrypt password compare to return true.
    (bcrypt.compare as any).mockReturnValue(true);

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test", "SSDA");

    const response = await agent.get(
      "/downloads/data-requests/requested-data-file-id/filename.zip"
    );

    // Expect the Forbidden status code
    expect(response.status).toEqual(403);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain(
      "not allowed to download the requested file"
    );
  });

  it("should return a Not Found error if the data request does not exist", async () => {
    // Mock the database querying
    // 1. & 2. Mocks the get user by username of the user to authenticate.
    // 3. & 4. Mocks the get user by id when deserializing.
    // 5. & 6. Mocks get user by id for the logged user.
    // 5. Mocks querying of the data request not to exist.
    (ssdaAdminPool.query as any)
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[{ id: 1 }]])
      .mockReturnValueOnce([[]])
      .mockReturnValueOnce([[]]);

    // Mock the bcrypt password compare to return true.
    (bcrypt.compare as any).mockReturnValue(true);

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test", "SSDA");

    const response = await agent.get("/downloads/data-requests/1/filename.zip");

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(404);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain("does not exist");
  });

  it("should return an Unauthorized error if the user is not logged in", async () => {
    const server = (await createServer()).createHttpServer({});

    const unauthenticatedAgent = request.agent(server);

    const response = await unauthenticatedAgent.get(
      "/downloads/data-requests/1/filename.zip"
    );

    // Expect the Unauthorized status code
    expect(response.status).toEqual(401);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain("must be logged in");
  });
});
