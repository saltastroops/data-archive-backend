import { Prisma } from "./generated/prisma-client";

interface IContext {
  prisma: Prisma;
  user: { id: string };
}

interface IUser {
  id: string;
}

const userLoggedin = (user: IUser) => {
  if (!user) {
    throw new Error("You must be logged in to call this query");
  }
};

export { userLoggedin, IContext };
