import { DataRequestStatus, Prisma } from "../generated/prisma-client";
import { IContext, userLoggedin } from "../util";

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

  // Creating a data request
  return prisma.createDataRequest({
    madeAt,
    parts: {
      create: parts.map((part: any) => ({
        // Data request parts creation
        dataFiles: {
          connect: part.ids.map((file: string) => ({
            // Data files linking
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

/**
 * Update data request.
 * When data is available for downloading or it is no longer available DataRequest need to be updated
 * @args dataRequestId
 *    Id of data request that need to be updated
 * @args downloadLink
 *    A link to where to download the data request
 * @return
 *      A newly updated data request
 */
const updateDataRequest = (
  root: any,
  { dataRequestId, downloadLink }: IDataRequestUpdate,
  { prisma, user }: IContext
) => {
  userLoggedin(user);

  return prisma.updateDataRequest({
    data: {
      url: downloadLink
    },
    where: {
      id: dataRequestId
    }
  });
};

/**
 * Update data request part.
 * When data is available for downloading or it is no longer available or any fails DataRequestPart need to be updated
 * @args dataRequestPartId
 *    Id of data request part that need to be updated
 * @args downloadLink
 *    A link to download the data request part
 * @args status
 *    A current status of this data request part(PENDING, SUCCESSFUL or FAILED)
 * @args statusReason
 *    Usually meant for status fail
 * @rargs
 *      A newly updated data request part
 */
const updateDataRequestPart = (
  root: any,
  {
    status,
    statusReason,
    downloadLink,
    dataRequestPartId
  }: IDataRequestPartUpdate,
  { prisma, user }: IContext
) => {
  userLoggedin(user);

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
