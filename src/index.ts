import createServer from "./createServer";

const launchServer = async () => {
  // Instantiate the server
  const server = createServer();

  if (process.env.NODE_ENV) {
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
