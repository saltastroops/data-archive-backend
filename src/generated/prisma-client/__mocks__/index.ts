const prisma: any = jest.genMockFromModule('..');

// add required fields
prisma.user = jest.fn();

export { prisma };
