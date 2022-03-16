import { Request, Response } from "express";
import "express-zip";
import fs from "fs";
import { sync } from "glob";
import moment from "moment";
import { nanoid } from "nanoid";
import { tmpdir } from "os";
import { basename, dirname, join } from "path";
import { ssdaPool } from "../db/postgresql_pool";
import { CalibrationLevel } from "./calibrations";
import { mayViewAllOfDataFiles, User } from "./user";

type AdditionalFile = {
  filepath: string;
  description: string;
};

const collectArtifactsToZip = async (fileIds: string[]) => {
  // collect the files
  const sql = `SELECT         (paths).raw,
                              (paths).reduced,   
                              product_type AS type,
                              proposal_code AS proposal_code,
                              obs_group.name AS observation_id,
                              ins.name AS instrument_name,
                              night
               FROM observations.artifact atf
               LEFT OUTER JOIN observations.plane p ON p.plane_id = atf.plane_id
               LEFT OUTER JOIN observations.observation_time obs_time ON obs_time.plane_id = p.plane_id
               LEFT OUTER JOIN observations.observation obs ON p.observation_id = obs.observation_id
               LEFT OUTER JOIN observations.product_type pt ON atf.product_type_id = pt.product_type_id
               LEFT OUTER JOIN observations.proposal obsp ON obs.proposal_id = obsp.proposal_id
               LEFT OUTER JOIN observations.instrument ins on obs.instrument_id = ins.instrument_id
               LEFT OUTER JOIN observations.observation_group obs_group on obs_group.observation_group_id = obs.observation_group_id
               WHERE artifact_id = ANY($1)
  `;
  const res = await ssdaPool.query(sql, [fileIds]);
  return res.rows;
};

export const createReadMeFile = (dataFiles: any[]) => {
  const readme = createReadMeContent(dataFiles);
  const filepath = join(tmpdir(), nanoid());
  fs.writeFileSync(filepath, readme);
  return filepath;
};

