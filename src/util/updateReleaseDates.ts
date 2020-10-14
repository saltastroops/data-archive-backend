import { isValid, parse } from "date-fns";
import { ssdaPool } from "../db/postgresql_pool";

export default async function updateReleaseDates(
  proposalCode: string,
  institution: string,
  dataReleaseDate: string,
  metadataReleaseDate: string
): Promise<boolean> {
  if (!isValidDate(dataReleaseDate)) {
    throw new Error(
      "Invalid data release date. The date must be of the form yyyy-mm-dd."
    );
  }
  if (!isValidDate(metadataReleaseDate)) {
    throw new Error(
      "Invalid metadata release date. The date must be of the form yyyy-mm-dd."
    );
  }

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
  const client = await ssdaPool.connect();
  await client.query(sql, [
    proposalCode,
    institution,
    dataReleaseDate,
    metadataReleaseDate
  ]);

  return true;
}

function isValidDate(dateString: string): boolean {
  const date = parse(dateString, "yyyy-MM-dd", new Date());
  return isValid(date);
}
