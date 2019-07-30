import { ssdaAdminPool, ssdaPool } from "../db/pool";
import { zipDataRequest } from "../util/zipDataRequest";

async function asyncForEach(array: any, callback: any) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

const groupByObservation = (dataFiles: [any]) => {
  const groups = new Map<string, any>();
  dataFiles.forEach(file => {
    const key = file.telescopeName + " #" + file.telescopeObservationId || "";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    (groups.get(key) as any[]).push(file);
  });

  return groups;
};

export const createDataRequest = async (dataFiles: [number], user: any) => {
  // check if user is logged in
  if (!user) {
    throw new Error("You must be logged in to create data request");
  }
  // TODO check if data files belong to the user or can download all the files

  // Get data files info
  let strDataFilesIds = "";
  dataFiles.forEach(id => {
    strDataFilesIds += id.toString() + ",";
  });

  const groupedDataFiles = groupByObservation(
    ((await ssdaPool.query(
      `
  SELECT 
      telescopeObservationId, 
      Observation.observationId as observationId, 
      telescopeName, dataFileName as name,
      DataFile.dataFileId as uuid
  FROM DataFile
    JOIN Observation ON(Observation.observationId=DataFile.observationId)
    JOIN Telescope ON(Telescope.telescopeId=Observation.telescopeId)
  WHERE dataFileId IN (${dataFiles.join(", ")})
  `,
      []
    )) as any)[0]
  );

  // Get pending status
  const pendingStatusId = ((await ssdaAdminPool.query(
    `
    SELECT dataRequestStatusId FROM DataRequestStatus WHERE dataRequestStatus=?`,
    ["PENDING"]
  )) as any)[0][0].dataRequestStatusId;

  // Create a data request
  const newDataRequestId = ((await ssdaAdminPool.query(
    `INSERT INTO DataRequest (dataRequestStatusId, madeAt, userId) VALUES (?, ?, ?)`,
    [pendingStatusId, new Date(), user.id]
  )) as any)[0].insertId;

  groupedDataFiles.forEach(async (observation: any, key: string) => {
    const newObzId = ((await ssdaAdminPool.query(
      `
    INSERT INTO DataRequestObservation (dataRequestId, name) VALUES (?, ?)
    `,
      [newDataRequestId, key]
    )) as any)[0].insertId;
    Promise.all(
      Array.from(observation).map(async (file: any) => {
        await ssdaAdminPool.query(
          `
      INSERT INTO DataRequestFile (dataRequestObservationId, dataFileUUID, name) VALUES (?, ?, ?)
      `,
          [newObzId, file.uuid, file.name]
        );
        return;
      })
    );
  });

  zipDataRequest(dataFiles, newDataRequestId);

  return {
    message: "Done again1",
    status: true
  };
};
