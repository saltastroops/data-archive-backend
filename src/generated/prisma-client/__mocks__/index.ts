
const prisma: any = jest.genMockFromModule('..');

// add required fields
prisma.user = jest.fn();
prisma.users = jest.fn();
prisma.createUser = jest.fn();
prisma.updateUser = jest.fn();

export { prisma };
