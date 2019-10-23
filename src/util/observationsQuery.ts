/**
 * The (parsed) content of a where condition object.
 *
 * The SQL statement contains a placeholder (i.e. a '?') for values. The values
 * are given as the values array. The order of placeholders in the SQL statement
 * is consistent with the order of items in the values array. Hence you cam use
 * both when creating a prepared statement in MySQL.
 *
 * Boolean values are mapped to 1 for true and to 0 for false.
 */

import { DatabaseModel } from "./DatabaseModel";

export class WhereConditionContent {
  private columnsSet: Set<string>;

  private sqlString: string;

  private unparsedValues: Array<boolean | number | string>;

  constructor(
    sql: string,
    values: Array<boolean | number | string>,
    columns: Set<string>
  ) {
    this.sqlString = sql;
    this.unparsedValues = values;
    this.columnsSet = columns;
  }

  /**
   * Return the SQL representing the where condition.
   *
   * Placeholders ('?') are used for values. Use the values method to the values
   * to insert.
   */
  public get sql() {
    return this.sqlString;
  }

  /**
   * Return the values used in the where condition.
   *
   * The array returned by this method can be used together with the SQL
   * returned by the sql method when generatinbg a prepared MySQL statement.
   *
   * Boolean values in the where condition are replaced with 1 for true and 0
   * for false.
   */
  public get values(): Array<number | string> {
    return this.unparsedValues.map(v =>
      typeof v !== "boolean" ? v : v ? 1 : 0
    );
  }

  /**
   * Return the set of columns used in the where condition.
   */
  public get columns() {
    return this.columnsSet;
  }

  /**
   * Replace the first occurrence of a string in the SQL with another one.
   */
  public replaceInSQL(searchString: string, replaceString: string) {
    this.sqlString = this.sqlString.replace(searchString, replaceString);
  }
}

/**
 * Parse the given where condition into a SQL statement, its values and the
 * columns used in the condition.
 *
 * The SQL statement contains a placeholder (i.e. a '?') for values. The values
 * are given as the values array. The order of placeholders in the SQL statement
 * is consistent with the order of items in the values array. Hence you cam use
 * both when creating a prepared statement in MySQL.
 *
 * Boolean values are mapped to 1 for true and to 0 for false.
 *
 * Parameters:
 * -----------
 * where:
 *     A string containing the JSON object with the where condition.
 *
 * Returns:
 * --------
 * An object with The SQL statement, its values abd the columns used.
 */
