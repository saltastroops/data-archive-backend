import { ssdaPool } from "../db/postgresql_pool";
import { mayViewAllOfDataFiles } from "../util/user";
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

export const createDataRequest = async (
  dataFiles: number[],
  requestedCalibrations: string[],
  user: any
) => {
  // check if user is logged in
  if (!user) {
    throw new Error("You must be logged in to create a data request");
  }

  // add calibrations, if requested
  if (requestedCalibrations.length) {
    dataFiles = await addCalibrations(dataFiles, requestedCalibrations);
  }

  const dataFileIdStrings = dataFiles.map(id => id.toString());
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
    dataFileIdStrings.map(async dataFileId => {
      await client.query(dataRequestArtifactSQL, [dataRequestId, dataFileId]);
    });

    await client.query("COMMIT");

    zipDataRequest(dataFileIdStrings, dataRequestId);

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
  requestedCalibrations: string[]
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
      AND pt.product_type IN $2
`;
  const client = await ssdaPool.connect();
  const res = await client.query(sql, [dataFiles, requestedCalibrations]);
  const calibrations = res.rows.map(row => parseInt(row.artifact_id, 10));

  // Remove duplicates.
  const allFiles = new Set([...dataFiles, ...calibrations]);

  return Array.from(allFiles);
}
