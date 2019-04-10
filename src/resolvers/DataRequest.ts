import { load } from "dotenv";
import { Prisma } from "../generated/prisma-client";

interface IContext {
  prisma: Prisma;
}
interface IRoot {
  id: string;
}

const DataRequest = {
  parts: ({ id }: IRoot, args: any, { prisma }: IContext) =>
    prisma.dataRequest({ id }).parts(),
  user: ({ id }: IRoot, args: any, { prisma }: IContext) =>
    prisma.dataRequest({ id }).user()
};

const DataRequestPart = {
  dataFiles: ({ id }: IRoot, args: any, { prisma }: IContext) =>
    prisma.dataRequestPart({ id }).dataFiles()
};

const DataFile = {
  observation: ({ id }: IRoot, args: any, { prisma }: IContext) =>
    prisma.dataFile({ id }).observation()
};

const createDataRequest = async (
  root: any,
  { parts }: any,
  { prisma }: IContext
) => {
  // if (!user) {
  //   throw new Error("You must be logged in to call this query");
  // }
  const user = await prisma.user({ id: "cju8eq9yxxaj90b26br1gwy2y" }); // TODO use context user
  const madeAt = new Date();

  // Creating a data request
  return prisma.createDataRequest({
    madeAt,
    parts: {
      create: parts.map((part: any) => ({
        dataFiles: {
          connect: part.ids.map((file: string) => ({
            id: file
          }))
        }
      }))
    },
    user: {
      connect: {
        id: user.id
      }
    }
  });
};

const updateDataRequest = (
  root: any,
  { dataRequestId, downloadLink }: any,
  { prisma }: IContext
) => {
  return prisma.updateDataRequest({
    data: {
      url: downloadLink
    },
    where: {
      id: dataRequestId
    }
  });
};
const updateDataRequestPart = (
  root: any,
  { status, statusReason, downloadLink, dataRequestPartId }: any,
  { prisma }: IContext
) => {
  return prisma.updateDataRequestPart({
    data: {
      status,
      statusReason,
      uri: downloadLink
    },
    where: {
      id: dataRequestPartId
    }
  });
};

const DataRequestsTypes = { DataFile, DataRequest, DataRequestPart };

export { DataRequestsTypes };
export { createDataRequest, updateDataRequest, updateDataRequestPart };
