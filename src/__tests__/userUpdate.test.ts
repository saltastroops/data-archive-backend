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
  // Mocking the createUser mutation
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
  it("should update the user information successfully of the currently logged in user", async () => {
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
    // Return no user with the already used email nor username to update with.
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
});
