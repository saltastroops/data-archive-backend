import { DataRequestStatus, Prisma } from "../generated/prisma-client";
import { groupDataFileByPart, IContext, userLoggedin } from "../util";

interface IRoot {
  id: string;
}
interface IDataRequestUpdate {
  downloadLink: string;
  dataRequestId: string;
}
interface IDataRequestPartUpdate {
  downloadLink: string;
  dataRequestPartId: string;
  status: DataRequestStatus;
  statusReason: string;
}

/**
 * Data type to help with DataRequest resolving
 */
const DataRequest = {
  parts: ({ id }: IRoot, args: any, { prisma }: IContext) =>
    prisma.dataRequest({ id }).parts(),
  user: ({ id }: IRoot, args: any, { prisma }: IContext) =>
    prisma.dataRequest({ id }).user()
};

/**
 * Data type to help with DataRequestPart resolving
 */
const DataRequestPart = {
  dataFiles: ({ id }: IRoot, args: any, { prisma }: IContext) =>
    prisma.dataRequestPart({ id }).dataFiles()
};

/**
 * Data type to help with DataFile resolving
 */
const DataFile = {
  observation: ({ id }: IRoot, args: any, { prisma }: IContext) =>
    prisma.dataFile({ id }).observation()
};

/**
 * Create a data request.
 * A user need to be logged in to create a dat request
 * @args
 *      parts:
 *          An array of data request part
 *          It can be associate with observation/ it only have a part of the observation
 *      part.ids:
 *          An array of Data files ids
 *          This files id's need to exist within the prisma database.
 *          i.e you can only request data files that exist anything else will fail
 * @return
 *      New data request that has just been created or an error
 */
const createDataRequest = async (
  { files }: any,
  { prisma, user }: IContext
) => {
  userLoggedin(user);

  const madeAt = new Date();
  const parts = await prisma.dataFiles({ where: { id_in: files } });
  //  Todo use method groupDataFileByPart() when you can get an observation within a part
  return { id: "XX" };
  // Todo need to return what is commented below
  // Creating a data request
  //   return prisma.createDataRequest({
  //     madeAt,
  //     parts: {
  //       create: parts.map((part: any) => ({
  //         // Data request parts creation
  //         dataFiles: {
  //           connect: part.ids.map((file: string) => ({
  //             // Data files linking
  //             id: file
  //           }))
  //         }
  //       }))
  //     },
  //     user: {
  //       connect: {
  //         id: user.id
  //       }
  //     }
  //   });
};

const DataRequestsTypes = { DataFile, DataRequest, DataRequestPart };

export { createDataRequest, DataRequestsTypes };
