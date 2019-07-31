import DataLoader from "dataloader";
import { groupBy, map } from "ramda";
import { ssdaAdminPool, ssdaPool } from "../db/pool";

/**
 * A data request data loader function
 */
const dataRequestDataLoader = () => {
  return new DataLoader(dataRequestsByUserIds);
};

/**
 * A data request observation data loader function
 */
const dataRequestObservationDataLoader = () => {
  return new DataLoader(dataRequestObservationByDataRequestIds);
};

/**
 * A data request data file data loader
 */
const dataRequestFileDataLoader = () => {
  return new DataLoader(dataRequestFilesByDataRequestObservationIds);
};

/**
 * A function that return the user data requests
 *
 * @param userIds users information
 */
const dataRequestsByUserIds = async (userIds: any) => {
  // A select query for the user data request
  const sql = `
    SELECT dataRequestId AS id, dataRequestStatus AS status, madeAt, userId
    FROM DataRequest AS dr
    JOIN DataRequestStatus AS drs ON drs.dataRequestStatusId = dr.dataRequestStatusId
    WHERE dr.userId IN(?)
  `;
  // Retrieving user data requests
  const dataRequests: any = await ssdaAdminPool.query(sql, [userIds]);
  if (!dataRequests[0].length) {
    return [[]];
  }
  // A placeholder variable for data requests containing data request observations
  const dataRequestWithObservations: any = [];
  // For each data reuest load it data request observations
  for (const dataRequest of dataRequests[0]) {
    const observations: any = await dataRequestObservationDataLoader().load(
      dataRequest.id
    );
    // A placeholder variable for data request observations constaining data request observation files
    const observationsWithFiles: any = [];
    // For each data request observation, load id data request oobservation files
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

  // Group data request by user id
  const groupedById = groupBy((dataRequest: any) => {
    return dataRequest.userId;
  }, dataRequestWithObservations);

  // Map data request to a belonging user
  const grouped = map((userId: any) => groupedById[userId], userIds);

  // return grouped user data requests
  return grouped;
};

/**
 * A function that returns data request observations
 *
 * @param dataRequestIds data request ids
 */
const dataRequestObservationByDataRequestIds = async (dataRequestIds: any) => {
  // A select query for data request observations
  const sql = `
    SELECT dataRequestObservationId AS id, dataRequestId, name
    FROM DataRequestObservation AS dro
    WHERE dro.dataRequestId IN(?)
  `;
  // Retrieving data request observations
  const dataRequestObservations: any = await ssdaAdminPool.query(sql, [
    dataRequestIds
  ]);
  if (!dataRequestObservations[0].length) {
    return [[]];
  }

  // Group data request observations by data request id
  const groupedById = groupBy(
    (dataRequestObservation: any) => dataRequestObservation.dataRequestId,
    dataRequestObservations[0]
  );
  // Map data request observation to a belonging data request
  const grouped = map(
    (dataRequestId: any) => groupedById[dataRequestId],
    dataRequestIds
  );

  // return grouped data requests observations
  return grouped;
};

/**
 * A function that returns the data request observation files
 *
 * @param dataRequestObservationIds data request observation ids
 */
const dataRequestFilesByDataRequestObservationIds = async (
  dataRequestObservationIds: any
) => {
  // A select query for data request observation files
  let sql = `
    SELECT dataRequestFileId AS id, dataRequestObservationId, dataFileUUID, name
    FROM DataRequestFile AS drf
    WHERE drf.dataRequestObservationId IN(?)
  `;
  // Retrieving data request observation files
  const dataRequestFiles: any = await ssdaAdminPool.query(sql, [
    dataRequestObservationIds
  ]);
  if (!dataRequestFiles[0].length) {
    return [[]];
  }

  // A placeholder variable to load more data file details
  const dataRequestFilesWithDetails: any = [];

  // For each data request file, get more data file information and add them
  for (const dataRequestFile of dataRequestFiles[0]) {
    // A select query for data file
    sql = `
      SELECT *
      FROM DataFile AS df
      WHERE df.dataFileUUID = ?
    `;
    // A data file
    const dataFile: any = await ssdaPool.query(
      sql,
      dataRequestFile.dataFileUUID
    );

    // Loading more data file details
    dataRequestFilesWithDetails.push({ ...dataRequestFile, ...dataFile[0][0] });
  }
  // Group data request observation files by data request observation id
  const groupedById = groupBy(
    (dataRequestFile: any) => dataRequestFile.dataRequestObservationId,
    dataRequestFilesWithDetails
  );
  // Map data request observation files to a belonging data request observation
  const grouped = map(
    (dataRequestObservationId: any) => groupedById[dataRequestObservationId],
    dataRequestObservationIds
  );

  // return grouped data requests observation files
  return grouped;
};

export { dataRequestDataLoader };
