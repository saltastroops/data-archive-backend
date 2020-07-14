import fs from "fs";
import createServer from "./createServer";

const launchServer = async () => {
  // Instantiate the server
  const server = createServer();

  if (process.env.NODE_ENV === "test") {
    return;
  }

  // Check if the data request base directory exists
  if (!fs.existsSync(process.env.DATA_REQUEST_BASE_DIR || "")){
    throw new Error(
        `The data request base directory does not exist please set environment variable 'DATA_REQUEST_BASE_DIR' to be an
         existing directory`
    );
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
