import moment from "moment";
jest.mock("../generated/prisma-client");
jest.mock("../util");
import { prisma } from "../generated/prisma-client";
import { resolvers } from "../resolvers";
import { IContext, transporter } from "../util";

afterEach(() => {
  // Cleaning up
  (prisma.user as any).mockReset();
  (prisma.updateUser as any).mockReset();
  (transporter.sendMail as any).mockReset();
});

/**
 * expect(true).toBeFalsy();
 * Is a failing test to insure that the try fails and catch is executed
 */

describe("Request password reset", () => {
  it("should fail if no email is provided", async () => {
    // no email provided
    (prisma.user as any).mockResolvedValue(undefined);
    try {
      await resolvers.Mutation.requestPasswordReset({}, {} as any, {} as any);
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toContain("email address must be provided");
    }

    expect(prisma.updateUser).not.toHaveBeenCalled();
    expect(transporter.sendMail).not.toHaveBeenCalled();
    expect(1).toEqual(1);
  });

  it("should fail if email provided is not known", async () => {
    // user with email is not found
    (prisma.user as any).mockResolvedValue(undefined);
    try {
      await resolvers.Mutation.requestPasswordReset(
        {},
        { email: "unknown@xxx.xx" },
        {} as any
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toContain(
        "no user with the email address unknown@xxx.xx"
      );
    }

    expect(prisma.updateUser).not.toHaveBeenCalled();
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it("should fail if adding the token and token expiry to Prisma fails", async () => {
    // user with email is not found
    (prisma.user as any).mockResolvedValue({
      email: "xxx@xxx.xx",
      username: "xxx"
    });
    (prisma.updateUser as any).mockResolvedValue(null);
    try {
      await resolvers.Mutation.requestPasswordReset(
        {},
        { email: "xxx@xxx.xx" },
        {} as any
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toContain("Please try again.");
    }

    expect(prisma.user).toHaveBeenCalled();
    expect(prisma.updateUser).toHaveBeenCalled();
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it("should fail if no email could be sent to the user", async () => {
    (prisma.user as any).mockResolvedValue({
      email: "xxx@xxx.xx",
      username: "xxx"
    });
    (prisma.updateUser as any).mockResolvedValue({
      email: "xxx@xxx.xx",
      username: "xxx"
    });
    (transporter.sendMail as any).mockRejectedValue("Email error");
    try {
      await resolvers.Mutation.requestPasswordReset(
        {},
        { email: "xxx@xxx.xx" },
        {} as any
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toContain("could not be sent");
    }

    expect(prisma.user).toHaveBeenCalled();
    expect(prisma.updateUser).toHaveBeenCalled();
    expect(transporter.sendMail).toHaveBeenCalled();
  });

  it("should send an email if the token could be generated and stored", async () => {
    /**
     * An email address is provided,
     * the reset token and token expiry are updated successfully,
     * an email is sent successfully
     */
    // user with email is not found
    (prisma.user as any).mockResolvedValue({
      email: "xxx@xxx.xx",
      username: "xxx"
    });
    (prisma.updateUser as any).mockResolvedValue({
      email: "xxx@xxx.xx",
      username: "xxx"
    });
    (transporter.sendMail as any).mockResolvedValue("Email sent");

    await resolvers.Mutation.requestPasswordReset(
      {},
      { email: "xxx@xxx.xx" },
      {} as any
    );

    expect(prisma.user).toHaveBeenCalled();
    expect(prisma.updateUser).toHaveBeenCalled();
    expect(transporter.sendMail).toHaveBeenCalled();
  });
});

describe("reset password", () => {
  it("should fail if a password of length less than 7 is given", async () => {
    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secret", token: "abc" },
        {} as any
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toEqual(
        "The password must be at least 7 characters long."
      );
    }
  });

  it("should fail if the token is invalid", async () => {
    // no user found for given token
    (prisma.user as any).mockResolvedValue(null);
    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secretpassword", token: "badToken" },
        {} as any
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toContain("no user for the token");
    }
  });

  it("should fail if the token has expired", async () => {
    // given token is expired
    (prisma.user as any).mockResolvedValue({
      passwordResetTokenExpiry: moment(Date.now()).subtract(1, "second")
    });
    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secretpassword", token: "expiredtoken" },
        {} as any
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toContain("expired.");
    }
  });

  it("should fail if it is unable to update to prisma with new password", async () => {
    (prisma.user as any).mockResolvedValue({
      passwordResetTokenExpiry: moment(Date.now()).add(1, "hour")
    });
    // user cannot be updated
    (prisma.updateUser as any).mockResolvedValue(null);

    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secretpassword", token: "validtoken" },
        {} as any
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toContain("could not be updated");
    }
  });

  it("should pass only when", async () => {
    /**
     * Token and password are provided.
     * password is greater than 6 chars.
     * token is not expired.
     * and prisma update the users password.
     */

    (prisma.user as any).mockResolvedValue({
      passwordResetTokenExpiry: moment(Date.now()).add(1, "hour")
    });
    // user password fail to update
    (prisma.updateUser as any).mockResolvedValue({
      email: "xxx@xxx.xx",
      username: "xxx"
    });

    await resolvers.Mutation.resetPassword(
      {},
      { password: "secretpassword", token: "badToken" },
      {} as any
    );
    expect(prisma.user).toHaveBeenCalled();
    expect(prisma.updateUser).toHaveBeenCalled();
  });
});
