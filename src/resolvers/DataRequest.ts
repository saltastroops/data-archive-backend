import { IContext } from "../util";

interface IRoot {
  id: string;
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
  // todo: test if the user is authenticated
  // checkIIfUserLoggedin(user);

  // todo: group files by an observation.
  // query the MySQL database to find where the files belong to.
  // group all the files by an observation
  // todo: create data request with all the parts included.
  // return a prisma query for a data request

  const madeAt = new Date();

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

const DataRequestsTypes = { DataRequest, DataRequestPart };

export { createDataRequest, DataRequestsTypes };
