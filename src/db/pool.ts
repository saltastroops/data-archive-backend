import mysql from "mysql";
import util from "util";

const poolConnection = (config: any) => {
  // Creating a pool of database connections
  const pool = mysql.createPool(config);

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

  return pool;
};

// Database configuration parameters
const ssdaConfig = {
  database: process.env.SSDA_DATABASE_NAME,
  host: process.env.DATABASE_HOST,
  password: process.env.DATABASE_PASSWORD,
  user: process.env.DATABASE_USER
};

// Database configuration parameters
const ssdaAdminconfig = {
  database: process.env.SSDA_ADMIN_DATABASE_NAME,
  host: process.env.DATABASE_HOST,
  password: process.env.DATABASE_PASSWORD,
  user: process.env.DATABASE_USER
};

const ssdaPool = poolConnection(ssdaConfig);
const ssdaAdminPool = poolConnection(ssdaAdminconfig);

export { ssdaPool, ssdaAdminPool };
