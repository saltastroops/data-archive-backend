import DataLoader from "dataloader";
import { ssdaPool } from "../db/postgresql_pool";
import { ownsOutOfDataFiles, Role, User } from "./user";

/**
 * Batch function for getting data requests.
 */
async function batchGetDataRequests(ids: number[]) {
  // get the data requests
  const dataRequestsSQL = `
    SELECT data_request_id, path, status, made_at, ssda_user_id
    FROM admin.data_request dr
    JOIN admin.data_request_status drs
    ON dr.data_request_status_id = drs.data_request_status_id
    WHERE data_request_id = ANY ($1)

  `;
  const dataRequestsRes = await ssdaPool.query(dataRequestsSQL, [ids]);
  // Use an int rather than string as id
  const dataRequests = dataRequestsRes.rows.map((d: any) => ({
    ...d,
    data_request_id: parseInt(d.data_request_id, 10)
  }));

  // Get the artifacts
  const artifactsSQL = `
  SELECT data_request_id, artifact_id
  FROM admin.data_request_artifact
       WHERE data_request_id = ANY($1)
  `;
  const artifactsRes = await ssdaPool.query(artifactsSQL, [ids]);
  const artifacts = artifactsRes.rows;

  // Group the artifacts by data requests
  const dataRequestArtifacts = new Map<number, number[]>();
  const dataRequestCalibrationLevels = new Map<number, string[]>();
  const dataRequestCalibrationTypes = new Map<number, string[]>();
  for (const id of ids) {
    dataRequestArtifacts.set(id, []);
    dataRequestCalibrationLevels.set(id, []);
    dataRequestCalibrationTypes.set(id, []);
  }
  for (const row of artifacts) {
    (dataRequestArtifacts.get(row.data_request_id) as any).push(
      row.artifact_id
    );
  }

  // Get the calibration levels
  const calibrationLevelsSQL = `
  SELECT data_request_id, calibration_level
  FROM admin.data_request_calibration_level AS drcl
  JOIN admin.calibration_level AS cl ON drcl.calibration_level_id = cl.calibration_level_id
       WHERE data_request_id = ANY($1)
  `;
  const calibrationLevelsRes = await ssdaPool.query(calibrationLevelsSQL, [
    ids
  ]);
  const calibrationLevels = calibrationLevelsRes.rows;
  for (const row of calibrationLevels) {
    (dataRequestCalibrationLevels.get(row.data_request_id) as any).push(
      row.calibration_level.toUpperCase()
    );
  }

  // Get the calibration levels
  const calibrationTypesSQL = `
  SELECT data_request_id, calibration_type
  FROM admin.data_request_calibration_type AS drcl
  JOIN admin.calibration_type AS cl ON drcl.calibration_type_id = cl.calibration_type_id
       WHERE data_request_id = ANY($1)
  `;
  const calibrationTypesRes = await ssdaPool.query(calibrationTypesSQL, [ids]);
  const calibrationTypes = calibrationTypesRes.rows;
  for (const row of calibrationTypes) {
    (dataRequestCalibrationTypes.get(row.data_request_id) as any).push(
      row.calibration_type.toUpperCase().replace(/ /g, "_")
    );
  }

  // Return the data requests
  return dataRequests.map(d => {
    return {
      calibrationLevels: dataRequestCalibrationLevels.get(d.data_request_id),
      calibrationTypes: dataRequestCalibrationTypes.get(d.data_request_id),
      dataFiles: dataRequestArtifacts.get(d.data_request_id),
      id: d.data_request_id,
      madeAt: d.made_at.toISOString(),
      status: d.status.toUpperCase(),
      uri: d.path,
      user: d.ssda_user_id
    };
  });
}

/**
 * Batch function for getting data files.
 */
async function batchGetDataFiles(user: User, ids: number[]) {
  const sql = `
  SELECT artifact_id, name, content_length
  FROM observations.artifact
  WHERE artifact_id = ANY($1)
  `;
  const res = await ssdaPool.query(sql, [ids]);
  const artifacts = res.rows;

  const artifactIds = artifacts.map(artifact =>
    artifact.artifact_id.toString()
  );
  const ownedArtifactIds = await ownsOutOfDataFiles(user, artifactIds);

  // return the data files
  return artifacts.map(artifact => ({
    id: artifact.artifact_id,
    name: artifact.name
  }));
}

/**
 * Batch function for getting users.
 */
async function batchGetUsers(ids: number[]) {
  // Get the users
  const usersSQL = `
  SELECT u.ssda_user_id, family_name, given_name, email, affiliation, username, auth_provider
  FROM admin.ssda_user u
  LEFT JOIN admin.ssda_user_auth ua ON u.ssda_user_id = ua.user_id
  JOIN admin.auth_provider AS ap ON u.auth_provider_id = ap.auth_provider_id
  WHERE u.ssda_user_id = ANY($1)
  `;
  const usersRes = await ssdaPool.query(usersSQL, [ids]);
  const users = usersRes.rows;

  // Get the roles
  const rolesSQL = `
  SELECT user_id, r.role
    FROM admin.user_role ur
    JOIN admin.role r ON ur.role_id = r.role_id
    WHERE user_id = ANY($1);
  `;
  const rolesRes = await ssdaPool.query(rolesSQL, [ids]);
  const roles = rolesRes.rows;

  // Group the roles by user
  const userRoles = new Map<number, Role[]>();
  for (const id of ids) {
    userRoles.set(id, []);
  }
  for (const role of roles) {
    (userRoles.get(role.user_id) as any).push(role.role as Role);
  }

  // Return the users
  return users.map(user => ({
    affiliation: user.affiliation,
    authProvider: user.auth_provider,
    email: user.email,
    familyName: user.family_name,
    givenName: user.given_name,
    id: user.ssda_user_id,
    roles: userRoles.get(user.ssda_user_id),
    username: user.username
  }));
}

export function dataRequestDataLoader() {
  return new DataLoader(batchGetDataRequests);
}

export function dataFileDataLoader(user: User) {
  const batchFunction = (ids: number[]) => batchGetDataFiles(user, ids);

  return new DataLoader(batchFunction);
}

export function userDataLoader() {
  return new DataLoader(batchGetUsers);
}
