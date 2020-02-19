import assert from "assert";
import { sdbPool } from "../db/mysql_pool";
import { ssdaPool } from "../db/postgresql_pool";
import { CalibrationType } from "./calibrations";

export async function saltCalibrations(
  artifactId: number
): Promise<Set<number>> {
  const res = await rssCalibrations(artifactId, new Set());
  console.log({ res });
  return res;
}

async function nonObservationCalibrations(
  artifactId: number,
  instrument: string,
  calibrationTypes: Set<CalibrationType>
): Promise<Set<number>> {
  return new Set();
}

async function salticamCalibrations(
  artifactId: number,
  calibrationTypes: Set<CalibrationType>
): Promise<Set<number>> {
  // no additional calibrations
  return new Set();
}

async function rssCalibrations(
  artifactId: number,
  calibrationTypes: Set<CalibrationType>
): Promise<Set<number>> {
  // Find the spectrophotometric standards
  const fileDataId = await findFileId(artifactId);
  return rssBiases(fileDataId, 300);
}

async function rssBiases(
  fileDataId: number,
  period: number
): Promise<Set<number>> {
  // Find the relevant setup details
  const setup = await findSetupDetails(fileDataId, "FitsHeaderRss");

  // Find bias files with the same setup details
  const biasesSQL = `
  SELECT fd.FileData_Id
  FROM FileData fd
           LEFT JOIN FitsHeaderImage USING (FileData_Id)
           LEFT JOIN FitsHeaderRss USING (FileData_Id)
           LEFT JOIN ProposalCode USING (ProposalCode_Id)
  WHERE CCDSUM=? AND GAINSET=? AND ROSPEED=?
        AND FileName LIKE 'P2%'
        AND Proposal_Code='CAL_BIAS'
        AND DATE_ADD(?, INTERVAL ? DAY) <= UTStart
        AND DATE_ADD(?, INTERVAL ? DAY) >= UTStart
  ORDER BY ABS(TIMESTAMPDIFF(SECOND, ?, UTStart))  
  `;
  const biasesRes: any = await sdbPool.query(biasesSQL, [
    setup.CCDSUM,
    setup.GAINSET,
    setup.ROSPEED,
    setup.UTStart,
    -period,
    setup.UTStart,
    period,
    setup.UTStart
  ]);
  if (biasesRes[0].length > 0) {
    return new Set([biasesRes[0][0].FileData_Id]);
  }

  return new Set();
}

async function rssSpectrophotometricStandards(
  fileDataId: number,
  period: number
): Promise<Set<number>> {
  // Find the relevant setup details
  const setup = await findSetupDetails(fileDataId, "FitsHeaderRss");

  // Find spectrophotometric standards with the same setup details
  const standardsSQL = `
  SELECT fd.FileData_Id
  FROM FileData fd
           LEFT JOIN FitsHeaderImage USING (FileData_Id)
           LEFT JOIN FitsHeaderRss USING (FileData_Id)
           LEFT JOIN ProposalCode USING (ProposalCode_Id)
  WHERE CCDSUM=? AND GRATING=? AND GRTILT=? AND CAMANG=?
        AND FileName LIKE 'P2%'
        AND Proposal_Code='CAL_SPST'
        AND DATE_ADD(?, INTERVAL ? DAY) <= UTStart
        AND DATE_ADD(?, INTERVAL ? DAY) >= UTStart
  ORDER BY ABS(TIMESTAMPDIFF(SECOND, ?, UTStart))
  `;
  const standardsRes: any = await sdbPool.query(standardsSQL, [
    setup.CCDSUM,
    setup.GRATING,
    setup.GRTILT,
    setup.CAMANG,
    setup.UTStart,
    -period,
    setup.UTStart,
    period,
    setup.UTStart
  ]);
  if (standardsRes[0].length > 0) {
    return new Set([standardsRes[0][0].FileData_Id]);
  }

  return new Set();
}

async function findFileId(artifactId: number): Promise<number> {
  // Find the (file) name of the artifact.
  const artifactNameSQL = `
  SELECT name FROM artifact WHERE artifact_id=$1
  `;
  const ssdaClient = await ssdaPool.connect();
  const artifactNameRes = await ssdaClient.query(artifactNameSQL, [artifactId]);
  assert(artifactNameRes.rowCount === 1);
  const name = artifactNameRes.rows[0].name;

  // Find the file data id for that name.
  const fileIdSQL = `
  SELECT FileData_Id FROM FileData WHERE FileName=?
  `;
  const fileDataIdRes: any = await sdbPool.query(fileIdSQL, [name]);
  assert(fileDataIdRes[0].length === 1 && fileDataIdRes[0][0].FileData_Id);
  return parseInt(fileDataIdRes[0][0].FileData_Id);
}

async function findSetupDetails(
  fileDataId: number,
  fitsInstrumentHeaderTable: string
): Promise<any> {
  // Find the relevant setup details
  const dataSQL = `
  SELECT fd.FileName, fd.FileData_Id, CCDTYPE, fd.DETMODE, fd.OBSMODE, CCDSUM,
         GAINSET, ROSPEED, FILTER, GRATING, GRTILT, CAMANG, MASKID, UTStart
  FROM FileData fd
       LEFT JOIN FitsHeaderImage USING (FileData_Id)
       LEFT JOIN ${fitsInstrumentHeaderTable} USING (FileData_Id)
  WHERE fd.FileData_Id=?
  `;

  const dataRes: any = await sdbPool.query(dataSQL, [fileDataId]);
  return dataRes[0][0];
}
