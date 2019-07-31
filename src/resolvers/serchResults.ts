import { ssdaPool } from "../db/pool";
import {
  createFromExpression,
  parseWhereCondition
} from "../util/observationsQuery";
import { dataModel } from "../util/tables";
import { ownsOutOfDataFiles, User } from "../util/user";

/**
 *
 * @param columns:
 *      The columns to include in the search results
 * @param where:
 *      A string containing the JSON object with the where condition.
 * @param startIndex:
 *      The index of the first row to include in the search results. An offset
 *      of zero is assumed, i.e. a start index of 5 refers to row 6. The value
 *      corresponds to the OFFSET of the MySQL query.
 * @param limit:
 *      Maximum number of search results to return. This corresponds to the
 *      LIMIT of the MySQL query.
 * @param user:
 *      The currently logged in user.
 * @returns results:
 *      A query results arranged for the GraphQL to interpret
 */

export const queryDataFiles = async (
  columns: [string],
  where: string,
  startIndex: number,
  limit: number,
  user: User | undefined
) => {
  // Object containing where sql columns and mapping values
  const whereDetails = parseWhereCondition(where);

  // Make sure there are columns to return
  if (!columns.length) {
    throw new Error("The list of columns must not be empty.");
  }

  // Columns to include in the search results
  const allColumns = new Set(columns);
  allColumns.add("DataFile.dataFileId");
  whereDetails.columns.forEach(column => allColumns.add(column));

  // All the data model tables need to make this query
  const sqlFrom = createFromExpression(allColumns, dataModel);

  // First pass: Get the number of search results
  const countSQL = `
      SELECT COUNT(*) as itemsTotal FROM ${sqlFrom} WHERE ${whereDetails.sql}
      `;
  const countResults: any = (await ssdaPool.query(countSQL, [
    ...whereDetails.values
  ]))[0];
  const itemsTotal = countResults[0].itemsTotal;

  // Second pass: Get the data file details
  const fields = Array.from(allColumns).map(
    column => `${column} AS \`${column}\``
  );
  const itemSQL = `
      SELECT ${Array.from(fields).join(", ")}
             FROM ${sqlFrom}
      WHERE ${whereDetails.sql}
      ORDER BY DataFile.startTime DESC
      LIMIT ? OFFSET ?
             `;
  const itemResults: any = (await ssdaPool.query(itemSQL, [
    ...whereDetails.values,
    limit,
    startIndex
  ]))[0];

  // Which of the files are owned by the user?
  const ids = itemResults.map((row: any) => row["DataFile.dataFileId"]);
  const userOwnedFileIds = await ownsOutOfDataFiles(user, ids);

  // Collect all the details
  const pageInfo = {
    itemsPerPage: limit,
    itemsTotal,
    startIndex
  };
  const dataFiles = itemResults.map((row: any) => ({
    id: row["DataFile.dataFileId"],
    metadata: [
      ...Object.entries(row).map(entry => ({
        name: entry[0],
        value: entry[1]
      }))
    ],
    ownedByUser: userOwnedFileIds.has(row["DataFile.dataFileId"].toString())
  }));

  return {
    dataFiles,
    pageInfo
  };
};
