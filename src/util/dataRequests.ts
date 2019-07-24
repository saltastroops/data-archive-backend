import DataLoader from "dataloader";
import { groupBy, map } from "ramda";

import { ssdaAdminPool } from "../db/pool";

const dataRequestDataLoader = () => {
  return new DataLoader(dataRequestsByUserIds);
};

const dataRequestObservationDataLoader = () => {
  return new DataLoader(dataRequestObservationByDataRequestIds);
};

const dataRequestFileDataLoader = () => {
  return new DataLoader(dataRequestFilesByDataRequestObservationIds);
};

const dataRequestsByUserIds = async (userIds: any) => {
  const sql = `
    SELECT dataRequestId AS id, dataRequestStatus AS status, madeAt, userId
    FROM DataRequest AS dr
    JOIN DataRequestStatus AS drs ON drs.dataRequestStatusId = dr.dataRequestStatusId
    WHERE dr.userId IN(?)
  `;
  const params: any = [userIds];

  const dataRequests: any = await ssdaAdminPool.query(sql, params);

  const dataRequestWithObservations: any = [];

  for (const dataRequest of dataRequests) {
    const observations: any = await dataRequestObservationDataLoader().load(
      dataRequest.id
    );

    const observationsWithFiles: any = [];
    for (const observation of observations) {
      const dataFiles: any = await dataRequestFileDataLoader().load(
        observation.id
      );
      observationsWithFiles.push({ ...observation, dataFiles });
    }

    dataRequestWithObservations.push({
      ...dataRequest,
      parts: observationsWithFiles
    });
  }

  console.log("DDDDDDDDDDDDDDDDDD", dataRequestWithObservations);

  const groupedById = groupBy((dataRequest: any) => {
    console.log(dataRequest);
    return dataRequest.userId;
  }, dataRequestWithObservations);

  const grouped = map((userId: any) => groupedById[userId], userIds);

  return grouped;
};

const dataRequestObservationByDataRequestIds = async (dataRequestIds: any) => {
  const sql = `
    SELECT dataRequestObservationId AS id, dataRequestId, name
    FROM DataRequestObservation AS dro
    WHERE dro.dataRequestId IN(?)
  `;
  const params: any = [dataRequestIds];

  const dataRequestObservations: any = await ssdaAdminPool.query(sql, params);

  const groupedById = groupBy(
    (dataRequestObservation: any) => dataRequestObservation.dataRequestId,
    dataRequestObservations
  );

  const grouped = Object.keys(groupedById).length
    ? map((dataRequestId: any) => groupedById[dataRequestId], dataRequestIds)
    : [[]];

  return grouped;
};

const dataRequestFilesByDataRequestObservationIds = async (
  dataRequestObservationIds: any
) => {
  const sql = `
    SELECT dataRequestFileId AS id, dataRequestObservationId, fileId, name
    FROM DataRequestFile AS drf
    WHERE drf.dataRequestObservationId IN(?)
  `;
  const params: any = [dataRequestObservationIds];

  const dataRequestFiles: any = await ssdaAdminPool.query(sql, params);

  const groupedById = groupBy(
    (dataRequestFile: any) => dataRequestFile.dataRequestObservationId,
    dataRequestFiles
  );

  const grouped = Object.keys(groupedById).length
    ? map(
        (dataRequestObservationId: any) =>
          groupedById[dataRequestObservationId],
        dataRequestObservationIds
      )
    : [[]];

  return grouped;
};

export { dataRequestDataLoader };
