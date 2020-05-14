import nodemailer from "nodemailer";

interface IContext {
  user: { id: string };
}

interface IUser {
  id: string;
}

const port: number = process.env.MAIL_PORT
  ? Number(process.env.MAIL_PORT)
  : 456;
const secure: boolean = process.env.MAIL_SSL === "true" ? true : false;

const transporter = nodemailer.createTransport({
  auth: {
    pass: process.env.MAIL_PASSWORD,
    user: process.env.MAIL_USER
  },
  host: process.env.MAIL_HOST,
  port,
  secure
});

/**
 * The frontend URL, without a trailing slash.
 */
function frontendURL(): string {
  const url = process.env.FRONTEND_HOST;
  if (!url) {
    throw new Error("The FRONTEND_HOST environment variable must be set.");
  }
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export { frontendURL, IContext, transporter };
