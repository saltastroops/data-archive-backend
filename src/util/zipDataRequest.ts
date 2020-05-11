import archiver from "archiver";
import fs from "fs";
import moment from "moment";
import { basename, join } from "path";
import { ssdaPool } from "../db/postgresql_pool";
import { CalibrationLevel } from "./calibrations";

const successfullyZipDataRequest = async (dataRequestId: string) => {
  // update data request with success status and download path
  const path = `${dataRequestId.toString()}.zip`;
  const sql = `
  WITH success_status (id) AS (
      SELECT data_request_status_id
      FROM admin.data_request_status
      WHERE status='Successful'
  )
  UPDATE admin.data_request
  SET data_request_status_id=(SELECT id FROM success_status),
      path=$1
  WHERE data_request_id=$2 
  `;
  await ssdaPool.query(sql, [path, dataRequestId]);

  // TODO send email to user when done.
};

const failToZipDataRequest = async (dataRequestId: string) => {
  // update data request with failure status
  const sql = `
  WITH failure_status (id) AS (
      SELECT data_request_status_id
      FROM admin.data_request_status
      WHERE status='Failed'
  )
  UPDATE admin.data_request
  SET data_request_status_id=(SELECT id FROM failure_status)
  WHERE data_request_id=$1
  `;
  await ssdaPool.query(sql, [dataRequestId]);

  // // delete file created by fs
  fs.unlink(
    `${process.env.DATA_REQUEST_BASE_DIR}/${dataRequestId.toString()}.zip`,
    err => {
      if (err) {
        // do nothing if file not created
      }
    }
  );
};

export const zipDataRequest = async (
  fileIds: string[],
  dataRequestId: string,
  requestedCalibrationLevels: Set<CalibrationLevel>
) => {
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

      const filename = basename(filepath);
      const fileDescription = description;

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
    }
  }
  // zip files
  if (!process.env.DATA_REQUEST_BASE_DIR) {
    throw new Error("The DATA_REQUEST_BASE_DIR has not been set.");
  }
  const output = fs.createWriteStream(
    `${process.env.DATA_REQUEST_BASE_DIR}/${dataRequestId.toString()}.zip`
  );
  const archive = archiver("zip", {
    gzip: true,
    zlib: { level: 9 } // Sets the compression level.
  });
  let hasError = false;
  // case archive raise a warning
  archive.on("warning", async (err: any) => {
    if (err.code === "ENOENT") {
      // Update data request table with fail
      await failToZipDataRequest(dataRequestId);
      // Record that there has been a problem
      hasError = true;
    } else {
      // Update data request table with fail
      await failToZipDataRequest(dataRequestId);
      // Record that there has been a problem
      hasError = true;
    }
  });

  // If ever there is an error raise it
  archive.on("error", async (err: any) => {
    // Update data request table with fail
    await failToZipDataRequest(dataRequestId);
    hasError = true;
  });

  // when archive successfully run
  output.on("finish", async () => {
    // Update data request table with success (but only if there hasn't been an
    // error!)
    if (!hasError) {
      await successfullyZipDataRequest(dataRequestId);
    }
  });

  // pipe archive data to the output file
  archive.pipe(output);

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
  const tableTitle = `The requested files\n===================\n`;

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

  // A read me file content
  const readMeFileContent = tableTitle + calibrationsMessage + table + policy;
  // append a file from string
  archive.append(readMeFileContent, { name: "README.txt" });
  // save files
  dataFiles.forEach((file: { filepath: string; filename: string }) => {
    if (process.env.FITS_BASE_DIR === undefined) {
      throw new Error("The environment variable FITS_BASE_DIR must be set.");
    }
    const filepath = join(process.env.FITS_BASE_DIR, file.filepath);
    archive.append(fs.createReadStream(filepath), {
      name: file.filename
    });
  });

  await archive.finalize();
};
