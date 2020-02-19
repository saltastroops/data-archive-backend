import { sdbPool } from "../db/mysql_pool";
import { ssdaPool } from "../db/postgresql_pool";
import * as salt_calibs from "./salt_calibrations";
import { saltCalibrations } from "./salt_calibrations";

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
  calibrationTypes: CalibrationType[]
): Promise<Set<number>> {
  const calibrationIds = new Set<number>();

  // Find the calibrations taken as part of the observation.
  const obsCalibrations = await observation_calibrations(
    artifactIds,
    calibrationTypes
  );
  obsCalibrations.forEach((id: number) => calibrationIds.add(id));
  console.log({ obsCalibrations });

  // Find the additional calibrations based on the telescope used.
  for (let artifactId of artifactIds) {
    const tel = await telescope(artifactId);
    const instr = await instrument(artifactId);
    if (tel == "SALT") {
      saltCalibrations(artifactId);
    } else {
      throw new Error(`Unsupported telescope: ${tel}`);
    }
  }

  return calibrationIds;
}

/**
 *
 */
async function observation_calibrations(
  artifactIds: number[],
  calibrationTypes: CalibrationType[]
): Promise<number[]> {
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
  const res = await client.query(sql, [artifactIds, calibrationTypes]);
  const calibrations = res.rows.map(row => parseInt(row.artifact_id, 10));

  // Remove duplicates.
  const calibrations_set = new Set([...calibrations]);

  return Array.from(calibrations_set);
}

/**
 * Find the telescope used for getting the data of an artifact.
 *
 * Parameters
 * ----------
 * artifact_id
 *     Artifact id.
 *
 * Returns
 * -------
 * The name of the telescope.
 */
async function telescope(artifact_id: number): Promise<string> {
  const sql = `
      SELECT t.name
      FROM artifact a
               JOIN plane p ON a.plane_id = p.plane_id
               JOIN observation o ON p.observation_id = o.observation_id
               JOIN telescope t on o.telescope_id = t.telescope_id
      WHERE a.artifact_id=$1
  `;

  const res: any = await ssdaPool.query(sql, [artifact_id]);
  return res.rows.length > 0 ? res.rows[0].name : null;
}

/**
 * Find the telescope used for getting the data of an artifact.
 *
 * Parameters
 * ----------
 * artifact_id
 *     Artifact id.
 *
 * Returns
 * -------
 * The name of the telescope.
 */
async function instrument(artifact_id: number): Promise<string> {
  const sql = `
  SELECT i.name
  FROM artifact a
       JOIN plane p ON a.plane_id = p.plane_id
       JOIN observation o ON p.observation_id = o.observation_id
       JOIN instrument i on o.instrument_id = i.instrument_id
  WHERE a.artifact_id=$1
  `;

  const res: any = await ssdaPool.query(sql, [artifact_id]);
  return res.rows.length > 0 ? res.rows[0].name : null;
}

export type CalibrationType = "Arc" | "Bias" | "Flat";
