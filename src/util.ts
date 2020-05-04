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

export { IContext, transporter };
