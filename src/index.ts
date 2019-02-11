import createServer from "./createServer";

const launchServer = async () => {
  // Instatiate the server
  const server = createServer();

  // Starting the server with the cors enabled
  (await server).start({
    cors: {
      credentials: true,
      origin: process.env.FRONTEND_URL
    }
  });
};

launchServer();
