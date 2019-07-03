import Database from "../connection";
import {
  createFromExpression,
  parseWhereCondition
} from "../util/observationsQuery";
import { dataModel } from "../util/tables";

/**
 *
 * @param columns:
 *      The columns you want to see, or get in your search results
 * @param whereCondition:
 *      A string containing the JSON object with the where condition.
 * @returns results:
 *      A query results arranged for the GraphQL to interpret
 */

export const queryDataFiles = async (columns: any, whereCondition: any) => {
  //  Database connection
  const connection = new Database();
  // Object containing where sql columns and mapping values
  const sqlWhere = parseWhereCondition(whereCondition);
  // All the data model tables need to make this query
  const sqlFrom = createFromExpression(columns, dataModel);

  const sql = `SELECT 
        ${columns.join(", ")}
    FROM ${sqlFrom} WHERE ${sqlWhere.sql}`;

  const results = await connection.query(sql, sqlWhere.values);

  return results.map((row: any) => ({
    row: [
      ...Object.entries(row).map(entry => ({
        column: entry[0],
        value: entry[1]
      }))
    ]
  }));
};
