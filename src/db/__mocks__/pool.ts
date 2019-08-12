const ssdaAdminPool: any = jest.genMockFromModule("");

// add required fields
ssdaAdminPool.query = jest.fn();

export { ssdaAdminPool };
