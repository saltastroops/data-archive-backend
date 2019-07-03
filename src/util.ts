import nodemailer from "nodemailer";
import { Prisma } from "./generated/prisma-client";

interface IContext {
  prisma: Prisma;
  user: { id: string };
}

interface IUser {
  id: string;
}

const transporter = nodemailer.createTransport({
  auth: {
    pass: process.env.MAIL_PASSWORD,
    user: process.env.MAIL_USER
  },
  host: process.env.MAIL_HOST,
  port: 465,
  secure: true
});

export { IContext, transporter };