export function parseWhereCondition(where: string): WhereConditionContent {
  const PLACEHOLDER = "<|???|>";

  function convertToSQL(o: any): WhereConditionContent {
    let sql: string;
    let values: Array<boolean | number | string>;
    const columns = new Set<string>();

    if (o.AND) {
      if (!Array.isArray(o.AND)) {
        throw new Error("The AND value must be an array.");
      }
      sql =
        "(" +
        (o.AND as any[]).map(v => convertToSQL(v).sql).join(" AND ") +
        ")";
      values = (o.AND as any[]).reduce(
        (prev: Array<number | string>, condition) => [
          ...prev,
          ...convertToSQL(condition).values
        ],
        []
      );
      (o.AND as any[]).forEach(v => {
        for (const column of Array.from(convertToSQL(v).columns)) {
          columns.add(column);
        }
      });
    } else if (o.OR) {
      if (!Array.isArray(o.OR)) {
        throw new Error("The OR value must be an array.");
      }
      sql =
        "(" + (o.OR as any[]).map(v => convertToSQL(v).sql).join(" OR ") + ")";
      values = (o.OR as any[]).reduce(
        (prev: Array<number | string>, condition) => [
          ...prev,
          ...convertToSQL(condition).values
        ],
        []
      );
      (o.OR as any[]).forEach(v => {
        for (const column of Array.from(convertToSQL(v).columns)) {
          columns.add(column);
        }
      });
    } else if (o.NOT) {
      sql = "NOT(" + convertToSQL(o.NOT).sql + ")";
      values = convertToSQL(o.NOT).values;
      for (const column of Array.from(convertToSQL(o.NOT).columns)) {
        columns.add(column);
      }
    } else if (o.EQUALS) {
      validateColumn(o.EQUALS.column);
      validateValue(o.EQUALS.value);
      sql = "(" + o.EQUALS.column + " = " + PLACEHOLDER + ")";
      values = [o.EQUALS.value];
      columns.add(o.EQUALS.column);
    } else if (o.IS_NULL) {
      validateColumn(o.IS_NULL.column);
      sql = "(" + o.IS_NULL.column + " IS NULL)";
      values = [];
      columns.add(o.IS_NULL.column);
    } else if (o.LESS_THAN) {
      validateColumn(o.LESS_THAN.column);
      validateValue(o.LESS_THAN.value);
      sql = "(" + o.LESS_THAN.column + " < " + PLACEHOLDER + ")";
      values = [o.LESS_THAN.value];
      columns.add(o.LESS_THAN.column);
    } else if (o.GREATER_THAN) {
      validateColumn(o.GREATER_THAN.column);
      validateValue(o.GREATER_THAN.value);
      sql = "(" + o.GREATER_THAN.column + " > " + PLACEHOLDER + ")";
      values = [o.GREATER_THAN.value];
      columns.add(o.GREATER_THAN.column);
    } else if (o.LESS_EQUAL) {
      validateColumn(o.LESS_EQUAL.column);
      validateValue(o.LESS_EQUAL.value);
      sql = "(" + o.LESS_EQUAL.column + " <= " + PLACEHOLDER + ")";
      values = [o.LESS_EQUAL.value];
      columns.add(o.LESS_EQUAL.column);
    } else if (o.GREATER_EQUAL) {
      validateColumn(o.GREATER_EQUAL.column);
      validateValue(o.GREATER_EQUAL.value);
      sql = "(" + o.GREATER_EQUAL.column + " >= " + PLACEHOLDER + ")";
      values = [o.GREATER_EQUAL.value];
      columns.add(o.GREATER_EQUAL.column);
    } else if (o.IS_IN) {
      validateColumn(o.IS_IN.column);
      o.IS_IN.values.forEach((value: any) => validateValue(value));
      sql =
        "(" +
        o.IS_IN.column +
        " = ANY(ARRAY[" +
        o.IS_IN.values.map((v: any) => PLACEHOLDER).join(", ") +
        "]))";
      values = [...o.IS_IN.values];
      columns.add(o.IS_IN.column);
    } else if (o.CONTAINS) {
      validateColumn(o.CONTAINS.column);
      validateValue(o.CONTAINS.value);
      const escapeChar = escapeCharacter(o.CONTAINS.value);
      sql =
        "(" +
        o.CONTAINS.column +
        " LIKE " +
        PLACEHOLDER +
        " ESCAPE '" +
        escapeChar +
        "')";
      values = [
        "%" + o.CONTAINS.value.replace(/([%_])/g, escapeChar + "$1") + "%"
      ];
      columns.add(o.CONTAINS.column);
    } else if (o.STARTS_WITH) {
      validateColumn(o.STARTS_WITH.column);
      validateValue(o.STARTS_WITH.value);
      const escapeChar = escapeCharacter(o.STARTS_WITH.value);
      sql =
        "(" +
        o.STARTS_WITH.column +
        " LIKE " +
        PLACEHOLDER +
        " ESCAPE '" +
        escapeChar +
        "')";
      values = [
        o.STARTS_WITH.value.replace(/([%_])/g, escapeChar + "$1") + "%"
      ];
      columns.add(o.STARTS_WITH.column);
    } else if (o.ENDS_WITH) {
      validateColumn(o.ENDS_WITH.column);
      validateValue(o.ENDS_WITH.value);
      const escapeChar = escapeCharacter(o.ENDS_WITH.value);
      sql =
        "(" +
        o.ENDS_WITH.column +
        " LIKE " +
        PLACEHOLDER +
        " ESCAPE '" +
        escapeChar +
        "')";
      values = ["%" + o.ENDS_WITH.value.replace(/([%_])/g, escapeChar + "$1")];
      columns.add(o.ENDS_WITH.column);
    } else if (o.WITHIN_RADIUS) {
      const rightAscensionColumn = o.WITHIN_RADIUS.rightAscensionColumn;
      const rightAscension: any = o.WITHIN_RADIUS.rightAscension;
      const declinationColumn = o.WITHIN_RADIUS.declinationColumn;
      const declination: any = o.WITHIN_RADIUS.declination;
      const radius: any = o.WITHIN_RADIUS.radius;

      // Validate the columns
      validateColumn(declinationColumn);
      validateColumn(rightAscensionColumn);

      // Validate the right ascension
      validateValue(rightAscension);
      if (
        typeof rightAscension !== "number" ||
        rightAscension < 0 ||
        rightAscension > 360
      ) {
        throw new Error(
          "The right ascension must be a number between 0 and 360 degrees."
        );
      }

      // Validate the declination
      validateValue(declination);
      validateValue(radius);
      if (
        typeof declination !== "number" ||
        declination < -90 ||
        declination > 90
      ) {
        throw new Error(
          "The declination must be a number between -90 and 90 degrees.."
        );
      }

      // Validate the radius. Too large a radius would wreak all sorts of havoc.
      if (typeof radius !== "number" || radius <= 0 || radius > 1) {
        throw new Error(
          "The radius must be a positive number not greater than 1 degree."
        );
      }

      // As calculating distances is computationally expensive, we limit the
      // search to targets with in small "square" around the position. The side
      // length is 4 times the radius.
      sql = "(";
      values = [];
      const upperAbsDeclination = Math.abs(declination) + 2 * radius;
      if (Math.abs(upperAbsDeclination) < 89) {
        sql += "(";

        // limiting right ascension
        const dRA = radius / Math.cos((upperAbsDeclination * Math.PI) / 180);
        const minRA = rightAscension - dRA;
        const maxRA = rightAscension + dRA;
        if (minRA < 0) {
          sql += `((${rightAscensionColumn} BETWEEN 0 AND " + parameterPlaceholder() + ") OR (${rightAscensionColumn} BETWEEN " + parameterPlaceholder() + " AND 360))`;
          values.push(maxRA, 360 + minRA);
        } else if (maxRA > 360) {
          sql += `((${rightAscensionColumn} BETWEEN 0 AND " + parameterPlaceholder() + ") OR (${rightAscensionColumn} BETWEEN " + parameterPlaceholder() + " AND 360))`;
          values.push(maxRA - 360, minRA);
        } else {
          sql += `(${rightAscensionColumn} BETWEEN " + parameterPlaceholder() + " AND " + parameterPlaceholder() + ")`;
          values.push(minRA, maxRA);
        }

        // limiting declination
        const minDec = declination - 2 * radius;
        const maxDec = declination + 2 * radius;
        sql += ` AND (${declinationColumn} BETWEEN " + parameterPlaceholder() + " AND " + parameterPlaceholder() + ")`;
        values.push(minDec, maxDec);

        sql += ")";
      } else {
        // As the position is close to one of the celestial poles we don't
        // restrict right ascension values.
        const minDec = Math.max(declination - 2 * radius, -90);
        const maxDec = Math.min(declination + 2 * radius, 90);
        sql += `(${declinationColumn} BETWEEN " + parameterPlaceholder() + " AND " + parameterPlaceholder() + ")`;
        values.push(minDec, maxDec);
      }

      // We assume that there exists a stored function called ANGULAR_DISTANCE
      // with the following signature:
      //
      // ANGULAR_DISTANCE(latitude1, longitude1, latitude2, longitude2)
      //
      // This must return the angular distance in degrees between the two
      // positions.
      //
      // See
      // https://www.plumislandmedia.net/mysql/vicenty-great-circle-distance-formula/
      // for a possible implementation of the function.
      if (0 == 0) throw new Error("NOT UPDATED YET!!!");
      sql += ` AND (ANGULAR_DISTANCE(${declinationColumn}, ${rightAscensionColumn}, " + parameterPlaceholder() + ", " + parameterPlaceholder() + ") <= " + parameterPlaceholder() + ")`;
      values.push(declination, rightAscension, radius);
      sql += ")";

      columns.add(declinationColumn).add(rightAscensionColumn);
    } else {
      throw new Error("The where condition could not be parsed.");
    }
    return new WhereConditionContent(sql, values, columns);
  }

  const w = JSON.parse(where);

  if (!Object.keys(w).length) {
    return new WhereConditionContent("1=1", [], new Set());
  }

  let parsed = convertToSQL(w);

  // replace the placeholder string with the correct placeholders ($1, $2, ...)
  for (let i = 1; i <= parsed.values.length; i++) {
    parsed.replaceInSQL(PLACEHOLDER, `\$${i}`);
  }

  return parsed;
}

