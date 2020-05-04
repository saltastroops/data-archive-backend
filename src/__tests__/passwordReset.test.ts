import * as iconv from "mysql2/node_modules/iconv-lite";
iconv.encodingExists("cesu8");

jest.mock("../db/postgresql_pool.ts");
jest.mock("../util");

import moment from "moment";
import { ssdaPool } from "../db/postgresql_pool";
import { resolvers } from "../resolvers";
import { transporter } from "../util";

beforeEach(() => {
  // Cleaning up
  (ssdaPool.query as any).mockReset();
  (ssdaPool.connect as any).mockReset();
  (transporter.sendMail as any).mockReset();
});

describe("Request password reset", () => {
  it("should fail if no email is provided", async () => {
    try {
      await resolvers.Mutation.requestPasswordReset(
        {},
        { email: "" },
        { user: { id: "", authProvider: "SSDA" } }
      );
    } catch (e) {
      expect(e.message).toContain("email address must be provided");
    }
  });

  it("should fail if email provided is not known", async () => {
    // Mock the database querying
    // 1. Mocks get user by email address not to exist.
    (ssdaPool.query as any).mockResolvedValueOnce({ rows: [] });

    try {
      await resolvers.Mutation.requestPasswordReset(
        {},
        { email: "unknown@xxx.xx" },
        { user: { id: "", authProvider: "SSDA" } }
      );
    } catch (e) {
      expect(e.message).toContain(
        "no user with the email address unknown@xxx.xx"
      );
    }
  });

  it("should fail if adding the token and token expiry fails", async () => {
    // Mock the database querying
    // 1.& 2. Mocks the get user by email address to exist.
    // 3. Mocks setting the token to have failed
    (ssdaPool.query as any)
      .mockResolvedValueOnce({
        rows: [{ email: "xxx@xxx.xx", username: "xxx" }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    try {
      await resolvers.Mutation.requestPasswordReset(
        {},
        { email: "xxx@xxx.xx" },
        { user: { id: "", authProvider: "SSDA" } }
      );
    } catch (e) {
      expect(e.message).toContain(
        "Oops, something went wrong while generating a token"
      );
    }
  });

  it("should fail if no email could be sent to the user", async () => {
    // Mock the database querying
    // 1.& 2. Mocks get user by email address to exist.
    // 3. Mocks setting the token to have succeeded.
    (ssdaPool.query as any)
      .mockResolvedValueOnce({
        rows: [{ email: "xxx@xxx.xx", username: "xxx" }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(true);

    try {
      await resolvers.Mutation.requestPasswordReset(
        {},
        { email: "xxx@xxx.xx" },
        { user: { id: "", authProvider: "SSDA" } }
      );
    } catch (e) {
      expect(e.message).toContain(
        "The email with the password reset link could not be sent."
      );
    }
  });

  it("should send an email if the token could be generated and stored", async () => {
    // Mock the database querying
    // 1.& 2. Mocks get user by email address to exist.
    // 3. Mocks setting the token to have succeeded.
    (ssdaPool.query as any)
      .mockResolvedValueOnce({
        rows: [{ email: "xxx@xxx.xx", username: "xxx" }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(true);

    (transporter.sendMail as any).mockResolvedValueOnce("Email sent");

    try {
      await resolvers.Mutation.requestPasswordReset(
        {},
        { email: "xxx@xxx.xx" },
        { user: { id: "", authProvider: "SSDA" } }
      );
      expect(transporter.sendMail).toHaveBeenCalled();
    } catch (e) {
      return;
    }
  });
});

describe("reset password", () => {
  it("should fail if a password of length less than 7 is given", async () => {
    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secret", token: "abc" },
        { user: { id: "", authProvider: "SSDA" } }
      );
    } catch (e) {
      expect(e.message).toEqual(
        "The password must be at least 7 characters long."
      );
    }
  });

  it("should fail if the token is invalid", async () => {
    // Mock the database querying
    // 1. Mocks get user by the token to have failed.
    (ssdaPool.query as any).mockResolvedValueOnce({ rows: [] });

    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secretpassword", token: "badToken" },
        { user: { id: "", authProvider: "SSDA" } }
      );
    } catch (e) {
      expect(e.message).toContain("no user for the token");
    }
  });

  it("should fail if the token has expired", async () => {
    // Mock the database querying
    // 1. & 2. Mocks get user by the token to have suceeded but token expired.
    (ssdaPool.query as any)
      .mockResolvedValueOnce({
        rows: [
          {
            password_reset_token_expiry: moment(Date.now()).subtract(
              1,
              "second"
            )
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] });

    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secretpassword", token: "expiredtoken" },
        { user: { id: "", authProvider: "SSDA" } }
      );
    } catch (e) {
      expect(e.message).toContain("expired.");
    }
  });

  it("should fail if it is unable to update with the new password", async () => {
    // Mock the database querying
    // 1. & 2. Mocks get user by the token to have suceeded.
    // 3. Moks user updation to have failed
    (ssdaPool.query as any)
      .mockResolvedValueOnce({
        rows: [
          { password_reset_token_expiry: moment(Date.now()).add(1, "hour") }
        ]
      })
      .mockResolvedValueOnce({ rows: [{ password_reset_token: "validtoken" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secretpassword", token: "validtoken" },
        { user: { id: "", authProvider: "SSDA" } }
      );
    } catch (e) {
      expect(e.message).toContain("could not be updated");
    }
  });

  it("should update the password successfully", async () => {
    // Mock the database querying
    // 1. & 2. Mocks get user by the token to have succeeded.
    // 3. Mocks user update to have succeeded
    // 4. & 5. Mocks get user by id of the just updated user password to have suceeded.
    (ssdaPool.query as any)
      .mockResolvedValueOnce({
        rows: [{ passwordResetTokenExpiry: moment(Date.now()).add(1, "hour") }]
      })
      .mockResolvedValueOnce({ rows: [{ token: "validtoken" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secretpassword", token: "validtoken" },
        { user: { id: "", authProvider: "SSDA" } }
      );
    } catch (e) {
      return;
    }

    // Expect the ssdaAdmin query to have been called 5 times
    expect(ssdaPool.query as any).toHaveBeenCalledTimes(5);
  });
});