export const createReadMeContent = (dataFiles: any[]) => {
  const fileNameHeading = "File name";
  const fileTypeHeading = "Type";
  const proposalCodeHeading = "Proposal code";
  const observationIdHeading = "Observation id";
  const nightHeading = "Night";
  const fileDescriptionHeading = "File Description";

  // Get the maximum length of the table columns
  const nameStrLength = Math.max(
    ...[
      fileNameHeading.length,
      ...dataFiles.map((file: { filename: string }) => file.filename.length)
    ]
  );

  const typeStrLength = Math.max(
    ...[
      fileTypeHeading.length,
      ...dataFiles.map((file: { type: string }) => file.type.length)
    ]
  );

  const proposalCodeStrLength = Math.max(
    ...[
      proposalCodeHeading.length,
      ...dataFiles.map(
        (file: { proposal_code: string }) => file.proposal_code.length
      )
    ]
  );

  const observationIdStrLength = Math.max(
    ...[
      observationIdHeading.length,
      ...dataFiles.map(
        (file: { observation_id: string }) => file.observation_id.length
      )
    ]
  );

  const nightStrLength = Math.max(
    ...[
      nightHeading.length,
      ...dataFiles.map((file: { night: string }) => file.night.length)
    ]
  );

  const fileDescriptionStrLength = Math.max(
    ...[
      fileDescriptionHeading.length,
      ...dataFiles.map(
        (file: { fileDescription: string }) => file.fileDescription.length
      )
    ]
  );

  // Table row separator
  const rowBorder = `
+-${"-".repeat(nameStrLength)}-+-${"-".repeat(typeStrLength)}-+-${"-".repeat(
    proposalCodeStrLength
  )}-+-${"-".repeat(observationIdStrLength)}-+-${"-".repeat(
    nightStrLength
  )}-+-${"-".repeat(fileDescriptionStrLength)}-+`;

  // Table content of the table header
  const tableHeaderContent = `
| ${fileNameHeading}${" ".repeat(
    nameStrLength - fileNameHeading.length
  )} | ${fileTypeHeading}${" ".repeat(
    typeStrLength - fileTypeHeading.length
  )} | ${proposalCodeHeading}${" ".repeat(
    proposalCodeStrLength - proposalCodeHeading.length
  )} | ${observationIdHeading}${" ".repeat(
    observationIdStrLength - observationIdHeading.length
  )} | ${nightHeading}${" ".repeat(
    nightStrLength - nightHeading.length
  )} | ${fileDescriptionHeading}${" ".repeat(
    fileDescriptionStrLength - fileDescriptionHeading.length
  )} |`;

  // The header of the table
  const tableHeader = rowBorder + tableHeaderContent + rowBorder;

  // The body of the table
  let tableBody = ``;
  dataFiles.forEach(
    (file: {
      filename: string;
      fileDescription: string;
      type: string;
      night: string;
      proposal_code: string;
      observation_id: string;
    }) => {
      // The content of the table body
      let tableRowContent = `
| ${file.filename}${" ".repeat(nameStrLength - file.filename.length)} `;

      tableRowContent += `| ${file.type}${" ".repeat(
        typeStrLength - file.type.length
      )} `;

      tableRowContent += `| ${file.proposal_code}${" ".repeat(
        proposalCodeStrLength - file.proposal_code.length
      )} `;

      tableRowContent += `| ${file.observation_id}${" ".repeat(
        observationIdStrLength - file.observation_id.length
      )} `;

      tableRowContent += `| ${file.night}${" ".repeat(
        nightStrLength - file.night.length
      )} `;

      tableRowContent += `| ${file.fileDescription}${" ".repeat(
        fileDescriptionStrLength - file.fileDescription.length
      )} |`;

      tableBody = tableBody + tableRowContent + rowBorder;
    }
  );

  const calibrationsMessage = `
Arcs, flats and biases (if requested) are only included if they were taken as
part of an observation. For spectrophotometric and radial velocity standards
(if requested) the standard taken nearest to an observation is included.\n`;
  // The title of the table
  const tableTitle = `The requested files\n======================================================================\n`;

  // The table containing the data request file names and type of the product data contained by the file
  const table = tableHeader + tableBody + `\n`;
  // The SALT policy
  const policy = `
Publication and acknowledgment policy
=====================================

Publications
------------
Please notify salthelp@salt.ac.za of any publication made using SALT data
including reviewed papers and conference proceedings.

Science paper acknowledgements
------------------------------
All science papers that include SALT data which are submitted for publication in
refereed science journals must include the following words of acknowledgment:

“All/some [choose which is appropriate] of the observations reported in this 
paper were obtained with the Southern African Large Telescope (SALT) under
program(s) [insert Proposal Code(s)].”

We recommend that the Principle Investigator is also mentioned after the
Proposal Code. In addition, for papers which predominantly based on SALT data,
a footnote symbol should appear after the paper title, and the following text
should be written as a footnote:

"based on observations made with the Southern African Large Telescope (SALT)"

If possible, please also include the Proposal Code and Principle Investigator in
body of the paper when describing observations.

If you use data reduced by the SALT science pipeline or use the PySALT software,
please provide a link to http://pysalt.salt.ac.za/ and cite the following paper:

Crawford, S.M., Still, M., Schellart, P., Balona, L., Buckley, D.A.H., 
Gulbis, A.A.S., Kniazev, A., Kotze, M., Loaring, N., Nordsieck, K.H.,
Pickering, T.E., Potter, S., Romero Colmenero, E., Vaisanen, P., Williams, T.,
Zietsman, E., 2010. PySALT: the SALT Science Pipeline.
SPIE Astronomical Instrumentation, 7737-82\n`;

  return tableTitle + calibrationsMessage + table + policy;
};

