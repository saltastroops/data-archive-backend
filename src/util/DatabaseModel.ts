export interface IDatabaseTableInfo {
  name: string;
  rightOf: Set<string>;
  join: string;
}

export class DatabaseModel {
  public constructor(private tables: Set<IDatabaseTableInfo>) {}

  /**
   * Return the table with the given name. An error is raised if there is no
   * such table.
   *
   * Parameters:
   * -----------
   * name:
   *     The table name.
   *
   * Returns:
   * --------
   * The table with the given name.
   */
  public table(name: string) {
    const t = Array.from(this.tables).find(v => v.name === name);
    if (!t) {
      throw new Error(`The table ${t} does not exist in the database model.`);
    }
    return t;
  }

  /**
   * Get the dependencies for a table.
   *
   * A table is a dependency for the given table if it can be reached by
   * recursively following rightOf values.
   *
   * An error is raised if a cyclic dependency (such as A -> B -> C -> A) is
   * found.
   *
   * Parameters:
   * -----------
   * table:
   *     The name of the table whose dependencies are queried for.
   *
   *  Returns:
   *  --------
   *  The dependencies.
   */
  public dependencies(name: string) {
    const findDependencies = (
      startTableName: string,
      dependents: Set<string>
    ) => {
      const deps = new Set<string>();

      const startTable = this.table(startTableName);
      startTable.rightOf.forEach(tableName => {
        // If t has been encountered before, there is a cyclic dependency, and
        // we have to abort.
        if (dependents.has(tableName)) {
          throw new Error("The database model contains a cyclic dependency.");
        }

        // t is a dependency
        deps.add(tableName);

        // Record the fact that we've encountered t
        const newDependents = new Set<string>(Array.from(dependents));
        newDependents.add(tableName);

        // Go on (recursively) with the search for dependencies
        for (const d of Array.from(
          findDependencies(tableName, newDependents)
        )) {
          deps.add(d);
        }
      });

      return deps;
    };

    return findDependencies(name, new Set([name]));
  }
}
