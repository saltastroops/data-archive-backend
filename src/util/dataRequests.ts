import { ssdaPool } from "../db/postgresql_pool";
import { CalibrationLevel } from "./calibrations";
import {
  createReadMeContent,
  createReadMeFile,
  dataFilesToZip,
  failToZipDataRequest,
  successfullyZipDataRequest
} from "./zipDataRequest";
import moment from "moment";
import archiver from "archiver";
import fs from "fs";
import { Request, Response } from "express";
require("express-zip");

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

  const _calibrationLevels = await calibrationLevels(dataRequestId);
  const _artifactIds = await artifactIds(dataRequestId);

  const dataFiles = await dataFilesToZip(_artifactIds, _calibrationLevels);

  const readmePath = createReadMeFile(dataFiles);
  const files = [
    { name: "README.txt", path: readmePath },
    ...dataFiles.map(df => ({ name: df.filename, path: df.filepath }))
  ];
  const filename = "DataRequest-" + moment().format("Y-MM-DD") + ".zip";
  (res as any).zip(files, filename);
}

async function calibrationLevels(dataRequestId: string) {
  const calibrationLevelSQL = `
SELECT calibration_level.calibration_level
FROM admin.data_request_calibration_level
JOIN admin.calibration_level ON data_request_calibration_level.calibration_level_id = calibration_level.calibration_level_id
WHERE data_request_id = $1;
        `;
  const calibrationLevelsResults = await ssdaPool.query(calibrationLevelSQL, [
    parseInt(dataRequestId, 10)
  ]);
  return new Set(
    calibrationLevelsResults.rows.map(
      calLevel => calLevel.calibration_level.toUpperCase() as CalibrationLevel
    )
  );
}

async function artifactIds(dataRequestId: string) {
  const artifactIdSQL = `SELECT artifact_id FROM admin.data_request_artifact WHERE data_request_id = $1; `;
  const artifactIdsResults = await ssdaPool.query(artifactIdSQL, [
    parseInt(dataRequestId, 10)
  ]);
  return artifactIdsResults.rows.map(artId => artId.artifact_id.toString());
}
