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

const DataRequestsTypes = { DataFile, DataRequest, DataRequestPart };

export { DataRequestsTypes };
