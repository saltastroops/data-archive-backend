import { Pool } from "pg";

const createPool = (config: any) => {
  // Creating a pool of database connections
  const pool = new Pool(config);

  // Test the database connection
  (async () => {
    try {
      await pool.query("SELECT count(*) FROM admin.proposal_investigator");
    } catch (e) {
      throw new Error("Connection to database failed.");
    }
  })();

  return pool;
};

// Database configuration parameters (for observation queries)
const ssdaConfig = {
  database: process.env.SSDA_DATABASE_NAME,
  host: process.env.SSDA_DATABASE_HOST,
  password: process.env.SSDA_DATABASE_PASSWORD,
  user: process.env.SSDA_DATABASE_USER
};

// Creating pool of database connections
const ssdaPool = createPool(ssdaConfig);

export { ssdaPool };
