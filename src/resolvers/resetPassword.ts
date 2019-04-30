import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import moment from "moment";
import { promisify } from "util";
import { prisma } from "../generated/prisma-client";
import { transporter } from "../util";

const requestPasswordReset = async (email: string) => {
  // Find a user with given email address
  const user = await prisma.user({
    email
  });
  if (!user) {
    throw new Error(`There exists no user with this email address.`);
  }

  // Create a reset token
  const randomBytesPromisified = promisify(randomBytes);
  const passwordResetToken = (await randomBytesPromisified(30)).toString("hex");

  // Create a reset token expiry date
  const passwordResetTokenExpiry = moment(Date.now())
    .add(2, "hours")
    .toDate();

  // Update the user in prisma with the token and its expiry date
  const updatedUser = await prisma.updateUser({
    data: {
      passwordResetToken,
      passwordResetTokenExpiry
    },
    where: { email }
  });

  // Handle unsuccessful updates.
  if (!updatedUser) {
    throw new Error(
      `Oops, something went wrong while generating a token for resetting your password. Please try again.`
    );
  }

  try {
    const url = `${
      process.env.FRONTEND_HOST
    }/auth/reset-password/${passwordResetToken}`;
    const html = `Dear ${user.givenName} ${user.familyName},<br><br>
Someone (probably you) has requested to reset your password for the SAAO/SALT Data Archive.<br><br>
Please click on the following link to change the password:<br><br>
<a href="${url}">${url}</a><br><br>
Alternatively you may copy the URL into your browser's address bar.<br><br>
If you have not requested to reset your password there is no need for any action from your side.<br><br>
Kind regards,<br><br>
The SAAO/SALT Data Archive Team`;
    await transporter.sendMail({
      html,
      subject: "Reset your password for the SAAO/SALT Data Archive",
      to: user.email
    });
  } catch (e) {
    throw new Error(
      `The email with the password reset link could not be sent.`
    );
  }
  return user;
};

const resetPassword = async (token: string, password: string) => {
  if (!(password.length > 6)) {
    throw new Error(`The password must be at least 7 characters long.`);
  }

  // Get the user with the token
  const user = await prisma.user({ passwordResetToken: token });
  if (!user) {
    throw new Error(`There exists no user for the token.`);
  }
  if (
    user.passwordResetTokenExpiry &&
    moment(user.passwordResetTokenExpiry) <= moment(Date.now())
  ) {
    throw new Error("The token has expired");
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update the user with the new password and expire the token
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

export { requestPasswordReset, resetPassword };
