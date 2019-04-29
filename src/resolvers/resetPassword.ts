import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import moment from "moment";
import { promisify } from "util";
import { prisma } from "../generated/prisma-client";
import { transporter } from "../util";

const requestReset = async (email: string) => {
  // Find a user with given email address
  const user = await prisma.user({
    email
  });
  if (!user) {
    throw new Error(`No user with email ${email}`);
  }

  // Create a reset token
  const randomBytesPromisified = promisify(randomBytes);
  const passwordResetToken = (await randomBytesPromisified(30)).toString("hex");

  // Create a reset token expiry
  const passwordResetTokenExpiry = moment(Date.now())
    .add(2, "hours")
    .toDate();

  // Update the user in prisma with token and expiry date
  const updatedUser = await prisma.updateUser({
    data: {
      passwordResetToken,
      passwordResetTokenExpiry
    },
    where: { email }
  });

  // in case token is not unique which is very rare or prisma fail to update user fro some reasons
  if (!updatedUser) {
    throw new Error(`Fail to generate a reset token, request again`);
  }
  try {
    const url = `${process.env.HOST}/auth/reset-password/${passwordResetToken}`;
    await transporter.sendMail({
      html: `Please to reset your password click: <a href="${url}">${url}</a> <br/>`,
      subject: "Reset password SAAO/SALT Data archive",
      to: user.email
    });
  } catch (e) {
    throw new Error(`Fail to send reset token to email: ${email}`);
  }
  return user;
};

const resetPassword = async (token: string, password: string) => {
  if (!(password.length > 6)) {
    throw new Error(`The password must be at least 7 characters long.`);
  }

  // get the user with the token
  const user = await prisma.user({ passwordResetToken: token });
  if (!user) {
    throw new Error(`Fail to reset password of unknown token`);
  }
  if (
    user.passwordResetTokenExpiry &&
    moment(user.passwordResetTokenExpiry) <= moment(Date.now())
  ) {
    throw new Error("Token is expired");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  // updating the user with the new password and expire the token
  await prisma.updateUser({
    data: {
      password: hashedPassword,
      passwordResetTokenExpiry: moment(Date.now()).toDate()
    },
    where: {
      passwordResetToken: token
    }
  });
  return user;
};

export { requestReset, resetPassword };
