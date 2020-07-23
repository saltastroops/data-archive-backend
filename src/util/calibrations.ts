import { ssdaPool } from "../db/postgresql_pool";
import { additionalSaltCalibrations } from "./saltCalibrations";

/**
 *
 * Find all the calibration files for an artifact.
 *
 * Parameters
 * ----------
 * artifact_id
 *     Artifact id.
 *
 * Returns
 * -------
 * The artifact ida of the calibration files.
 */
export async function calibrations(
  artifactIds: number[],
  calibrationTypes: Set<CalibrationType>
): Promise<Set<number>> {
  const calibrationIds = new Set<number>();

  // Find the calibrations taken as part of the observation.
  const obsCalibrations = await observation_calibrations(
    artifactIds,
    calibrationTypes
  );
  obsCalibrations.forEach((id: number) => calibrationIds.add(id));

  // Find the additional calibrations based on the telescope used.
  for (const artifactId of artifactIds) {
    const tel = await telescope(artifactId);
    const instr = await instrument(artifactId);
    let additionalCalibrationIds: Set<number>;
    if (tel === "SALT") {
      additionalCalibrationIds = await additionalSaltCalibrations(
        artifactId,
        calibrationTypes
      );
    } else {
      throw new Error(`Unsupported telescope: ${tel}`);
    }
    additionalCalibrationIds.forEach(id => calibrationIds.add(id));
  }

  return calibrationIds;
}

/**
 * Return the calibrations taken as part of a any of a set of observations.
 *
 * Parameters
 * ----------
 * artifact_ids
 *     Artifact ids.
 * calibration_types
 *     Calibration types to search for.
 *
 * Returns
 * -------
 * The artifact ids of the calibrations.
 */
async function observation_calibrations(
  artifactIds: number[],
  calibrationTypes: Set<CalibrationType>
): Promise<Set<number>> {
  // The SSDA expects names that differ from those for the CalibrationType type
  const ssdaTypes = ssdaCalibrationTypes(calibrationTypes);

  // Find all non-science data files which belong to one of the observation
  // groups of the given data files are and which are not science files.
  const sql = `
WITH obs_groups (id) AS (
    SELECT DISTINCT og.observation_group_id
    FROM observations.observation_group og
             JOIN observations.observation o ON og.observation_group_id = o.observation_group_id
             JOIN observations.plane p ON o.observation_id = p.observation_id
             JOIN observations.artifact a ON p.plane_id = a.plane_id
    WHERE artifact_id = ANY($1)
)
SELECT a.artifact_id
FROM observations.artifact a
     JOIN observations.plane p ON a.plane_id = p.plane_id
     JOIN observations.observation o ON p.observation_id = o.observation_id
     JOIN observations.product_type pt ON a.product_type_id=pt.product_type_id
WHERE o.observation_group_id IN (SELECT id FROM obs_groups)
      AND pt.product_type = ANY($2)
`;
  const client = await ssdaPool.connect();
  const res = await client.query(sql, [artifactIds, Array.from(ssdaTypes)]);
  const calibrationIds = res.rows.map(row => parseInt(row.artifact_id, 10));

  // Remove duplicates.
  return new Set([...calibrationIds]);
}

/**
 * Find the telescope used for getting the data of an artifact.
 *
 * Parameters
 * ----------
 * artifactId
 *     Artifact id.
 *
 * Returns
 * -------
 * The name of the telescope.
 */
async function telescope(artifactId: number): Promise<string> {
  const sql = `
      SELECT t.name
      FROM observations.artifact a
               JOIN observations.plane p ON a.plane_id = p.plane_id
               JOIN observations.observation o ON p.observation_id = o.observation_id
               JOIN observations.telescope t on o.telescope_id = t.telescope_id
      WHERE a.artifact_id=$1
  `;

  const res: any = await ssdaPool.query(sql, [artifactId]);
  return res.rows.length > 0 ? res.rows[0].name : null;
}

/**
 * Find the telescope used for getting the data of an artifact.
 *
 * Parameters
 * ----------
 * artifactId
 *     Artifact id.
 *
 * Returns
 * -------
 * The name of the telescope.
 */
async function instrument(artifactId: number): Promise<string> {
  const sql = `
  SELECT i.name
  FROM observations.artifact a
       JOIN observations.plane p ON a.plane_id = p.plane_id
       JOIN observations.observation o ON p.observation_id = o.observation_id
       JOIN observations.instrument i on o.instrument_id = i.instrument_id
  WHERE a.artifact_id=$1
  `;

  const res: any = await ssdaPool.query(sql, [artifactId]);
  return res.rows.length > 0 ? res.rows[0].name : null;
}

/**
 * The calibration types in the SSDA corresponding to a set of calibration
 * types.
 *
 * Parameters
 * ----------
 * calibrationTypes
 *     Calibration types.
 *
 * Returns
 * -------
 * Calibration types in the SSDA.
 */
function ssdaCalibrationTypes(
  calibrationTypes: Set<CalibrationType>
): Set<string> {
  const ssdaTypes = new Set<string>();
  for (const calibrationType of Array.from(calibrationTypes)) {
    if (calibrationType === "ARC") {
      ssdaTypes.add("Arc - Calsys");
      ssdaTypes.add("Arc - Internal");
    } else if (calibrationType === "BIAS") {
      ssdaTypes.add("Bias");
    } else if (calibrationType === "FLAT") {
      ssdaTypes.add("Imaging Flat - Lamp");
      ssdaTypes.add("Imaging Flat - Twilight");
      ssdaTypes.add("Spectroscopic Flat - Lamp");
      ssdaTypes.add("Spectroscopic Flat - Twilight");
    } else if (calibrationType === "RADIAL_VELOCITY_STANDARD") {
      ssdaTypes.add("Standard - Radial Velocity");
    } else if (calibrationType === "SPECTROPHOTOMETRIC_STANDARD") {
      ssdaTypes.add("Standard - Spectrophotometric");
    } else {
      throw new Error(`Unsupported calibration type: ${calibrationType}`);
    }
  }

  return ssdaTypes;
}

export type CalibrationType =
  | "ARC"
  | "BIAS"
  | "FLAT"
  | "RADIAL_VELOCITY_STANDARD"
  | "SPECTROPHOTOMETRIC_STANDARD";

export type CalibrationLevel = "RAW" | "REDUCED";
