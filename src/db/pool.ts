import mysql from "mysql";
import util from "util";

// Database configuration parameters
const config = {
  database: process.env.DATABASE_NAME,
  host: process.env.DATABASE_HOST,
  password: process.env.DATABASE_PASSWORD,
  user: process.env.DATABASE_USER
};

// SDB configuration parameters
const sdbConfig = {
  database: process.env.SDB_DATABASE_NAME,
  host: process.env.SDB_DATABASE_HOST,
  password: process.env.SDB_DATABASE_PASSWORD,
  user: process.env.SDB_DATABASE_USER
};

// Creating a pool of database connections
const pool = mysql.createPool(config);
const sdbPool = mysql.createPool(sdbConfig);

// Establishing the database connection
pool.getConnection((err, connection) => {
  if (err) {
    throw Error("Something went wrong, please try again later.");
  }
  if (connection) {
    connection.release();
  }
  return;
});

// Promisifying the query function so that async / wait can be used
(pool.query as any) = util.promisify(pool.query);

// Establishing the sdb connection
sdbPool.getConnection((err, connection) => {
  if (err) {
    throw Error("Something went wrong, please try again later.");
  }
  if (connection) {
    connection.release();
  }
  return;
});

// Promisifying the query function so that async / wait can be used
(sdbPool.query as any) = util.promisify(sdbPool.query);

export default pool;
export { sdbPool };
