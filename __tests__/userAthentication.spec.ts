import request from "supertest";
import { createServer } from "../src/createServer";
import { prisma } from "../src/generated/prisma-client";

// Creating an authenticated agent for making subsequent requests
async function authenticatedAgent(username: string, password: string) {
  const server = (await createServer()).createHttpServer({});
  const authenticatedAgent = request.agent(server);
  const response = await authenticatedAgent
    .post('/login')
    .send({ username, password});

  return authenticatedAgent;
}

beforeAll(() => {
  // Mocking users query
  prisma.users = jest.fn(async () => await [{
    id: "1",
    name: "Test",
    username: "test",
    password: "test"
  }]);

  // Mocking the user query
  prisma.user = jest.fn(async () => await {
      id: "1",
      name: "Test",
      username: "test",
      password: "test"
    }
  )
})

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

    // Logs out the user
    response = await agent.post('/logout');
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

    // Expect an error was thrown
    expect(JSON.parse(response.text).errors.length).toBe(1);
  });
});

describe('user query', () => {
  it('should return an error if the user is not logged in', async () => {  
    const server = (await createServer()).createHttpServer({});
    // An unauthenticated user attempt to perfom user query
    const response = await request.agent(server)
      .post('/')
      .send({
        query: `query { 
          user { 
            name 
          } 
        }`
      });
    // Expect an error thrown for unauthenticated user
    expect(JSON.parse(response.text).errors.length).toBe(1);
  })

  it('should return error if the user passed in invalid credentials', async () => {
    // Authenticating the user
    const agent = await authenticatedAgent('test', 'wrong');
    
    // unauthenticated user make a user query
    const response = await agent.post('/')
      .send({
        query: `query { 
          user { 
            name 
          } 
        }`
      });

    // Expect an error thrown for unauthenticated user
    expect(JSON.parse(response.text).errors.length).toBe(1);
  })
  
  it('should return the logged in user', async () => {
    // Authenticating the user
    const agent = await authenticatedAgent('test', 'test');
    
    // Authenticated user make a user query
    const response = await agent.post('/')
      .send({
        query: `query { 
          user { 
            name 
          } 
        }`
      });

    // Expect the name of the user to be the on of the authenticated user.
    expect(JSON.parse(response.text).data.user.name).toEqual("Test");
  })
});