export const dataFilesToZip = async (
  fileIds: string[],
  calibrationLevels: Set<CalibrationLevel>
) => {
  const artifacts = await collectArtifactsToZip(fileIds);

  /*
  For each requested file and calibration level we create the object to be used when
  creating the rows of the table of files. This includes a description of the file(s)
  based on the instrument and calibration level.
 */
  const dataFiles: any[] = [];
  for (const df of artifacts) {
    for (const calibrationLevel of Array.from(calibrationLevels)) {
      let filepath: string;
      let description: string;

      if (calibrationLevel === "RAW") {
        filepath = process.env.FITS_BASE_DIR + "/" + df.raw;
        description = `Raw ${df.instrument_name} data`;
      } else if (calibrationLevel === "REDUCED") {
        if (!df.reduced || df.reduced.length < 5) {
          // exclude NULL and "None"
          continue;
        }
        filepath = process.env.FITS_BASE_DIR + "/" + df.reduced;
        description = `Reduced ${df.instrument_name} data`;
      } else {
        throw new Error(`Unsupported calibration level ${calibrationLevel}`);
      }

      const filename = basename(filepath);
      const fileDescription = description;

      if (df.observation_id === "SALT-") {
        df.observation_id = "SALT";
      }

      if (df.observation_id.length > 13) {
        df.observation_id = df.observation_id.substr(0, 13);
      }

      dataFiles.push({
        fileDescription,
        filename,
        filepath,
        instrument_name: df.instrument_name,
        night: moment(df.night).format("YYYY-MM-DD"),
        observation_id: df.observation_id ? df.observation_id : "",
        proposal_code: df.proposal_code ? df.proposal_code : "",
        type: df.type
      });

      if (calibrationLevel === "REDUCED") {
        additionalFiles(filepath).forEach(f => {
          dataFiles.push({
            fileDescription: f.description,
            filename: basename(f.filepath),
            filepath: f.filepath,
            instrument_name: df.instrument_name,
            night: moment(df.night).format("YYYY-MM-DD"),
            observation_id: df.observation_id ? df.observation_id : "",
            proposal_code: df.proposal_code ? df.proposal_code : "",
            type: df.type
          });
        });
      }
    }
  }

  return dataFiles;
};

export async function downloadZippedDataRequest(req: Request, res: Response) {
  // Check if the user is logged in
  if (!req.user) {
    return res.status(401).send({
      message: "You must be logged in.",
      success: false
    });
  }

  // Get all the params from the request
  const { dataRequestId } = req.params;

  // Check that this is the user's request
  const user: User = req.user as User;
  const userMadeRequest = await didUserMakeDataRequest(
    user as User,
    dataRequestId
  );
  if (!userMadeRequest) {
    return res.status(403).send({
      message: "You do not own this data request.",
      success: false
    });
  }

  const calibrationLevels = await findCalibrationLevels(dataRequestId);
  const artifactIds = await findArtifactIds(dataRequestId);

  const dataFiles = await dataFilesToZip(artifactIds, calibrationLevels);

  // Check that the user may download all the files
  const mayRequest = await mayViewAllOfDataFiles(user, artifactIds);
  if (!mayRequest) {
    throw new Error("You are not allowed to request some of the files");
  }

  const readmePath = createReadMeFile(dataFiles);
  const files = [
    { name: "README.txt", path: readmePath },
    ...dataFiles.map(df => ({ name: df.filename, path: df.filepath }))
  ];
  const filename = "DataRequest-" + moment().format("Y-MM-DD") + ".zip";
  (res as any).zip(files, filename);
}

