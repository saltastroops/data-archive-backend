const mysql: any = jest.genMockFromModule("mysql2/promise");

mysql.createPool = jest.fn(() => {
  return {
    getConnection: jest.fn(),
    query: jest.fn()
  };
});

export default mysql;