/**
 * Return a string which can be used as escape character in a LIKE condition
 * with in a given text.
 *
 * Parameters:
 * -----------
 * text:
 *     Text
 *
 * Returns:
 * --------
 * The escape character.
 */
function escapeCharacter(text: string): string {
  const escapeChars = ["|", "#", "=", "@"];
  const escapeChar = escapeChars.find(c => !text.includes(c));
  if (!escapeChar) {
    throw new Error(
      `A text search string must not contain all of ${escapeChars.join(", ")}.`
    );
  }
  return escapeChar;
}

/**
 * Create the SQL FROM expression required for querying a set of columns. The
 * FROM keyword is not included in the expression.
 *
 * Parameters:
 * -----------
 * columns:
 *     The columns.
 * dm:
 *     The database model describing the table dependencies.
 *
 * Returns:
 * --------
 * The FROM expression.
 */
export function createFromExpression(columns: Set<string>, dm: DatabaseModel) {
  // There must be at least one column
  if (columns.size === 0) {
    throw new Error("There must be at least one column.");
  }

  /**
   * Check whether a table a must be to the right of a table b.
   */
  function mustBeRightOf(a: string, b: string) {
    return dm.dependencies(a).has(b);
  }

  /**
   * Collect the tables required in the FROM expression if the given table is
   * queried for. The tables are added in the correct order to the given array
   * of tables.
   */
  function collectFromTables(fromTables: string[], table: string) {
    // If the table is in the array already, there is nothing to do
    if (fromTables.findIndex(t => t === table) !== -1) {
      return;
    }

    // Insert the table as far to the left as possible
    let index = fromTables.length;
    while (index > 0 && !mustBeRightOf(table, fromTables[index - 1])) {
      index--;
    }
    fromTables.splice(index, 0, table);

    // Add all the tables the table depends on
    for (const dep of Array.from(dm.dependencies(table))) {
      collectFromTables(fromTables, dep);
    }
  }

  // Get the tables to which the columns belong
  const tablesArray = Array.from(columns).map(column => column.split(".")[0]);

  // Figure out the tables (and their order) for the FROM expression
  const columnTables = new Set<string>(tablesArray);
  const tables: string[] = [];
  for (const table of Array.from(columnTables)) {
    collectFromTables(tables, table);
  }

  // Sanity check: there must be a single root dependency, i.e. every table
  // other than the first one must depend on the first table
  for (let i = 1; i < tables.length; i++) {
    if (!mustBeRightOf(tables[i], tables[0])) {
      throw new Error("There must be a single root dependency");
    }
  }

  // Now that we have the tables we can construct the FROM expression by joining
  // the tables with their JOIN statements
  let fromSQL = `"${tables[0]}"`;
  for (let i = 1; i < tables.length; i++) {
    fromSQL += ` LEFT JOIN "${tables[i]}" ON (${dm.table(tables[i]).join})`;
  }
  return fromSQL;
}

function validateColumn(column: string | null | undefined) {
  if (column === undefined) {
    throw new Error("The column must not be undefined.");
  }
  if (column === null) {
    throw new Error("The column must be non-null.");
  }
  const wrongFormatMessage =
    'A column must be of the form "A.B with a table name A and a column name B. Both the table name and the column name must only contain letters from A to Z (either upper or lower case), digits and underscores.';
  if (column.split(".").length !== 2) {
    throw new Error(wrongFormatMessage);
  }
  const [tableName, columnName] = column.split(".");
  if (!tableName || !columnName) {
    throw new Error(wrongFormatMessage);
  }
  const nameRegex = /^[A-Z\d_]+$/i;
  if (!nameRegex.test(tableName) || !nameRegex.test(columnName)) {
    throw new Error(wrongFormatMessage);
  }
}

function validateValue(value: any) {
  if (value === undefined) {
    throw new Error("The value must not be undefined.");
  }
}
