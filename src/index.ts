import { createServer } from "./createServer";

// Instatiate the server
const server = createServer();

// Starting the server with the cors enabled
server.start({
  cors: {
    credentials: true,
    origin: process.env.FRONTEND_URL
  }
});

export { server };
