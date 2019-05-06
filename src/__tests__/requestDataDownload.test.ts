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
  it("should download the requested data file as an owner", async () => {
    // Mocking the user query of the user who is not an admin
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

    // Mocking the data request owned by the logged in user
    // Assuming the file is located in this directory
    // ./downloads/data-requests/1/data-file-request.zip
    (prisma.dataRequest as any).mockResolvedValueOnce({
      uri: "./downloads/data-requests/1/data-file-request.zip",
      user: {
        id: "1"
      }
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/data-file-request.zip"
    );

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(200);

    // Expect the content type of the downloaded file to be zip file
    expect(response.header["content-type"]).toEqual("application/zip");

    // Expect the disposition to have file name with data-file-request.zip
    expect(response.header["content-disposition"]).toContain(
      "data-file-request.zip"
    );
  });

  it("should download the requested data file as an admin", async () => {
    // Mocking the user query of the user who is an admin
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

    // Mocking the data request owned by the logged in user
    // Assuming the file is located in this directory
    // ./downloads/data-requests/1/data-file-request.zip
    (prisma.dataRequest as any).mockResolvedValueOnce({
      uri: "./downloads/data-requests/1/data-file-request.zip",
      user: {
        id: "2"
      }
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/data-file-request.zip"
    );

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(200);

    // Expect the content type of the downloaded file to be zip file
    expect(response.header["content-type"]).toEqual("application/zip");

    // Expect the disposition to have file name with data-file-request.zip
    expect(response.header["content-disposition"]).toContain(
      "data-file-request.zip"
    );
  });

  it("should not download the requested data file if its no longer exists", async () => {
    // Mocking the user query of the user who is not an admin
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

    // Mocking the data request owned by the logged in user
    (prisma.dataRequest as any).mockResolvedValueOnce({
      uri: "path/to/no-longer-existing/data-request",
      user: {
        id: "1"
      }
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

  it("should not download if the user does not own the data request file nor an admin", async () => {
    // Mocking the user query of the user who is not an admin
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

    // Mocking the data request not owned by the logged in user
    (prisma.dataRequest as any).mockResolvedValueOnce({
      user: {
        id: "2"
      }
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/requested-data-file-id/filename.zip"
    );

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(403);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain(
      "not allowed to download the requested file"
    );
  });

  it("should not download if the user have not requested any data file", async () => {
    // Mocking the data request that is empty
    (prisma.dataRequest as any).mockResolvedValueOnce(null);

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

  it("should not allow any user in this endpoint if they are not logged in", async () => {
    const server = (await createServer()).createHttpServer({});

    // User attempting to download requested data files.
    const authenticatedAgent = request.agent(server);

    const response = await authenticatedAgent.get(
      "/downloads/data-requests/1/filename.zip"
    );

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(401);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain("must be logged in");
  });
});

describe("/downloads/data-requests/:dataRequestId/:dataRequestPartId/:filename", () => {
  it("should download the requested part data file as an owner", async () => {
    // Mocking the user query of the user who is not an admin
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

    // Mocking the data request owned by the logged in user
    // Assuming the file is located in this directory ./downloads/data-requests/1/part-data-file-request.zip
    (prisma.dataRequest as any).mockResolvedValueOnce({
      parts: [
        {
          id: "1",
          uri: "./downloads/data-requests/1/parts/part-data-file-request.zip"
        }
      ],
      user: {
        id: "1"
      }
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/1/part-data-file-request.zip"
    );

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(200);

    // Expect the content type of the downloaded file to be zip file
    expect(response.header["content-type"]).toEqual("application/zip");

    // Expect the disposition to have file name with part-data-file-request.zip
    expect(response.header["content-disposition"]).toContain(
      "part-data-file-request.zip"
    );
  });

  it("should download the requested part data file as an admin", async () => {
    // Mocking the user query of the user who is an admin
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

    // Mocking the data request owned by the logged in user
    // Assuming the file is located in this directory ./downloads/data-requests/1/data-file-request.zip
    (prisma.dataRequest as any).mockResolvedValueOnce({
      parts: [
        {
          id: "1",
          uri: "./downloads/data-requests/1/parts/part-data-file-request.zip"
        }
      ],
      user: {
        id: "2"
      }
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/1/part-data-file-request.zip"
    );

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(200);

    // Expect the content type of the downloaded file to be zip file
    expect(response.header["content-type"]).toEqual("application/zip");

    // Expect the disposition to have file name with part-data-file-request.zip
    expect(response.header["content-disposition"]).toContain(
      "part-data-file-request.zip"
    );
  });

  it("should not download the requested part data file if its no longer exists", async () => {
    // Mocking the user query of the user who is not an admin
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

    // Mocking the data request owned by the logged in user
    (prisma.dataRequest as any).mockResolvedValueOnce({
      parts: [
        {
          id: "1",
          uri: "path/to/no-longer-existing/part-data-request"
        }
      ],
      user: {
        id: "1"
      }
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/1/filename.zip"
    );

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(404);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain("does not exist");
  });

  it("should not download if the user does not own the data request file nor an admin", async () => {
    // Mocking the user query of the user who is not an admin
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

    // Mocking the data request not owned by the logged in user
    (prisma.dataRequest as any).mockResolvedValueOnce({
      user: {
        id: "2"
      }
    });

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/1/filename.zip"
    );

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(403);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain(
      "not allowed to download the requested file"
    );
  });

  it("should not download if the user have not requested any data file", async () => {
    // Mocking the data request that is empty
    (prisma.dataRequest as any).mockResolvedValueOnce(null);

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test");

    const response = await agent.get(
      "/downloads/data-requests/1/1/filename.zip"
    );

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(404);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain("does not exist");
  });

  it("should not allow any user in this endpoint if they are not logged in", async () => {
    const server = (await createServer()).createHttpServer({});

    // User attempting to download requested data files.
    const authenticatedAgent = request.agent(server);

    const response = await authenticatedAgent.get(
      "/downloads/data-requests/1/1/filename.zip"
    );

    // Expect the user unauthenticated status code
    expect(response.status).toEqual(401);

    // Expect the success field to be false
    expect(JSON.parse(response.text).success).toEqual(false);

    // Expect the error message to be meaningful
    expect(JSON.parse(response.text).message).toContain("must be logged in");
  });
});
