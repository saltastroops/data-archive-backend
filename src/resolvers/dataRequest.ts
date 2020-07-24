import fs from "fs";
import { titleCase } from "title-case";
import { ssdaPool } from "../db/postgresql_pool";
import {
  CalibrationLevel,
  calibrations,
  CalibrationType
} from "../util/calibrations";
import { mayViewAllOfDataFiles } from "../util/user";
import { zipDataRequest } from "../util/zipDataRequest";

async function asyncForEach(array: any, callback: any) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
// We get the files to be downloaded by the user based on their fileIds
async function files_to_be_downloaded(fileIds: string[]) {
  const sql = `SELECT (paths).raw,
                      (paths).reduced 
               FROM observations.artifact atf
               WHERE artifact_id = ANY($1)`;
  const res = await ssdaPool.query(sql, [fileIds]);
  return res.rows;
}
// limiting the data request of the user 5GB or less, we return thr limit size in bytes
async function data_request_limit_size(
  fileIds: string[],
  requestedCalibrationLevels: Set<CalibrationLevel>
) {
  let filepath: string;
  let fileSize = 0;
  const dataFiles = await files_to_be_downloaded(fileIds);
  for (const datafile of dataFiles) {
    if (requestedCalibrationLevels.has("RAW")) {
      filepath = process.env.FITS_BASE_DIR + datafile.raw;
      fileSize += fs.statSync(filepath).size;
    }
    if (requestedCalibrationLevels.has("REDUCED")) {
      filepath = process.env.FITS_BASE_DIR + datafile.reduced;
      fileSize += fs.statSync(filepath).size;
    }
  }
  return fileSize;
}
export const createDataRequest = async (
  dataFiles: number[],
  requestedCalibrationLevels: Set<CalibrationLevel>,
  requestedCalibrationTypes: Set<CalibrationType>,
  user: any
) => {
  // check if user is logged in
  if (!user) {
    throw new Error("You must be logged in to create a data request");
  }

  // check if there are data files
  if (dataFiles.length === 0) {
    throw new Error("You cannot create an empty data request.");
  }

  // store the requested files before adding calibrations
  const requestedDataFiles = [...dataFiles];

  // add calibrations, if requested
  if (requestedCalibrationTypes.size) {
    dataFiles = await addCalibrations(dataFiles, requestedCalibrationTypes);
  }
  const MAX_SIZE = 5368709120; // 5GB
  const dataFileIdStrings = dataFiles.map(id => id.toString());
  if (
    (await data_request_limit_size(
      dataFileIdStrings,
      requestedCalibrationLevels
    )) >= MAX_SIZE
  ) {
    throw new Error("The total file size for your data request exceeds 5 GB.");
  }
  const requestedDataFileIdStrings = requestedDataFiles.map(id =>
    id.toString()
  );
  const mayRequest = await mayViewAllOfDataFiles(user, dataFileIdStrings);
  if (!mayRequest) {
    throw new Error("You are not allowed to request some of the files");
  }

  const client = await ssdaPool.connect();
  try {
    await client.query("BEGIN");

    const dataRequestSQL = `
    WITH pending_id (id) AS (
        SELECT data_request_status_id
        FROM admin.data_request_status
        WHERE status='Pending'
    )
    INSERT INTO admin.data_request (made_at,
                                    ssda_user_id,
                                    data_request_status_id)
    VALUES (now(), $1, (SELECT id FROM pending_id))
    RETURNING data_request_id
    `;

    const res = await client.query(dataRequestSQL, [user.id]);
    const dataRequestId = res.rows[0].data_request_id;

    const dataRequestArtifactSQL = `
        INSERT INTO admin.data_request_artifact (data_request_id, artifact_id)
        VALUES ($1, $2)
    `;
    requestedDataFileIdStrings.map(async dataFileId => {
      await client.query(dataRequestArtifactSQL, [dataRequestId, dataFileId]);
    });

    const dataRequestCalibrationLevelSQL = `
      WITH level_id (id) AS (
        SELECT calibration_level_id
        FROM admin.calibration_level
        WHERE calibration_level=$2
      )
    INSERT INTO admin.data_request_calibration_level (data_request_id, calibration_level_id)
    VALUES ($1, (SELECT id FROM level_id))
    `;
    Array.from(requestedCalibrationLevels).map(
      async (calibrationLevel: CalibrationLevel) => {
        await client.query(dataRequestCalibrationLevelSQL, [
          dataRequestId,
          titleCase(calibrationLevel.toLowerCase())
        ]);
      }
    );
    const dataRequestCalibrationTypeSQL = `
      WITH type_id (id) AS (
        SELECT calibration_type_id
        FROM admin.calibration_type
        WHERE calibration_type=$2
      )
    INSERT INTO admin.data_request_calibration_type (data_request_id, calibration_type_id)
    VALUES ($1, (SELECT id FROM type_id))
    `;
    Array.from(requestedCalibrationTypes).map(
      async (calibrationType: CalibrationType) => {
        await client.query(dataRequestCalibrationTypeSQL, [
          dataRequestId,
          titleCase(calibrationType.toLowerCase().replace(/_/g, " "))
        ]);
      }
    );

    await client.query("COMMIT");

    zipDataRequest(
      dataFileIdStrings,
      dataRequestId,
      requestedCalibrationLevels
    );

    return {
      message: "The data request was successfully requested",
      status: true
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

async function addCalibrations(
  dataFiles: number[],
  requestedCalibrationTypes: Set<CalibrationType>
): Promise<number[]> {
  const calibrationIds = await calibrations(
    dataFiles,
    requestedCalibrationTypes
  );
  return [...dataFiles, ...Array.from(calibrationIds)];
}
