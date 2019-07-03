import mysql from "mysql";
import util from "util";

/**
 * A database class
 */
class Database {
  public connection: any;

  private config = {
    database: process.env.DATABASE_NAME,
    host: process.env.DATABASE_HOST,
    password: process.env.DATABASE_PASSWORD,
    user: process.env.DATABASE_USER
  };

  /**
   * A constructor function which creates the new database connection
   */
  constructor() {
    this.connection = mysql.createConnection(this.config);
    // Promisifying the query and end functions so that can use async / wait
    this.connection.query = util.promisify(this.connection.query);
    this.connection.end = util.promisify(this.connection.end);
  }

  /**
   * A function that is responsible for making the SQL query.
   * It returns a Promise.
   *
   * @param sql the SQL query e.g 'SELECT * FROM table'
   * @param args the paremeters for the SQL query e.g. [pram1, param2]
   */
  query = async (sql: any, args?: any[]) => {
    return this.connection.query(sql, args);
  };

  /**
   * A function that is responsible for closing the database connection.
   * It returns a Promise
   */
  close = async () => this.connection.end();
}
export default Database;
