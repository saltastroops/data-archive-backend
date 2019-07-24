import fs from "fs";
import moment from "moment";
import * as Path from "path";
import { ssdaPool } from "../db/pool";
import { Prisma } from "../generated/prisma-client";
import { getUserById, getUserByToken } from "../util/user";
import { queryDataFiles } from "./serchResults";

// Defining the context interface
interface IContext {
  loaders: { dataRequestLoader: any };
  prisma: Prisma;
  user: { id: number }; // TODO user interface
}

// Defining the data preview interface
interface IDataPreview {
  fitsHeader: string;
  imageURIs: string[];
}

// Defining Query methods
const Query = {
  /**
   * Get the currently logged in user,
   */
  async user(root: any, args: {}, ctx: IContext) {
    if (!ctx.user) {
      return null;
    }

    return getUserById(ctx.user.id);
  },

  async dataFiles(
    root: any,
    { columns, limit, startIndex, where }: any,
    ctx: IContext
  ) {
    const results = await queryDataFiles(columns, where, startIndex, limit);
    return results;
  },

  // Query for the current user's data requests
  // TODO UPDATE INCLUDE MORE INFORMATION IN THE FRAGMENT AS REQUIRED
  async dataRequests(
    root: any,
    args: { limit: number; startIndex: number },
    ctx: IContext
  ) {
    if (!ctx.user) {
      throw new Error("You must be logged in");
    }

    const { loaders } = ctx;
    const { dataRequestLoader } = loaders;

    const dataLoaderResults = await dataRequestLoader.load(ctx.user.id);

    console.log(dataLoaderResults);

    const limit = args.limit ? Math.min(args.limit, 200) : 200;

    return ctx.prisma.dataRequests({
      first: limit,
      orderBy: "madeAt_DESC",
      skip: args.startIndex
    }).$fragment(`{
      id
      madeAt
      uri
      parts {
        id
        status
        uri
        dataFiles {
          id
        }
      }
    }`);
  },

  async passwordResetTokenStatus(
    root: any,
    { token }: any,
    { prisma }: IContext
  ) {
    const user = await getUserByToken(token);
    if (!user) {
      return { status: false, message: "The token is unknown." };
    }

    // Check if token is not expired
    if (
      user.passwordResetTokenExpiry &&
      moment(user.passwordResetTokenExpiry) <= moment(Date.now())
    ) {
      return { status: false, message: "The token has expired." };
    }

    return { status: true };
  },

  /**
   * A query to retrieve data file preview details.
   *
   * The query returns an object that consists of the list
   * of images URIs and a string with the FITS headers.
   *
   * For example:
   *
   * {
   *    fitsHeaders: 'TEST = 5555\nTEST1 = 2222\n',
   *    imageURIs: [
   *      '/previews/Preview-1234.png'
   *    ']
   * }
   */
  async dataPreview(root: any, args: { dataFileId: number }, ctx: IContext) {
    // Query for retrieving the data previews
    const sql = `
      SELECT dataPreviewFileName, dataPreviewType, path
      FROM DataPreview AS dp 
      JOIN DataPreviewType AS dpt ON dp.dataPreviewTypeId = dpt.dataPreviewTypeId
      WHERE dp.dataFileId = ?
      ORDER BY dp.dataPreviewOrder
    `;

    // Querying the data previews
    const rows = await ssdaPool.query(sql, [args.dataFileId]);

    const results: IDataPreview = {
      fitsHeader: "",
      imageURIs: []
    };

    (rows as any).forEach(
      (row: {
        dataPreviewFileName: string;
        dataPreviewType: string;
        path: string;
      }) => {
        if (row.dataPreviewType === "Header") {
          // Get the base path if it exists
          const basePath = process.env.PREVIEW_BASE_DIR || "";

          // Form a full path for the file location
          const fullPath = Path.join(basePath, row.path);

          // Read in the file, which contains a FITS header.
          // If there are multiple FITS header files,
          // all headers are combined in a single string.
          results.fitsHeader += fs.readFileSync(fullPath, "utf-8");
        } else if (row.dataPreviewType === "Image") {
          // Add the image URI to the list of image URIs
          results.imageURIs.push(
            `/previews/${args.dataFileId}/${row.dataPreviewFileName}`
          );
        }
      }
    );

    return results;
  }
};

export { Query };
