const ssdaAdminPool: any = jest.genMockFromModule("");

ssdaAdminPool.query = jest.fn();
ssdaAdminPool.getConnection = jest.fn();

export { ssdaAdminPool };
