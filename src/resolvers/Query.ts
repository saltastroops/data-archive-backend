import fs from "fs";
import moment from "moment";
import { dbConnection } from "../db/connection";
import { Prisma } from "../generated/prisma-client";
import { queryDataFiles } from "./serchResults";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

// Defining the data preview interface
interface IDataPreview {
  imageURIs: string[];
  fitsHeaders: string;
}

// Defining Query methods
const Query = {
  /**
   * Get the currently logged in user,
   */
  user(root: any, args: {}, ctx: IContext) {
    if (!ctx.user) {
      return null;
    }
    return ctx.prisma.user({
      id: ctx.user.id
    });
  },

  async dataFiles(root: any, args: any, ctx: IContext) {
    const results = await queryDataFiles(args.columns, args.where);
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
          name
          observation {
            name
          }
        }
      }
    }`);
  },

  async passwordResetTokenStatus(
    root: any,
    { token }: any,
    { prisma }: IContext
  ) {
    const user = await prisma.user({
      passwordResetToken: token
    });
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
      SELECT dataPreviewType, path, dataFileId
      FROM DataPreview AS dp 
      JOIN DataPreviewType AS dpt ON dp.previewTypeId = dpt.dataPreviewTypeId
      WHERE dp.dataFileId = ?
      ORDER BY dp.previewOrder
    `;
    // Querying the data previews
    const rows = await dbConnection.query(sql, [args.dataFileId]);

    const results: IDataPreview = {
      fitsHeaders: "",
      imageURIs: []
    };

    (rows as any).forEach((row: { path: string; dataPreviewType: string }) => {
      if (row.dataPreviewType === "Header") {
        // Read the file that contains FITS headers,
        // If there are multiple files, include all FITS headers in a string
        results.fitsHeaders += fs.readFileSync(row.path, "utf-8");
      } else if (row.dataPreviewType === "Image") {
        // Add all the image URIs to the list
        results.imageURIs.push(row.path);
      }
    });

    return results;
  }
};

export { Query };
