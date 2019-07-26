import { sdbPool } from "../db/pool";

export const saltUserById = async (userId: string) => {
  const user: any = await sdbPool.query(
    `
SELECT * FROM PiptUser JOIN Investigator USING(Investigator_Id) WHERE PiptUser.PiptUser_Id=?
      `,
    [userId]
  );
  return user[0]
    ? {
        authProvider: "SDB",
        email: user[0].Email,
        familyName: user[0].Surname,
        givenName: user[0].FirstName,
        id: user[0].PiptUser_Id,
        roles: [],
        username: user[0].Username
      }
    : undefined;
};

export const saltUserByUsernameAndPassword = async (
  username: string,
  password: string
) => {
  const user: any = await sdbPool.query(
    `
SELECT * FROM PiptUser JOIN Investigator USING(Investigator_Id) WHERE Username=? AND Password=MD5(?);
      `,
    [username, password]
  );
  return user[0]
    ? {
        authProvider: "SDB",
        email: user[0].Email,
        familyName: user[0].Surname,
        givenName: user[0].FirstName,
        id: user[0].PiptUser_Id,
        roles: [],
        username: user[0].Username
      }
    : undefined;
};
