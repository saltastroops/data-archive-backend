import DataLoader from "dataloader";
import { groupBy, map } from "ramda";

import { ssdaAdminPool } from "../db/pool";

const dataRequestDataLoader = () => {
  return new DataLoader(dataRequestsByUserIds);
};

const dataRequestsByUserIds = async (userIds: any) => {
  const sql = `
    SELECT *
    FROM DataRequest AS dr
    WHERE dr.userId IN(?)
  `;
  const params: any = [userIds];

  const dataRequests: any = await ssdaAdminPool.query(sql, params);

  const groupedById = groupBy(
    (dataRequest: any) => dataRequest.userId,
    dataRequests
  );

  console.log(groupedById["1"]);

  const grouped = map((userId: any) => groupedById, userIds);

  return grouped;
};

export { dataRequestDataLoader };
