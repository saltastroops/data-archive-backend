import nodemailer from "nodemailer";
import { Prisma } from "./generated/prisma-client";

interface IContext {
  prisma: Prisma;
  user: { id: string };
}

interface IUser {
  id: string;
}

const checkIIfUserLoggedin = (user: IUser) => {
  if (!user) {
    throw new Error("You must be logged in to call this query");
  }
};

export const groupDataFileByPart = (dataFiles: any[]) => {
  let groupedDataFiles: any = {};
  dataFiles.forEach((file: any) => {
    if (file.observation && file.observation.id) {
        groupedDataFiles = groupedDataFiles[file.observation.id] ?
            {
                ...groupedDataFiles,
                [file.observation.id]: [...groupedDataFiles[file.observation.id], file.id]
            } :
            {
                ...groupedDataFiles,
                [file.observation.id] : [ file.id]
            }
    } else {
        groupedDataFiles = {
            ... groupedDataFiles,
            "unknownObs": !groupedDataFiles.unknownObs ? [file.id] : [...groupedDataFiles.unknownObs, file.id]
        }
    }
  });
  return groupedDataFiles
};

const transporter = nodemailer.createTransport({
    auth: {
        pass: process.env.MAIL_PASS,
        user: process.env.MAIL_USER,
    },
    service: 'Gmail',
});

export { checkIIfUserLoggedin, IContext, transporter };
