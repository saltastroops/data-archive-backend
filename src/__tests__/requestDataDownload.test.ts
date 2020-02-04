// tslint:disable-next-line:no-submodule-imports
import * as iconv from "mysql2/node_modules/iconv-lite";
iconv.encodingExists("cesu8");

jest.mock("../db/postgresql_pool.ts");
jest.mock("bcrypt");

import bcrypt from "bcrypt";
import moment from "moment";
import request from "supertest";
import createServer from "../createServer";
import { ssdaPool } from "../db/postgresql_pool";

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

// A helper function to check the correct date format zip filename.
function matchDateFormatFilename(date: string) {
  return !!date.match(
    /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\.(zip))/g
  );
}

afterEach(() => {
  // Cleaning up
  (ssdaPool.query as any).mockReset();
  (ssdaPool.connect as any).mockReset();
});

describe("/downloads/data-requests/:dataRequestId/:filename", () => {
  it("should download the requested data file if the user owns it", async () => {
    // Mock the database querying
    // 1. & 2. Mocks get user by username of the user to authenticate.
    // 3. & 4. Mocks get user by id when deserializing.
    // 5. & 6. Mocks get user by id for the logged in normal user.
    // 5. Mocks querying of the data request with existing path.
    (ssdaPool.query as any)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            path: "./src/__tests__/data/data-file-request.zip",
            ssda_user_id: 1
          }
        ]
      });

    // Mock the bcrypt password comparison to return true.
    (bcrypt.compare as any).mockResolvedValueOnce(true);

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test", "SSDA");

    const response = await agent.get(
      "/downloads/data-requests/1/data-file-request.zip"
    );

    // Expect that all went well
    expect(response.status).toEqual(200);

    // Expect the content type of the downloaded file to be application/zip
    expect(response.header["content-type"]).toEqual("application/zip");

    // Expect the disposition to use the correct format "Y-MM-DD.zip" as filename
    expect(
      matchDateFormatFilename(response.header["content-disposition"])
    ).toBeTruthy();

    // Expect that the correct file content has been returned
    expect(response.text).toEqual("This pretends to be a zip file.");
  });

  it("should download the requested data file if the user is an admin", async () => {
    // Mock the database querying
    // 1. & 2. Mocks get user by username of the user to authenticate.
    // 3. & 4. Mocks get user by id when deserializing.
    // 5. & 6. Mocks get user by id for the logged in an admin user.
    // 5. Mocks querying of the data request with existing path.
    (ssdaPool.query as any)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ role: "Admin" }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ role: "Admin" }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ role: "Admin" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            path: "./src/__tests__/data/data-file-request.zip",
            ssda_user_id: 2
          }
        ]
      });

    // Mock the bcrypt password comparison to return true.
    (bcrypt.compare as any).mockResolvedValueOnce(true);

    // Authenticate the user
    const agent = await createAuthenticatedAgent("test", "test", "SSDA");

    const response = await agent.get(
      "/downloads/data-requests/1/data-file-request.zip"
    );

    // Expect that all went well
    expect(response.status).toEqual(200);

    // Expect the content type of the downloaded file to be application/zip
    expect(response.header["content-type"]).toEqual("application/zip");

    // Expect the disposition to use the correct format "Y-MM-DD.zip" as filename
    expect(
      matchDateFormatFilename(response.header["content-disposition"])
    ).toBeTruthy();

    // Expect that the correct file content has been returned
    expect(response.text).toEqual("This pretends to be a zip file.");
  });

  it("should return a Not Found error if the requested data file no longer exists", async () => {
    // Mock the database querying
    // 1. & 2. Mocks get user by username of the user to authenticate.
    // 3. & 4. Mocks get user by id when deserializing.
    // 5. & 6. Mocks get user by id for the logged user.
    // 5. Mocks querying of the data request with no longer existing path.
    (ssdaPool.query as any)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { ssda_user_id: 1, path: "path/to/no-longer-existing/data-request" }
        ]
      });

    // Mock the bcrypt password comparison to return true.
    (bcrypt.compare as any).mockResolvedValueOnce(true);

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
    // 1. & 2. Mocks get user by username of the user to authenticate.
    // 3. & 4. Mocks get user by id when deserializing.
    // 5. & 6. Mocks get user by id for the logged user.
    // 5. Mocks querying of the data request for a different user than the one who is logged in.
    (ssdaPool.query as any)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { userId: 2, path: "./src/__tests__/data/data-file-request.zip" }
        ]
      });

    // Mock the bcrypt password comparison to return true.
    (bcrypt.compare as any).mockResolvedValueOnce(true);

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
    // 1. & 2. Mocks get user by username of the user to authenticate.
    // 3. & 4. Mocks get user by id when deserializing.
    // 5. & 6. Mocks get user by id for the logged user.
    // 5. Mocks querying of the data request not to exist.
    (ssdaPool.query as any)
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    // Mock the bcrypt password comparison to return true.
    (bcrypt.compare as any).mockResolvedValueOnce(true);

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
