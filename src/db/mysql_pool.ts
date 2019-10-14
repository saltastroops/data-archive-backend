import mysql from "mysql2/promise";

const createPool = (config: any) => {
  // Creating a pool of database connections
  const pool = mysql.createPool(config);

  // Test the database connection
  // (cf. https://medium.com/@mhagemann/create-a-mysql-database-middleware-with-node-js-8-and-async-await-6984a09d49f4)
  (async () => {
    try {
      const connection = await pool.getConnection();
      console.log(connection);
      connection.release();
    } catch (e) {
      if (e.code === "PROTOCOL_CONNECTION_LOST") {
        throw new Error("Database connection was closed.");
      }
      if (e.code === "ER_CON_COUNT_ERROR") {
        throw new Error("Database has too many connections.");
      }
      if (e.code === "ECONNREFUSED") {
        throw new Error("The Database connection was refused.");
      }
    }
  })();

  return pool;
};

// SDB configuration parameters
const sdbConfig = {
  database: process.env.SDB_DATABASE_NAME,
  host: process.env.SDB_DATABASE_HOST,
  password: process.env.SDB_DATABASE_PASSWORD,
  user: process.env.SDB_DATABASE_USER
};

// Creating poos of database connections
const sdbPool = createPool(sdbConfig);

export { sdbPool };
