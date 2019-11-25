import { ssdaPool } from "../db/postgresql_pool";
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
  allColumns.add("artifact.artifact_id");
  allColumns.add("artifact.content_length");
  allColumns.add("artifact.name");
  allColumns.add("observation_time.start_time");
  whereDetails.columns.forEach(column => allColumns.add(column));

  // All the data model tables need to make this query
  const sqlFrom = createFromExpression(allColumns, dataModel);

  // Get the data file details
  const fields = Array.from(allColumns).map(
    column => `${column} AS "${column}"`
  );

  const sql = `
     WITH cte AS (
       SELECT ${Array.from(fields).join(", ")}
       FROM ${sqlFrom}
       WHERE ${whereDetails.sql}
     )
     SELECT *
     FROM (
       TABLE cte
       ORDER BY cte."observation_time.start_time" DESC
       LIMIT \$${whereDetails.values.length + 1}
       OFFSET \$${whereDetails.values.length + 2} 
     ) AS search_results
     RIGHT JOIN (SELECT COUNT(*) FROM cte) AS search_results_count (items_total) ON true
     ORDER BY "observation_time.start_time" DESC
  `;

  const results: any = (await ssdaPool.query(sql, [
    ...whereDetails.values,
    limit,
    startIndex
  ])).rows;

  // Due to the RIGHT JOIN in the SQL query, there is guaranteed to be at least one row.
  if (results[0].items_total === "0") {
    return {
      dataFiles: [],
      pageInfo: {
        itemsPerPage: limit,
        itemsTotal: 0,
        startIndex
      }
    };
  }

  // Get the number of search results
  const itemsTotal = results[0].items_total;

  // Which of the files are owned by the user?
  const ids = results.map((row: any) => row["artifact.artifact_id"]);
  const userOwnedFileIds = await ownsOutOfDataFiles(user, ids);

  // Collect all the details
  const pageInfo = {
    itemsPerPage: limit,
    itemsTotal,
    startIndex
  };

  const dataFiles = results.map((row: any) => ({
    id: row["artifact.artifact_id"],
    metadata: [
      ...Object.entries(row)
        .filter(
          entry => !["artifact.artifact_id, items_total"].includes(entry[0])
        )
        .map(entry => ({
          name: entry[0],
          value: entry[1]
        }))
    ],
    ownedByUser: userOwnedFileIds.has(row["artifact.artifact_id"].toString())
  }));

  return {
    dataFiles,
    pageInfo
  };
};
