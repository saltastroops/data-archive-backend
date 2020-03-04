import assert from "assert";
import { sdbPool } from "../db/mysql_pool";
import { ssdaPool } from "../db/postgresql_pool";
import { CalibrationType } from "./calibrations";

/**
 * Find the non-charged calibrations to include with a SALT artifact.
 *
 * Parameters
 * ----------
 * artifactId : number
 *     Artifact id.
 * calibrationTypes : set
 *     Requested calibration types.
 *
 *  Returns
 *  -------
 *  The calibration artifact ids.
 */
export async function additionalSaltCalibrations(
  artifactId: number,
  calibrationTypes: Set<CalibrationType>
): Promise<Set<number>> {
  // Find the instrument
  const instrument = await findInstrument(artifactId);

  // Find the file data id
  const fileDataId = await findFileDataId(artifactId);

  // Get the calibration file data ids
  let calibrationFileDataIds: Set<number>;
  if (instrument === "Salticam") {
    calibrationFileDataIds = await salticamCalibrations(
      fileDataId,
      calibrationTypes
    );
  } else if (instrument === "RSS") {
    calibrationFileDataIds = await rssCalibrations(
      fileDataId,
      calibrationTypes
    );
  } else if (instrument === "HRS") {
    calibrationFileDataIds = await hrsCalibrations(
      fileDataId,
      calibrationTypes
    );
  } else if (instrument === "BCAM") {
    calibrationFileDataIds = await bcamCalibrations(
      fileDataId,
      calibrationTypes
    );
  } else {
    throw new Error(`Unsupported instrument: ${instrument}`);
  }

  // Get the corresponding artifact ids
  const calibrationArtifactIds = new Set<number>();
  for (let fileDataId of Array.from(calibrationFileDataIds)) {
    const artifactId = await findArtifactId(fileDataId);
    calibrationArtifactIds.add(artifactId);
  }
  return calibrationArtifactIds;
}

/**
 * Find the non-charged Salticam calibrations to include with file data.
 *
 * No calibrations are included.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     File data id.
 * calibrationTypes : set
 *     Requested calibration types.
 *
 *  Returns
 *  -------
 *  The calibration file data ids.
 */
async function salticamCalibrations(
  fileDataId: number,
  calibrationTypes: Set<CalibrationType>
): Promise<Set<number>> {
  return new Set();
}

/**
 * Find uncharged biases for a Salticam observation file.
 *
 * At most one bias is returned.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     Observation file data id.
 * calibrationTypes : set
 *     Requested calibration types.
 *
 *  Returns
 *  -------
 *  The calibration file data ids.
 *
 */
