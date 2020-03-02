import { ssdaPool } from "../db/postgresql_pool";
import { mayViewAllOfDataFiles } from "../util/user";
import { zipDataRequest } from "../util/zipDataRequest";
import { calibrations } from "../util/calibrations";

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
    dataFiles = await addCalibrations(dataFiles);
  }
  throw new Error("BOOOOOMMMMMMMMM!!!!!!!!!!!");

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

async function addCalibrations(dataFiles: number[]): Promise<number[]> {
  const calibrationIds = await calibrations(dataFiles, ["Flat"]);
  return [...dataFiles, ...Array.from(calibrationIds)];
}
