import fs from "fs";
import moment from "moment";
import Database from "../db/connection";
import { Prisma } from "../generated/prisma-client";

// Defining the context interface
interface IContext {
  prisma: Prisma;
  user: { id: string }; // TODO user interface
}

// Defining the data preview interface
interface IDataPreview {
  dataPreviewFilePaths: string[];
  dataPreviewFitsHeaders: string;
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
   *    dataPreviewFitsHeaders: 'TEST = 5555\nTEST1 = 2222\n',
   *    dataPreviewFilePaths: [
   *      '/previews/Preview-1234.png'
   *    ']
   * }
   */
  async dataPreview(root: any, args: { dataFileId: number }, ctx: IContext) {
    // Creates the database connection
    const conn = new Database();
    // Query for retrieving the data previews
    const sql = `
      SELECT dataPreviewType, path, dataFileId
      FROM DataPreview AS dp 
      JOIN DataPreviewType AS dpt ON dp.previewTypeId = dpt.dataPreviewTypeId
      WHERE dp.dataFileId = ?
    `;
    // Querying the data previews
    const rows = await conn.query(sql, [args.dataFileId]);

    let dataPreviewFitsHeaders: string = "";
    const dataPreviewFilePaths: string[] = [];

    rows.forEach((row: { path: string; dataPreviewType: string }) => {
      if (row.dataPreviewType === "Header") {
        // Read the file that contains FITS headers as a string
        dataPreviewFitsHeaders = fs.readFileSync(row.path, "utf-8");
      } else if (row.dataPreviewType === "Image") {
        // Add all the image paths to the list
        dataPreviewFilePaths.push(row.path);
      }
    });

    // Close the connection.
    conn.close();

    return {
      dataPreviewFilePaths,
      dataPreviewFitsHeaders
    };
  }
};

export { Query };
