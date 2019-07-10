const mysql: any = jest.genMockFromModule("mysql");

const pool = (mysql.createPool = jest.fn(() => {
  return {
    getConnection: jest.fn(),
    query: jest.fn()
  };
}));

export default mysql;
