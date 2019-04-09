jest.mock("../generated/prisma-client");

import bcrypt from "bcrypt";
import {
  prisma,
  UserUpdateInput,
  UserWhereInput
} from "../generated/prisma-client";
import { resolvers } from "../resolvers";

// Defining update user interface
interface IUserUpdateInput extends UserUpdateInput {
  id?: string;
  newPassword?: string;
}

beforeAll(() => {
  // Mocking the updateUser mutation
  (prisma.updateUser as any).mockImplementation(
    (args: { data: UserUpdateInput; where: UserWhereInput }) =>
      Promise.resolve({
        affiliation: args.data.affiliation,
        email: args.data.email,
        familyName: args.data.familyName,
        givenName: args.data.givenName,
        password: args.data.password,
        username: args.data.username
      })
  );
});

afterAll(() => {
  // Cleaning up
  (prisma.user as any).mockReset();
  (prisma.users as any).mockReset();
  (prisma.updateUser as any).mockReset();
});

describe("User update", () => {
  it("should update the user information of the currently logged in user", async () => {
    // Updating user with valid information.
    const args: IUserUpdateInput = {
      affiliation: "New affiliation",
      email: "new@unique.email",
      familyName: "New family name",
      givenName: "New given name",
      newPassword: "New password",
      password: "test",
      username: "new unique username"
    };

    // Mock the users query.
    // An empty list is returned as we assume that the given email address and
    // username are not in use already.
    (prisma.users as any).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    // Mocking the user query.
    // User to update
    (prisma.user as any).mockImplementation(async () => ({
      affiliation: "Test Affiliation",
      email: "test@gmail.com",
      familyName: "Test",
      givenName: "Test",
      id: "1",
      password: await bcrypt.hash("test", 10),
      username: "test"
    }));

    // Update the user
    await resolvers.Mutation.updateUser({}, args, {
      prisma,
      user: { id: "1" }
    });

    // Expect updateUser to have been called
    expect(prisma.updateUser).toHaveBeenCalled();

    // updateUser should have been called with the submitted arguments, but
    // the password should have been hashed. So for comparison purposes we
    // need the arguments without the password.
    const argumentsWithoutPassword = { ...args };
    delete argumentsWithoutPassword.password;
    delete argumentsWithoutPassword.newPassword;

    const storedDataWithoutPassword = {
      ...(prisma.updateUser as any).mock.calls[0][0].data
    };
    delete storedDataWithoutPassword.password;

    // Expect the updated user information to have been stored in the database.
    expect(storedDataWithoutPassword).toEqual(argumentsWithoutPassword);

    // Expect the updated user password stored in the database to have been hashed.
    expect((prisma.updateUser as any).mock.calls[0][0].data.password).not.toBe(
      args.password
    );
  });

  it("should update the user information of a user other than the logged in user", async () => {
    // Updating user with valid information.
    const args: IUserUpdateInput = {
      affiliation: "New affiliation",
      email: "new@unique.email",
      familyName: "New family name",
      givenName: "New given name",
      id: "2",
      newPassword: "New password",
      password: "test",
      username: "new unique username"
    };

    // Mock the users query.
    // An empty list is returned as we assume that the given email address and
    // username are not in use already.
    (prisma.users as any).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    // Mock the user query for the he currently logged in user
    (prisma.user as any).mockImplementation(async () => ({
      affiliation: "Test Affiliation",
      email: "test@gmail.com",
      familyName: "Test",
      givenName: "Test",
      id: "1",
      password: await bcrypt.hash("test", 10),
      roles: ["ADMIN"],
      username: "test"
    }));

    // Update the user
    await resolvers.Mutation.updateUser({}, args, {
      prisma,
      user: { id: "1" }
    });

    // Expect updateUser to have been called
    expect(prisma.updateUser).toHaveBeenCalled();

    // updateUser should have been called with the submitted arguments, but
    // the password should have been hashed.
    // When updating the user information, an id of that user remains unchanged.
    // So for comparison purposes we need the arguments without the password and
    // the id.
    const argumentsWithoutPasswordAndId = { ...args };
    delete argumentsWithoutPasswordAndId.password;
    delete argumentsWithoutPasswordAndId.newPassword;
    delete argumentsWithoutPasswordAndId.id;

    const storedDataWithoutPassword = {
      ...(prisma.updateUser as any).mock.calls[0][0].data
    };
    delete storedDataWithoutPassword.password;

    // Expect the updated user information to have been stored in the database.
    expect(storedDataWithoutPassword).toEqual(argumentsWithoutPasswordAndId);

    // Expect the updated user password stored in the database to have been
    // hashed.
    expect((prisma.updateUser as any).mock.calls[0][0].data.password).not.toBe(
      args.password
    );
  });

  it("should raise an error if the current password is wrong", async () => {
    // Updating user with an invalid password.
    const args: IUserUpdateInput = {
      password: "wrongpassword"
    };

    // Mock the user query for the currently logged in user
    (prisma.user as any).mockImplementation(async () => ({
      id: "1",
      password: await bcrypt.hash("test", 10)
    }));

    // Expect the user update to fail with the appropriate error
    let message = null;
    try {
      await resolvers.Mutation.updateUser({}, args, {
        prisma,
        user: { id: "1" }
      });
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain("provide a correct password");
  });

  it("should raise an error if the email address is used by another user", async () => {
    // Updating user with an email that is in use already
    const args: IUserUpdateInput = {
      email: "existing@email.address",
      password: "test"
    };

    // Mock the users query
    (prisma.users as any).mockResolvedValueOnce([
      {
        id: "2",
        email: "existing@email.address"
      }
    ]);

    // Mocking the user query for the currently logged in user
    (prisma.user as any).mockImplementation(async () => ({
      email: "test@gmail.com",
      id: "1",
      password: await bcrypt.hash("test", 10)
    }));

    // Expect the user update to fail with the appropriate error
    let message = null;
    try {
      await resolvers.Mutation.updateUser({}, args, {
        prisma,
        user: { id: "1" }
      });
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain("already exists");
    expect(message).toContain("email address");
  });

  it("should raise an error if the username is already used by another user", async () => {
    // Updating user with a username that is in use already
    const args: IUserUpdateInput = {
      password: "test",
      username: "existingusername"
    };

    // Mock the users query. A list with one user is returned, who has the
    // email address which is requested as the new email address.
    (prisma.users as any).mockResolvedValueOnce([
      {
        id: "2",
        username: "existingusername"
      }
    ]);

    // Mock the user query for the currently logged in user
    (prisma.user as any).mockImplementation(async () => ({
      id: "1",
      password: await bcrypt.hash("test", 10),
      username: "test"
    }));

    // Expect the user update to fail with the appropriate error
    let message = null;
    try {
      await resolvers.Mutation.updateUser({}, args, {
        prisma,
        user: { id: "1" }
      });
    } catch (e) {
      message = e.message;
    }
    expect(message).toContain("already exists");
    expect(message).toContain("username");
  });
});
