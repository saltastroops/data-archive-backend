import { ssdaPool } from "../db/postgresql_pool";

/**
 * A function that return the user data requests
 *
 * @param userIds users information
 */
export const dataRequestIdsByUserIds = async (
  userIds: number[]
): Promise<number[]> => {
  const sql = `
    SELECT data_request_id, status, made_at, u.ssda_user_id
    FROM admin.data_request dr
    JOIN admin.data_request_status drs ON dr.data_request_status_id = drs.data_request_status_id
    JOIN admin.ssda_user u ON dr.ssda_user_id = u.ssda_user_id
    WHERE u.ssda_user_id = ANY ($1)
  `;
  const res: any = await ssdaPool.query(sql, [userIds]);

  return res.rows.map((row: any) => parseInt(row.data_request_id, 10));
};

export const toTitleCase = (s: string) => {
  s = s.replace(/_/g, " ");
  return s.replace(/\w\S*/g, (txt: string) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};
