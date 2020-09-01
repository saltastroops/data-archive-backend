import { ssdaPool } from "../db/postgresql_pool";
import { CalibrationLevel } from "./calibrations";
import {
  createReadMeContent,
  dataFilesToZip,
  failToZipDataRequest,
  successfullyZipDataRequest
} from "./zipDataRequest";
import moment from "moment";
import archiver from "archiver";
import fs from "fs";
import { Request, Response } from "express";

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

export async function downloadDataRequest(req: Request, res: Response) {
  // Check if the user is logged in
  if (!req.user) {
    return res.status(401).send({
      message: "You must be logged in.",
      success: false
    });
  }
  // Get all the params from the request
  const { dataRequestId } = req.params;

  const calibrationLevelSQL = `
SELECT calibration_level.calibration_level
FROM admin.data_request_calibration_level
JOIN admin.calibration_level ON data_request_calibration_level.calibration_level_id = calibration_level.calibration_level_id
WHERE data_request_id = $1;
        `;
  const calibrationLevelsResults = await ssdaPool.query(calibrationLevelSQL, [
    parseInt(dataRequestId, 10)
  ]);
  const calibrationLevels = new Set(
    calibrationLevelsResults.rows.map(
      calLevel => calLevel.calibration_level.toUpperCase() as CalibrationLevel
    )
  );

  const artifactIdSQL = `SELECT artifact_id FROM admin.data_request_artifact WHERE data_request_id = $1; `;
  const artifactIdsResults = await ssdaPool.query(artifactIdSQL, [
    parseInt(dataRequestId, 10)
  ]);
  const artifactIds = artifactIdsResults.rows.map(artId =>
    artId.artifact_id.toString()
  );

  const dataFiles = await dataFilesToZip(artifactIds, calibrationLevels);
  const readMeFileContent = await createReadMeContent(dataFiles);

  res.set("Content-Type", "application/zip");
  res.set(
    "Content-Disposition",
    "attachment; filename=DataRequest-" + moment().format("Y-MM-DD") + ".zip"
  );

  const zip = archiver("zip", {
    gzip: true,
    zlib: { level: 9 } // Sets the compression level.
  });

  let hasError = false;
  // case archive raise a warning
  zip.on("warning", async (err: any) => {
    if (err.code === "ENOENT") {
      // Update data request table with fail
      await failToZipDataRequest(dataRequestId);
      // Record that there has been a problem
      hasError = true;
    } else {
      // Update data request table with fail
      await failToZipDataRequest(dataRequestId);
      // Record that there has been a problem
      hasError = true;
    }
  });

  // If ever there is an error raise it
  zip.on("error", async (err: any) => {
    // Update data request table with fail
    await failToZipDataRequest(dataRequestId);
    hasError = true;
  });

  await zip.append(await createReadMeContent(dataFiles), {
    name: "README.txt"
  });

  await dataFiles.forEach(dataFile => {
    const source = fs.createReadStream(dataFile.filepath);
    zip.append(source, { name: dataFile.filename });
  });

  // when zip have no error
  if (!hasError) {
    await successfullyZipDataRequest(dataRequestId);
  }
  zip.pipe(res);

  zip.finalize();
}
