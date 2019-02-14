import createServer from "./createServer";

const launchServer = async () => {
  // Instantiate the server
  const server = createServer();

  // Start the server with CORS enabled
  (await server).start({
    cors: {
      credentials: true,
      origin: process.env.FRONTEND_URL
    }
  });
};

launchServer();
