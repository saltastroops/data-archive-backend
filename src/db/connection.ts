import mysql from "mysql";
import util from "util";

// Database configuration parameters
const config = {
  database: process.env.DATABASE_NAME,
  host: process.env.DATABASE_HOST,
  password: process.env.DATABASE_PASSWORD,
  user: process.env.DATABASE_USER
};

// Creating a pool of database connections
// It is a good practice to use a pool of connections
// for database connection management purposes
const dbConnection = mysql.createPool(config);

// Establishing the database connection
dbConnection.getConnection((err, connection) => {
  if (err) {
    throw Error("Something went wrong, please try again later.");
  }
  if (connection) {
    connection.release();
  }
  return;
});

// Promisifying the query function so that async / wait can be used
(dbConnection.query as any) = util.promisify(dbConnection.query);

export { dbConnection };
