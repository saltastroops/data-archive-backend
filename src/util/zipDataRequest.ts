import archiver from "archiver";
import fs from "fs";
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
  const sql = `SELECT (paths).raw,
                      (paths).reduced,  
                      product_type AS type,
                      proposal_code AS proposal_code,
                      observation_group_id AS block_id,
                      ins.name AS instrument_name, 
                      calibration_level,
                      night AS date 
              FROM admin.data_request dr
              LEFT OUTER JOIN admin.data_request_artifact dra on dra.data_request_id = dr.data_request_id
              LEFT OUTER JOIN observations.artifact atf on atf.artifact_id = dra.artifact_id
              LEFT OUTER JOIN admin.data_request_calibration_level drl on drl.data_request_id = dr.data_request_id
              LEFT OUTER JOIN observations.plane p ON p.plane_id = atf.plane_id
              LEFT OUTER JOIN observations.observation_time obs_time ON obs_time.plane_id = p.plane_id    
              LEFT OUTER JOIN observations.observation obs ON p.observation_id = obs.observation_id
              LEFT OUTER JOIN observations.product_type pt ON atf.product_type_id = pt.product_type_id
              LEFT OUTER JOIN observations.proposal obsp ON obs.proposal_id = obsp.proposal_id
              LEFT OUTER JOIN observations.instrument ins on obs.instrument_id = ins.instrument_id
              WHERE dra.artifact_id = ANY($1)
  `;
  const res = await ssdaPool.query(sql, [fileIds]);
  const dataFiles = res.rows;
  // tslint:disable-next-line:no-console
  console.log(dataFiles);

  //   // zip files
  //   if (!process.env.DATA_REQUEST_BASE_DIR) {
  //     throw new Error("The DATA_REQUEST_BASE_DIR has not been set.");
  //   }
  //   const output = fs.createWriteStream(
  //     `${process.env.DATA_REQUEST_BASE_DIR}/${dataRequestId.toString()}.zip`
  //   );
  //   const archive = archiver("zip", {
  //     gzip: true,
  //     zlib: { level: 9 } // Sets the compression level.
  //   });
  //   let hasError = false;
  //   // case archive raise a warning
  //   archive.on("warning", async (err: any) => {
  //     if (err.code === "ENOENT") {
  //       // Update data request table with fail
  //       await failToZipDataRequest(dataRequestId);
  //       // Record that there has been a problem
  //       hasError = true;
  //     } else {
  //       // Update data request table with fail
  //       await failToZipDataRequest(dataRequestId);
  //       // Record that there has been a problem
  //       hasError = true;
  //     }
  //   });
  //
  //   // If ever there is an error raise it
  //   archive.on("error", async (err: any) => {
  //     // Update data request table with fail
  //     await failToZipDataRequest(dataRequestId);
  //     hasError = true;
  //   });
  //
  //   // when archive successfully run
  //   output.on("finish", async () => {
  //     // Update data request table with success (but only if there hasn't been an
  //     // error!)
  //     if (!hasError) {
  //       await successfullyZipDataRequest(dataRequestId);
  //     }
  //   });
  //
  //   // pipe archive data to the output file
  //   archive.pipe(output);
  //
  //   // Get the maximum length of the name and type strings
  //   const nameStrLength = Math.max(
  //     ...dataFiles.map((file: { name: string }) => file.name.length)
  //   );
  //   const typeStrLength = Math.max(
  //     ...dataFiles.map((file: { type: string }) => file.type.length)
  //   );
  //
  //   // Table row separator
  //   const rowBorder = `
  // +-${"-".repeat(nameStrLength)}-+-${"-".repeat(typeStrLength)}-+`;
  //
  //   // Table content of the table header
  //   const tableHeaderContent = `
  // | File name${" ".repeat(nameStrLength - "File name".length)} | Type${" ".repeat(
  //     typeStrLength - "Type".length
  //   )} |`;
  //
  //   // The header of the table
  //   const tableHeader = rowBorder + tableHeaderContent + rowBorder;
  //
  //   // The body of the table
  //   let tableBody = ``;
  //   dataFiles.forEach((file: { name: string; type: string }) => {
  //     // The content of the table body
  //     const tableBodyContent = `
  // | ${file.name}${" ".repeat(nameStrLength - file.name.length)} | ${
  //       file.type
  //     }${" ".repeat(typeStrLength - file.type.length)} |\r`;
  //     tableBody = tableBody + tableBodyContent + rowBorder;
  //   });
  //
  //   // The title of the table
  //   const tableTitle = `The requested files\r\n===================\r\n`;
  //
  //   // The table containing the data request file names and type of the product data contained by the file
  //   const table = tableHeader + tableBody + `\r\n`;
  //
  //   // The SALT policy
  //   const policy = `
  // Publication and acknowledgment policy
  // =====================================
  //
  // Publications
  // ------------
  // Please notify salthelp@salt.ac.za of any publication made using SALT data including
  // reviewed papers and conference proceedings.
  //
  // Science paper acknowledgements
  // ------------------------------
  // All science papers that include SALT data which are submitted for publication in refereed
  // science journals must include the following words of acknowledgment:
  //
  // “All/some [choose which is appropriate] of the observations reported in this paper
  // were obtained with the Southern African Large Telescope (SALT) under program(s)
  // [insert Proposal Code(s)].”
  //
  // We recommend that the Principle Investigator is also mentioned after the Proposal Code. In
  // addition, for papers which predominantly based on SALT data, a footnote symbol should
  // appear after the paper title*, and the following text should be written as a footnote:
  //
  // *based on observations made with the Southern African Large Telescope (SALT)"
  //
  // If possible, please also include the Proposal Code and Principle Investigator in body of the
  // paper when describing observations.
  //
  // If you use data reduced by the SALT science pipeline or use the PySALT software, please
  // provide a link to http://pysalt.salt.ac.za/ and cite the following paper:
  //
  // Crawford, S.M., Still, M., Schellart, P., Balona, L., Buckley, D.A.H., Gulbis, A.A.S., Kniazev,
  // A., Kotze, M., Loaring, N., Nordsieck, K.H., Pickering, T.E., Potter, S., Romero Colmenero,
  // E., Vaisanen, P., Williams, T., Zietsman, E., 2010. PySALT: the SALT Science Pipeline.
  // SPIE Astronomical Instrumentation, 7737-82\r\n\n`;
  //
  //   // A read me file content
  //   const readMeFileContent = tableTitle + table + policy;
  //
  //   // append a file from string
  //   archive.append(readMeFileContent, { name: "README.txt" });
  //   const rawRequested = requestedCalibrationLevels.has("RAW");
  //   const reducedRequested = requestedCalibrationLevels.has("REDUCED");
  //   // save files
  //   dataFiles.forEach((file: { reduced: string; raw: string; name: string }) => {
  //     if (rawRequested) {
  //       archive.file(`${process.env.FITS_BASE_DIR}/${file.raw}`, {
  //         name: file.name
  //       });
  //     }
  //     if (reducedRequested) {
  //       archive.file(`${process.env.FITS_BASE_DIR}/${file.reduced}`, {
  //         name: file.name
  //       });
  //     }
  //   });
  //
  //   await archive.finalize();
};
