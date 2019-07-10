const mysql: any = jest.genMockFromModule("mysql");

mysql.createPool = jest.fn(() => {
  return {
    getConnection: jest.fn(),
    query: jest.fn()
  };
});

export default mysql;
