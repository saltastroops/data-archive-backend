import nodemailer from "nodemailer";
import { Prisma } from "./generated/prisma-client";

interface IContext {
  prisma: Prisma;
  user: { id: string };
}

interface IUser {
  id: string;
}

const checkIfUserLoggedin = (user: IUser) => {
  if (!user) {
    throw new Error("You must be logged in to call this query");
  }
};

const transporter = nodemailer.createTransport({
    auth: {
        pass: process.env.MAIL_PASS,
        user: process.env.MAIL_USER,
    },
    service: 'Gmail',
});

export { checkIfUserLoggedin, IContext, transporter };
