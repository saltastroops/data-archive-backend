import { isValid, parse, parseISO } from "date-fns";
import { ssdaPool } from "../db/postgresql_pool";

export default async function updateReleaseDates(
  proposalCode: string,
  institution: string,
  dataReleaseDate: string,
  metadataReleaseDate: string
): Promise<boolean> {
  if (!_isValidDate(dataReleaseDate)) {
    throw new Error(
      "Invalid data release date. The date must be of the form yyyy-mm-dd."
    );
  }
  if (!_isValidDate(metadataReleaseDate)) {
    throw new Error(
      "Invalid metadata release date. The date must be of the form yyyy-mm-dd."
    );
  }

  const client = await ssdaPool.connect();
  try {
    await client.query("BEGIN");

    await _setInstitutionUserId(proposalCode, institution, client);

    await _updateReleaseDates(
      proposalCode,
      institution,
      dataReleaseDate,
      metadataReleaseDate,
      client
    );

    // update the visibility of target positions
    await _updatePositionOwners(
      proposalCode,
      institution,
      metadataReleaseDate,
      client
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return true;
}

async function _updateReleaseDates(
  proposalCode: string,
  institution: string,
  dataReleaseDate: string,
  metadataReleaseDate: string,
  client: any
): Promise<void> {
  const sql = `
WITH oi (id) AS (
 SELECT o.observation_id
 FROM observation o
  JOIN proposal p on o.proposal_id = p.proposal_id
  JOIN institution i on p.institution_id = i.institution_id
 WHERE p.proposal_code=$1 AND i.abbreviated_name=$2
)
UPDATE observation SET data_release=$3::date, meta_release=$4::date
WHERE observation.observation_id IN (SELECT * FROM oi)

  `;
  await client.query(sql, [
    proposalCode,
    institution,
    dataReleaseDate,
    metadataReleaseDate
  ]);
}

async function _updatePositionOwners(
  proposalCode: string,
  institution: string,
  metadataReleaseDate: string,
  client: any
) {
  const releaseDate = parseISO(metadataReleaseDate);
  const now = new Date();
  if (releaseDate > now) {
    await _addPositionOwners(proposalCode, institution, client);
  } else {
    await _removePositionOwners(proposalCode, institution, client);
  }
}

async function _addPositionOwners(
  proposalCode: string,
  institution: string,
  client: any
) {
  const sql = `
WITH owner_institution_user_ids (id) AS (
  SELECT DISTINCT pi.institution_user_id
  FROM proposal_investigator pi
  JOIN proposal p ON pi.proposal_id = p.proposal_id
  JOIN institution i on p.institution_id = i.institution_id
  WHERE p.proposal_code=$1 AND i.abbreviated_name=$2
),
plane_ids (id) AS (
  SELECT DISTINCT pln.plane_id
  FROM plane pln
  JOIN observation obs ON pln.observation_id = obs.observation_id
  JOIN proposal p ON obs.proposal_id = p.proposal_id
  JOIN institution i on p.institution_id = i.institution_id
  WHERE p.proposal_code=$3 AND i.abbreviated_name=$4 
)
UPDATE position SET owner_institution_user_ids=(SELECT array_agg(DISTINCT id) from owner_institution_user_ids)
WHERE plane_id IN (SELECT * FROM plane_ids)
  `;
  await client.query(sql, [
    proposalCode,
    institution,
    proposalCode,
    institution
  ]);
}

async function _removePositionOwners(
  proposalCode: string,
  institution: string,
  client: any
) {
  const sql = `
WITH plane_ids (id) AS (
  SELECT DISTINCT pln.plane_id
  FROM plane pln
  JOIN observation obs ON pln.observation_id = obs.observation_id
  JOIN proposal p ON obs.proposal_id = p.proposal_id
  JOIN institution i on p.institution_id = i.institution_id
  WHERE p.proposal_code=$1 AND i.abbreviated_name=$2
)
UPDATE position SET owner_institution_user_ids=NULL
WHERE plane_id IN (SELECT * FROM plane_ids)
  `;
  await client.query(sql, [proposalCode, institution]);
}

/**
 * Get an institution user id belonging to a proposal.
 *
 * Only one id is returned, even if there are multiple users. Which id is
 * returned is not defined.
 */
async function _institutionUserId(
  proposalCode: string,
  institution: string,
  client: any
): Promise<number> {
  const sql = `
SELECT DISTINCT pi.institution_user_id
FROM proposal_investigator pi
JOIN proposal p ON pi.proposal_id = p.proposal_id
JOIN institution i on p.institution_id = i.institution_id
WHERE p.proposal_code=$1 AND i.abbreviated_name=$2
  `;
  const res = await client.query(sql, [proposalCode, institution]);
  return res.rows[0].institution_user_id;
}

async function _setInstitutionUserId(
  proposalCode: string,
  institution: string,
  client: any
) {
  const institutionUserId = await _institutionUserId(
    proposalCode,
    institution,
    client
  );
  const sql = `SET my.institution_user_id=${institutionUserId}`;
  await client.query(sql);
}

function _isValidDate(dateString: string): boolean {
  const date = parse(dateString, "yyyy-MM-dd", new Date());
  return isValid(date);
}