async function findCalibrationLevels(dataRequestId: string) {
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

async function findArtifactIds(dataRequestId: string) {
  const artifactIdSQL = `SELECT artifact_id FROM admin.data_request_artifact WHERE data_request_id = $1; `;
  const artifactIdsResults = await ssdaPool.query(artifactIdSQL, [
    parseInt(dataRequestId, 10)
  ]);
  return artifactIdsResults.rows.map(artId => artId.artifact_id.toString());
}

export async function filesToBeZipped(
  fileIds: string[],
  requestedCalibrationLevels: Set<CalibrationLevel>
) {
  // collect the files
  const sql = `SELECT         (paths).raw,
                              (paths).reduced,   
                              product_type AS type,
                              proposal_code AS proposal_code,
                              obs_group.name AS observation_id,
                              ins.name AS instrument_name,
                              night
               FROM observations.artifact atf
               LEFT OUTER JOIN observations.plane p ON p.plane_id = atf.plane_id
               LEFT OUTER JOIN observations.observation_time obs_time ON obs_time.plane_id = p.plane_id
               LEFT OUTER JOIN observations.observation obs ON p.observation_id = obs.observation_id
               LEFT OUTER JOIN observations.product_type pt ON atf.product_type_id = pt.product_type_id
               LEFT OUTER JOIN observations.proposal obsp ON obs.proposal_id = obsp.proposal_id
               LEFT OUTER JOIN observations.instrument ins on obs.instrument_id = ins.instrument_id
               LEFT OUTER JOIN observations.observation_group obs_group on obs_group.observation_group_id = obs.observation_group_id
               WHERE artifact_id = ANY($1)
  `;
  const res = await ssdaPool.query(sql, [fileIds]);
  const artifacts = res.rows;

  const dataFiles: any[] = [];

  /*
    For each requested file and calibration level we create the object to be used when
    creating the rows of the table of files. This includes a description of the file(s)
    based on the instrument and calibration level.
   */
  for (const df of artifacts) {
    for (const calibrationLevel of Array.from(requestedCalibrationLevels)) {
      let filepath: string;
      let description: string;

      if (calibrationLevel === "RAW") {
        filepath = df.raw;
        description = `Raw ${df.instrument_name} data`;
      } else if (calibrationLevel === "REDUCED") {
        filepath = df.reduced;
        description = `Reduced ${df.instrument_name} data`;
      } else {
        throw new Error(`Unsupported calibration level ${calibrationLevel}`);
      }

      if (!filepath || filepath.length < 5) {
        // exclude NULL and "None"
        continue;
      }
      const filename = basename(filepath);
      const fileDescription = description;

      if (df.observation_id === "SALT-") {
        df.observation_id = "SALT";
      }

      if (df.observation_id.length > 13) {
        df.observation_id = df.observation_id.substr(0, 13);
      }

      dataFiles.push({
        fileDescription,
        filename,
        filepath,
        instrument_name: df.instrument_name,
        night: moment(df.night).format("YYYY-MM-DD"),
        observation_id: df.observation_id ? df.observation_id : "",
        proposal_code: df.proposal_code ? df.proposal_code : "",
        type: df.type
      });

      if (calibrationLevel === "REDUCED") {
        additionalFiles(filepath).forEach(f => {
          dataFiles.push({
            fileDescription: f.description,
            filename: basename(f.filepath),
            filepath: f.filepath,
            instrument_name: df.instrument_name,
            night: moment(df.night).format("YYYY-MM-DD"),
            observation_id: df.observation_id ? df.observation_id : "",
            proposal_code: df.proposal_code ? df.proposal_code : "",
            type: df.type
          });
        });
      }
    }
  }
  return dataFiles;
}

export function additionalFiles(filepath: string): Set<AdditionalFile> {
  const filename = basename(filepath);
  const m = /^[a-z]*([A-Z]).*/.exec(filename);
  if (!m) {
    throw new Error(
      `The filename does not contain an instrument letter: ${filename}`
    );
  }
  switch (m[1]) {
    case "R":
    case "H":
      return additionalHrsFiles(filepath);
    default:
      return new Set();
  }
}

function additionalHrsFiles(filepath: string): Set<AdditionalFile> {
  const filename = basename(filepath);
  const parentDir = dirname(dirname(filepath));
  const m = /^[a-z]*([RH].*)\.fits$/.exec(filename);
  if (!m) {
    throw new Error(`Could not parse filename: ${filename}`);
  }
  const additional = sync(`${parentDir}/MID_red/m*${m[1]}_*.fits`);
  return new Set(
    additional.map(f => ({
      filepath: f,
      description: "MIDAS reduction file"
    }))
  );
}

async function didUserMakeDataRequest(
  user: User,
  dataRequestId: string
): Promise<boolean> {
  const sql = `SELECT data_request_id
                FROM admin.data_request
                WHERE data_request_id=$1 and ssda_user_id=$2`;
  const res = await ssdaPool.query(sql, [dataRequestId, user.id]);
  return res.rowCount > 0;
}
