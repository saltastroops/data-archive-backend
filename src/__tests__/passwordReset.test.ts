import moment from "moment";
jest.mock("../generated/prisma-client");
jest.mock("../util");
import { prisma } from "../generated/prisma-client";
import { resolvers } from "../resolvers";
import { transporter } from "../util";

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
  it("should fail if email is not provided", async () => {
    // no email provided
    (prisma.user as any).mockResolvedValue(undefined);
    try {
      await resolvers.Mutation.requestPasswordReset({}, {}, {});
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toEqual("No user with email undefined");
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
        {}
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toEqual("No user with email unknown@xxx.xx");
    }

    expect(prisma.updateUser).not.toHaveBeenCalled();
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it("should fail if for any reason it fails to add token and token expiry to prisma", async () => {
    // user with email is not found
    (prisma.user as any).mockResolvedValue({
      email: "xxx@xxx.xx",
      username: "xxx"
    });
    (prisma.updateUser as any).mockResolvedValue(undefined);
    try {
      await resolvers.Mutation.requestPasswordReset(
        {},
        { email: "xxx@xxx.xx" },
        {}
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toEqual(
        "Fail to generate a reset token, request again"
      );
    }

    expect(prisma.user).toHaveBeenCalled();
    expect(prisma.updateUser).toHaveBeenCalled();
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it("should fail if it fails to send email to user", async () => {
    // user with email is not found
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
        {}
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toEqual(
        "Fail to send reset token to email: xxx@xxx.xx"
      );
    }

    expect(prisma.user).toHaveBeenCalled();
    expect(prisma.updateUser).toHaveBeenCalled();
    expect(transporter.sendMail).toHaveBeenCalled();
  });

  it("should only when: ", async () => {
    /**
     * email is provided,
     * reset token and token expiry is updated successfully,
     * email is send successfully
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
      {}
    );

    expect(prisma.user).toHaveBeenCalled();
    expect(prisma.updateUser).toHaveBeenCalled();
    expect(transporter.sendMail).toHaveBeenCalled();
  });
});

describe("reset password", () => {
  it("should fail if password is not given or length less that 7 and token not given", async () => {
    // no email provided
    try {
      await resolvers.Mutation.resetPassword({}, {}, {});
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toEqual("Cannot read property 'length' of undefined");
    }
    try {
      await resolvers.Mutation.resetPassword({}, { password: "secret" }, {});
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toEqual(
        "The password must be at least 7 characters long."
      );
    }

    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secretpassword" },
        {}
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toEqual("Fail to reset password of unknown token.");
    }
  });

  it("should fail if token given is bad", async () => {
    // no of a given token
    (prisma.user as any).mockResolvedValue(undefined);
    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secretpassword", token: "badToken" },
        {}
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toEqual("Fail to reset password of unknown token.");
    }
  });

  it("should fail if token given is expired", async () => {
    // given token is expired
    (prisma.user as any).mockResolvedValue({
      passwordResetTokenExpiry: moment(Date.now()).subtract(1, "second")
    });
    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secretpassword", token: "badToken" },
        {}
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toEqual("Token is expired.");
    }
  });

  it("should fail if it is unable to update to prisma with new password", async () => {
    (prisma.user as any).mockResolvedValue({
      passwordResetTokenExpiry: moment(Date.now()).add(1, "hour")
    });
    // user password fail to update
    (prisma.updateUser as any).mockResolvedValue(undefined);
    try {
      await resolvers.Mutation.resetPassword(
        {},
        { password: "secretpassword", token: "badToken" },
        {}
      );
      expect(true).toBeFalsy();
    } catch (e) {
      expect(e.message).toEqual("Fail to update token.");
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
      {}
    );
    expect(prisma.user).toHaveBeenCalled();
    expect(prisma.updateUser).toHaveBeenCalled();
  });
});
