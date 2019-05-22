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

afterAll(() => {
  // Cleaning up
  (prisma.user as any).mockReset();
  (prisma.dataRequest as any).mockReset();
});

describe("/downloads/data-requests/:dataRequestId/:filename", () => {
  it("should download the requested data file if the user owns it", async () => {
    // Mock the user query for the user, who is not an admin
    (prisma.user as any).mockImplementation(async () => ({
      affiliation: "Test Affiliation",
      email: "test@gmail.com",
      familyName: "Test",
      givenName: "Test",
      id: "1",
      password: await bcrypt.hash("test", 10),
      roles: [],
      username: "test"
    }));

    // Mock the query for the data request, which is owned by the logged in
    // user.
    // The URI points to an existing file in the test folder. Despite its
    // extension, this file is not a zip file but contains an ASCII text string.
    // ./downloads/data-requests/1/data-file-request.zip
    (prisma.dataRequest as any).mockReturnValue({
      $fragment: async () => ({
        uri: "./src/__tests__/data/data-file-request.zip",
        user: {
          id: "1"
        }
      })
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

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
    // Mock the query for the user, who is an admin
    (prisma.user as any).mockImplementation(async () => ({
      affiliation: "Test Affiliation",
      email: "test@gmail.com",
      familyName: "Test",
      givenName: "Test",
      id: "1",
      password: await bcrypt.hash("test", 10),
      roles: ["ADMIN"],
      username: "test"
    }));

    // Mock the query for the data request, which is owned by the logged in
    // user.
    // The URI points to an existing file in the test folder. Despite its
    // extension, this file is not a zip file but contains an ASCII text string.
    // ./downloads/data-requests/1/data-file-request.zip
    (prisma.dataRequest as any).mockReturnValue({
      $fragment: async () => ({
        uri: "./src/__tests__/data/data-file-request.zip",
        user: {
          id: "2"
        }
      })
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

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
    // Mock the query for the user, who is not an admin
    (prisma.user as any).mockImplementation(async () => ({
      affiliation: "Test Affiliation",
      email: "test@gmail.com",
      familyName: "Test",
      givenName: "Test",
      id: "1",
      password: await bcrypt.hash("test", 10),
      roles: [],
      username: "test"
    }));

    // Mock the query for the data request, which is owned by the logged in user
    (prisma.dataRequest as any).mockReturnValue({
      $fragment: async () => ({
        uri: "path/to/no-longer-existing/data-request",
        user: {
          id: "1"
        }
      })
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get("/downloads/data-requests/1/filename.zip");

    // Expect the Not Found status code
    expect(response.status).toEqual(404);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain("does not exist");
  });

  it("should return a Forbidden error if the user may not download the file", async () => {
    // Mock the query for the user, who is not an admin
    (prisma.user as any).mockImplementation(async () => ({
      affiliation: "Test Affiliation",
      email: "test@gmail.com",
      familyName: "Test",
      givenName: "Test",
      id: "1",
      password: await bcrypt.hash("test", 10),
      roles: [],
      username: "test"
    }));

    // Mock the query for the data request, which is not owned by the logged in
    // user
    (prisma.dataRequest as any).mockReturnValue({
      $fragment: async () => ({
        user: {
          id: "2"
        }
      })
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

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
    // Mocking the data request that does not exist
    (prisma.dataRequest as any).mockReturnValue({
      $fragment: async () => null
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

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

describe("/downloads/data-requests/:dataRequestId/:dataRequestPartId/:filename", () => {
  it("should download the requested data file if the user owns it", async () => {
    // Mock the query for the user, who is not an admin
    (prisma.user as any).mockImplementation(async () => ({
      affiliation: "Test Affiliation",
      email: "test@gmail.com",
      familyName: "Test",
      givenName: "Test",
      id: "1",
      password: await bcrypt.hash("test", 10),
      roles: [],
      username: "test"
    }));

    // Mock the query for the data request, which is owned by the logged in
    // user.
    // The URI points to an existing file in the test folder. Despite its
    // extension, this file is not a zip file but contains an ASCII text string.
    (prisma.dataRequest as any).mockReturnValue({
      $fragment: async () => ({
        parts: [
          {
            id: "1",
            uri: "./src/__tests__/data/data-file-request.zip"
          }
        ],
        user: {
          id: "1"
        }
      })
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/1/part-data-file-request.zip"
    );

    // Expect that all went well
    expect(response.status).toEqual(200);

    // Expect the content type of the downloaded file to be zip file
    expect(response.header["content-type"]).toEqual("application/zip");

    // Expect the disposition to use "data-file-request.zip" as filename
    expect(response.header["content-disposition"]).toContain(
      "part-data-file-request.zip"
    );

    // Expect that the correct file content has been returned
    expect(response.text).toEqual("This pretends to be a zip file.");
  });

  it("should download the requested data file if the user is an admin", async () => {
    // Mock the query for the user, who is an admin
    (prisma.user as any).mockImplementation(async () => ({
      affiliation: "Test Affiliation",
      email: "test@gmail.com",
      familyName: "Test",
      givenName: "Test",
      id: "1",
      password: await bcrypt.hash("test", 10),
      roles: ["ADMIN"],
      username: "test"
    }));

    // Mock the query for the data request, which is owned by the logged in
    // user.
    // The URI points to an existing file in the test folder. Despite its
    // extension, this file is not a zip file but contains an ASCII text string.
    (prisma.dataRequest as any).mockReturnValue({
      $fragment: async () => ({
        parts: [
          {
            id: "1",
            uri: "./src/__tests__/data/data-file-request.zip"
          }
        ],
        user: {
          id: "2"
        }
      })
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/1/part-data-file-request.zip"
    );

    // Expect that all went well
    expect(response.status).toEqual(200);

    // Expect the content type of the downloaded file to be zip file
    expect(response.header["content-type"]).toEqual("application/zip");

    // Expect the disposition to use "data-file-request.zip" as filename
    expect(response.header["content-disposition"]).toContain(
      "part-data-file-request.zip"
    );

    // Expect that the correct file content has been returned
    expect(response.text).toEqual("This pretends to be a zip file.");
  });

  it("should return a Not Found error if the requested data file no longer exists", async () => {
    // Mock the query for the user, who is not an admin
    (prisma.user as any).mockImplementation(async () => ({
      affiliation: "Test Affiliation",
      email: "test@gmail.com",
      familyName: "Test",
      givenName: "Test",
      id: "1",
      password: await bcrypt.hash("test", 10),
      roles: [],
      username: "test"
    }));

    // Mock the query for the data request, which is owned by the logged in user
    (prisma.dataRequest as any).mockReturnValue({
      $fragment: async () => ({
        parts: [
          {
            id: "1",
            uri: "path/to/no-longer-existing/part-data-request"
          }
        ],
        user: {
          id: "1"
        }
      })
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/1/filename.zip"
    );

    // Expect the Not Found status code
    expect(response.status).toEqual(404);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain("does not exist");
  });

  it("should return a Forbidden error if the user may not download the file", async () => {
    // Mock the query for the user, who is not an admin
    (prisma.user as any).mockImplementation(async () => ({
      affiliation: "Test Affiliation",
      email: "test@gmail.com",
      familyName: "Test",
      givenName: "Test",
      id: "1",
      password: await bcrypt.hash("test", 10),
      roles: [],
      username: "test"
    }));

    // Mock the query for the data request, which is not owned by the logged in
    // user
    (prisma.dataRequest as any).mockReturnValue({
      $fragment: async () => ({
        user: {
          id: "2"
        }
      })
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/1/filename.zip"
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
    // Mock the query for the data request, which does not exist
    (prisma.dataRequest as any).mockReturnValue({
      $fragment: async () => null
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/1/filename.zip"
    );

    // Expect the Not Found status code
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
      "/downloads/data-requests/1/1/filename.zip"
    );

    // Expect the Unauthorized status code
    expect(response.status).toEqual(401);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain("must be logged in");
  });
});
