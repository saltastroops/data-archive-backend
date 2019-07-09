import mysql from "mysql";

interface IDatabaseConnection {
    database: string;
    host: string;
    password: string;
    user: string;
}

export const ssdaConfig = {
    database: process.env.DATABASE_NAME as string,
    host: process.env.DATABASE_HOST as string,
    password: process.env.DATABASE_PASSWORD as string,
    user: process.env.DATABASE_USER as string
};

class Database {
  public connection: any;

    constructor( config: IDatabaseConnection ) {
        this.connection = mysql.createConnection( config );
    }
  query(sql: string, args: Array<string | boolean | number> = []): any {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, args, (err: any, rows: any) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  }
  public close() {
    return new Promise((resolve, reject) => {
      this.connection.end((err: any) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }
}
export default Database;