async function salticamBiases(
  fileDataId: number,
  period: number
): Promise<Set<number>> {
  // Find the relevant setup details
  const setup = await findSalticamSetupDetails(fileDataId);

  // Find bias files with the same setup details
  const biasesSQL = `
  SELECT fd.FileData_Id
  FROM FileData fd
           LEFT JOIN FitsHeaderImage USING (FileData_Id)
           LEFT JOIN FitsHeaderSalticam USING (FileData_Id)
           LEFT JOIN ProposalCode USING (ProposalCode_Id)
  WHERE CCDSUM=? AND GAINSET=? AND ROSPEED=?
        AND FileName LIKE 'S2%'
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

/**
 * Find the non-charged RSS calibrations to include with file data.
 *
 * Spectrophotometric standards are included.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     File data id.
 * calibrationTypes : set
 *     Requested calibration types.
 */
async function rssCalibrations(
  fileDataId: number,
  calibrationTypes: Set<CalibrationType>
): Promise<Set<number>> {
  // Add spectrophotometric standards, if requested
  const calibrationIds = new Set<number>();
  if (calibrationTypes.has("SPECTROPHOTOMETRIC_STANDARD")) {
    (await rssSpectrophotometricStandards(fileDataId, 30)).forEach(id =>
      calibrationIds.add(id)
    );
  }

  return calibrationIds;
}

/**
 * Find uncharged biases for an RSS observation file.
 *
 * At most one bias is returned.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     Observation file data id.
 * calibrationTypes : set
 *     Requested calibration types.
 *
 *  Returns
 *  -------
 *  The calibration file data ids.
 *
 */
async function rssBiases(
  fileDataId: number,
  period: number
): Promise<Set<number>> {
  // Find the relevant setup details
  const setup = await findRssSetupDetails(fileDataId);

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

/**
 * Find uncharged flats for an RSS observation file.
 *
 * At most one flat is returned.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     Observation file data id.
 * calibrationTypes : set
 *     Requested calibration types.
 *
 *  Returns
 *  -------
 *  The calibration file data ids.
 *
 */
async function rssFlats(
  fileDataId: number,
  period: number
): Promise<Set<number>> {
  // Find the relevant setup details
  const setup = await findRssSetupDetails(fileDataId);

  // Find the flats
  const sql = `
  SELECT fd.FileData_Id
  FROM FileData fd
           LEFT JOIN ProposalCode USING (ProposalCode_Id)
           LEFT JOIN FitsHeaderImage USING (FileData_Id)
           LEFT JOIN FitsHeaderRss USING (FileData_Id)
  WHERE CCDTYPE=? AND fd.DETMODE=? AND fd.OBSMODE=? AND CCDSUM=? AND GAINSET=? AND ROSPEED=? AND FILTER=? AND GRATING=? AND GRTILT=? AND AR_STA=? AND MASKID=?
      AND FileName LIKE 'P2%'
        AND Proposal_Code IN ('CAL_FLAT', 'CAL_SKYFLAT')
        AND DATE_ADD(?, INTERVAL ? DAY) <= UTStart
        AND DATE_ADD(?, INTERVAL ? DAY) >= UTStart
  ORDER BY ABS(TIMESTAMPDIFF(SECOND, ?, UTStart))    
  `;
  const res: any = await sdbPool.query(sql, [
    setup.CCDTYPE,
    setup.DETMODE,
    setup.OBSMODE,
    setup.CCDSUM,
    setup.GAINSET,
    setup.ROSPEED,
    setup.FILTER,
    setup.GRATING,
    setup.GRTILT,
    setup.AR_STA,
    setup.MASKID,
    setup.UTStart,
    -period,
    setup.UTStart,
    period,
    setup.UTStart
  ]);
  if (res[0].length > 0) {
    return new Set([res[0][0].FileData_Id]);
  }

  return new Set();
}

/**
 * Find spectrophotometric standards for an RSS observation file.
 *
 * At most one standard is returned.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     Observation file data id.
 * calibrationTypes : set
 *     Requested calibration types.
 *
 *  Returns
 *  -------
 *  The calibration file data ids.
 *
 */
async function rssSpectrophotometricStandards(
  fileDataId: number,
  period: number
): Promise<Set<number>> {
  // Find the relevant setup details
  const setup = await findRssSetupDetails(fileDataId);

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

/**
 * Find the non-charged HRS calibrations to include with file data.
 *
 * Radial velocity and spectrophotometric standards are included.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     File data id.
 * calibrationTypes : set
 *     Requested calibration types.
 */
async function hrsCalibrations(
  fileDataId: number,
  calibrationTypes: Set<CalibrationType>
): Promise<Set<number>> {
  // Add radial velocity standards, if requested
  const calibrationIds = new Set<number>();
  if (calibrationTypes.has("RADIAL_VELOCITY_STANDARD")) {
    (await hrsRadialVelocityStandards(fileDataId, 9000)).forEach(id =>
      calibrationIds.add(id)
    );
  }

  // Add spectrophotometric standards, if requested
  if (calibrationTypes.has("SPECTROPHOTOMETRIC_STANDARD")) {
    (await hrsSpectrophotometricStandards(fileDataId, 9000)).forEach(id =>
      calibrationIds.add(id)
    );
  }

  return calibrationIds;
}

/**
 * Find biases for an HRS observation file.
 *
 * At most one bias is returned.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     Observation file data id.
 * calibrationTypes : set
 *     Requested calibration types.
 *
 *  Returns
 *  -------
 *  The calibration file data ids.
 */
async function hrsBiases(
  fileDataId: number,
  period: number
): Promise<Set<number>> {
  // Find the relevant setup details
  const setup = await findHrsSetupDetails(fileDataId);

  // Use the same detector arm as for the setup considered
  const filenamePattern = setup.FileName.charAt(0) + "2%";

  // Find bias files with the same setup details
  const biasesSQL = `
  SELECT fd.FileData_Id
  FROM FileData fd
           LEFT JOIN FitsHeaderImage USING (FileData_Id)
           LEFT JOIN FitsHeaderHrs USING (FileData_Id)
           LEFT JOIN ProposalCode USING (ProposalCode_Id)
  WHERE CCDSUM=? AND GAINSET=? AND ROSPEED=?
        AND FileName LIKE ${filenamePattern}
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

/**
 * Find spectrophotometric standards for an HRS observation file.
 *
 * At most one standard is returned.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     Observation file data id.
 * calibrationTypes : set
 *     Requested calibration types.
 *
 *  Returns
 *  -------
 *  The calibration file data ids.
 *
 */
async function hrsSpectrophotometricStandards(
  fileDataId: number,
  period: number
): Promise<Set<number>> {
  // Find the relevant setup details
  const setup = await findHrsSetupDetails(fileDataId);

  // Use the same detector arm as for the setup considered
  const filenamePattern = setup.FileName.charAt(0) + "2%";

  // Find spectrophotometric standards with the same setup details
  const standardsSQL = `
  SELECT fd.FileData_Id
  FROM FileData fd
           LEFT JOIN FitsHeaderImage fhi USING (FileData_Id)
           LEFT JOIN FitsHeaderHrs USING (FileData_Id)
           LEFT JOIN ProposalCode USING (ProposalCode_Id)
  WHERE CCDSUM=? AND fhi.OBSMODE=?
        AND FileName LIKE '${filenamePattern}'
        AND Proposal_Code='CAL_SPST'
        AND DATE_ADD(?, INTERVAL ? DAY) <= UTStart
        AND DATE_ADD(?, INTERVAL ? DAY) >= UTStart
  ORDER BY ABS(TIMESTAMPDIFF(SECOND, ?, UTStart))
  `;
  const standardsRes: any = await sdbPool.query(standardsSQL, [
    setup.CCDSUM,
    setup.OBSMODE,
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

/**
 * Find radial velocity standards for an RSS observation file.
 *
 * At most one standard is returned.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     Observation file data id.
 * calibrationTypes : set
 *     Requested calibration types.
 *
 *  Returns
 *  -------
 *  The calibration file data ids.
 *
 */
async function hrsRadialVelocityStandards(
  fileDataId: number,
  period: number
): Promise<Set<number>> {
  // Find the relevant setup details
  const setup = await findHrsSetupDetails(fileDataId);

  // Use the same detector arm as for the setup considered
  const filenamePattern = setup.FileName.charAt(0) + "2%";

  // Find spectrophotometric standards with the same setup details
  const standardsSQL = `
  SELECT fd.FileData_Id
  FROM FileData fd
           LEFT JOIN FitsHeaderImage fhi USING (FileData_Id)
           LEFT JOIN FitsHeaderHrs USING (FileData_Id)
           LEFT JOIN ProposalCode USING (ProposalCode_Id)
  WHERE CCDSUM=? AND fhi.OBSMODE=?
        AND FileName LIKE '${filenamePattern}'
        AND Proposal_Code='CAL_RVST'
        AND DATE_ADD(?, INTERVAL ? DAY) <= UTStart
        AND DATE_ADD(?, INTERVAL ? DAY) >= UTStart
  ORDER BY ABS(TIMESTAMPDIFF(SECOND, ?, UTStart))
  `;
  const standardsRes: any = await sdbPool.query(standardsSQL, [
    setup.CCDSUM,
    setup.OBSMODE,
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

/**
 * Find the non-charged BCAM calibrations to include with file data.
 *
 * No calibrations are included.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     File data id.
 * calibrationTypes : set
 *     Requested calibration types.
 *
 *  Returns
 *  -------
 *  The calibration file data ids.
 */
async function bcamCalibrations(
  fileDataId: number,
  calibrationTypes: Set<CalibrationType>
): Promise<Set<number>> {
  return new Set();
}

/**
 * Find the instrument used for obtaining the data for an artifact.
 *
 * Parameters
 * ----------
 * artifactId : number
 *     Artifact id.
 *
 * Returns
 * -------
 * The instrument.
 */
async function findInstrument(artifactId: number): Promise<string> {
  const instrumentSQL = `
  SELECT i.name FROM instrument i
    JOIN observation o on i.instrument_id = o.instrument_id
    JOIN plane p on o.observation_id = p.observation_id
    JOIN artifact a on p.plane_id = a.plane_id
  WHERE a.artifact_id=$1
  `;
  const instrumentRes = await ssdaPool.query(instrumentSQL, [artifactId]);
  assert(instrumentRes.rowCount === 1);
  return instrumentRes.rows[0].name;
}

/**
 * Find the (SDB) file data id for an artifact.
 *
 * Parameters
 * ----------
 * artifactId : number
 *     Artifact id.
 *
 * Returns
 * -------
 * The file data id.
 */
async function findFileDataId(artifactId: number): Promise<number> {
  // Find the (file) name of the artifact.
  const artifactNameSQL = `
  SELECT name FROM artifact WHERE artifact_id=$1
  `;
  const artifactNameRes = await ssdaPool.query(artifactNameSQL, [artifactId]);
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

/**
 * Find the artifact id for (SDB) file data.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     File data id.
 *
 * Returns
 * -------
 * The artifact id.
 */
async function findArtifactId(fileDataId: number): Promise<number> {
  // Find the file name of the file data.
  const fileNameSQL = `
  SELECT FileName FROM FileData WHERE FileData_Id=?
  `;
  const fileNameRes: any = await sdbPool.query(fileNameSQL, [fileDataId]);
  assert(fileNameRes[0].length == 1 && fileNameRes[0][0].FileName);
  const filename = fileNameRes[0][0].FileName;

  // Find the artifact id for that file name.
  const artifactIdSQL = `
  SELECT artifact_id FROM artifact a
      JOIN plane p on a.plane_id = p.plane_id
      JOIN observation o on p.observation_id = o.observation_id
      JOIN telescope t on o.telescope_id = t.telescope_id
  WHERE t.name='SALT' AND a.name=$1
  `;
  const artifactIdRes = await ssdaPool.query(artifactIdSQL, [filename]);
  assert(artifactIdRes.rowCount === 1);
  return parseInt(artifactIdRes.rows[0].artifact_id);
}

/**
 * Find the details of the Salticam setup used for an observation.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     File data id.
 *
 *  Returns
 *  -------
 *  The Salticam setup details.
 */
async function findSalticamSetupDetails(fileDataId: number): Promise<any> {
  // Find the relevant setup details
  const dataSQL = `
  SELECT fd.FileName, fd.FileData_Id, CCDTYPE, fd.DETMODE, fd.OBSMODE, CCDSUM,
         GAINSET, ROSPEED, UTStart
  FROM FileData fd
       LEFT JOIN FitsHeaderImage USING (FileData_Id)
       LEFT JOIN FitsHeaderSalticam USING (FileData_Id)
  WHERE fd.FileData_Id=?
  `;

  const dataRes: any = await sdbPool.query(dataSQL, [fileDataId]);
  return dataRes[0][0];
}

/**
 * Find the details of the RSS setup used for an observation.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     File data id.
 *
 *  Returns
 *  -------
 *  The RSS setup details.
 */
async function findRssSetupDetails(fileDataId: number): Promise<any> {
  // Find the relevant setup details
  const dataSQL = `
  SELECT fd.FileName, fd.FileData_Id, CCDTYPE, fd.DETMODE, fd.OBSMODE, CCDSUM,
         GAINSET, ROSPEED, FILTER, GRATING, GRTILT, CAMANG, MASKID, UTStart
  FROM FileData fd
       LEFT JOIN FitsHeaderImage USING (FileData_Id)
       LEFT JOIN FitsHeaderRss USING (FileData_Id)
  WHERE fd.FileData_Id=?
  `;

  const dataRes: any = await sdbPool.query(dataSQL, [fileDataId]);
  return dataRes[0][0];
}

/**
 * Find the details of the HRS setup used for an observation.
 *
 * Parameters
 * ----------
 * fileDataId : number
 *     File data id.
 *
 *  Returns
 *  -------
 *  The HRS setup details.
 */
async function findHrsSetupDetails(fileDataId: number): Promise<any> {
  // Find the relevant setup details
  const dataSQL = `
  SELECT fd.FileName, fd.FileData_Id, CCDTYPE, fd.DETMODE, fd.OBSMODE, CCDSUM,
         GAINSET, ROSPEED, UTStart
  FROM FileData fd
       LEFT JOIN FitsHeaderImage USING (FileData_Id)
       LEFT JOIN FitsHeaderHrs USING (FileData_Id)
  WHERE fd.FileData_Id=?
  `;

  const dataRes: any = await sdbPool.query(dataSQL, [fileDataId]);
  return dataRes[0][0];
}
