import request from "supertest";
import { prisma } from "../src/generated/prisma-client";
import bcrypt from "bcrypt";
import createServer from "../src/createServer";

// Creating an authenticated agent for making subsequent requests
async function authenticatedAgent(username: string, password: string) {
  const server = (await createServer()).createHttpServer({});
  const authenticatedAgent = request.agent(server);
  const response = await authenticatedAgent
    .post('/auth/login')
    .send({ username, password});

  return authenticatedAgent;
}

beforeAll(() => {
  // Mocking users query
  prisma.users = jest.fn(async () => await [{
    id: "1",
    name: "Test",
    username: "test",
    password: await bcrypt.hash("test", 10)
  }]);

  // Mocking the user query
  prisma.user = jest.fn(async () => await {
      id: "1",
      name: "Test",
      username: "test",
      password: await bcrypt.hash("test", 10)
    }
  )
})

describe('logging in', () => {
  it('should log in the user', async () => {
    const server = (await createServer()).createHttpServer({});

    // Not yet authenticated user
    let response = await request.agent(server).post('/')
      .send({
        query: `query { 
          user { 
            name 
          } 
        }`
      });

    // Expect an error message for an unauthenticated user.
    expect(JSON.parse(response.text).errors.length).toBe(1);
    
    // User logging in.
    const authenticatedAgent = request.agent(server);
    
    response = await authenticatedAgent.post('/auth/login')
    .send({ username: 'test', password: 'test'});
    
    // Expect the user to be authenticated.
    expect(response.text).toEqual('You have been logged in');

    // Authenticated user
    response = await authenticatedAgent.post('/')
      .send({
        query: `query { 
          user { 
            name 
          } 
        }`
      });

    // Expect the name of the user to be the one of the authenticated user.
    expect(JSON.parse(response.text).data.user.name).toEqual("Test");
  })
});

describe('logging out', () => {
  it('should logout the user that was logged in', async () => {
    // Logs and thenticating the user
    const agent = await authenticatedAgent('test', 'test');

    // Query for the logged user
    let response = await agent
      .post('/')
      .send({
        query: `query { 
          user { 
            name 
          } 
        }`
      });

    // Expect the name of the user to be the one of the authenticated user.
    expect(JSON.parse(response.text).data.user.name).toEqual("Test");

    // Logs out the user
    response = await agent.post('/auth/logout');

    // expect the user has been logged out.
    expect(response.text).toEqual('You have been logged out');

    // The user is not logged in any longer
    response = await agent.post('/')
      .send({
        query: `query { 
          user { 
            name 
          } 
        }`
      });

    // Expect an error message for an unauthenticated user.
    expect(JSON.parse(response.text).errors.length).toBe(1);
  });
});

describe('Invalid credentials', () => {
  it('should return an unauthenticated error message and staus code', async () => {
    const server = (await createServer()).createHttpServer({});
    // User logging in with invalid credentials.
    const authenticatedAgent = request.agent(server);
    
    let response = await authenticatedAgent.post('/auth/login')
    .send({ username: 'test', password: 'wrong'});
    
    // Expect the user unauthenticated status code
    expect(response.status).toEqual(401);
    // Expect the user unauthenticated message.
    expect(response.text).toEqual('Username or password wrong');

    // Authenticated user
    response = await authenticatedAgent.post('/')
      .send({
        query: `query { 
          user { 
            name 
          } 
        }`
      });

    // Expect an error message for an unauthenticated user.
    expect(JSON.parse(response.text).errors.length).toBe(1);
  })
})
