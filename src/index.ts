import fs from "fs";
import createServer from "./createServer";

const launchServer = async () => {
  // Check if the environment variable for the data requests directory exists
  if (!process.env.DATA_REQUEST_BASE_DIR) {
    throw new Error(
      "The environment variable DATA_REQUEST_BASE_DIR has not been set."
    );
  }

  // Check if the data request base directory exists
  if (!fs.existsSync(process.env.DATA_REQUEST_BASE_DIR)) {
    throw new Error(
      `The data request base directory does not exist. Please set the value of the environment variable DATA_REQUEST_BASE_DIR to be an existing directory.`
    );
  }

  // Instantiate the server
  const server = createServer();

  if (process.env.NODE_ENV === "test") {
    return;
  }

  // Start the server with CORS enabled
  (await server).start({
    cors: {
      credentials: true,
      origin: process.env.FRONTEND_HOST
    }
  });
};

launchServer();
