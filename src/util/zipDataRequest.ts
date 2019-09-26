import archiver from "archiver";
import fs from "fs";
import { ssdaPool } from "../db/postgresql_pool";

const successfullyZipDataRequest = async (dataRequestId: string) => {
  // update data request with success status and download path
  const path = `${
    process.env.DATA_REQUEST_BASE_DIR
  }/${dataRequestId.toString()}.zip`;
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
  dataRequestId: string
) => {
  // collect the files
  const sql = `SELECT path, name as name FROM observations.artifact WHERE artifact_id = ANY($1)`;
  const res = await ssdaPool.query(sql, [fileIds]);
  const dataFiles = res.rows;

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

  // case archive raise a warning
  archive.on("warning", async (err: any) => {
    if (err.code === "ENOENT") {
      // Update data request table with fail
      await failToZipDataRequest(dataRequestId);
    } else {
      // Update data request table with fail
      await failToZipDataRequest(dataRequestId);
      // throw error
      throw err;
    }
  });

  // If ever there is an error raise it
  archive.on("error", async (err: any) => {
    // Update data request table with fail
    await failToZipDataRequest(dataRequestId);
    throw err;
  });

  // when archive successfully run
  output.on("finish", async () => {
    // Update data request table with success
    await successfullyZipDataRequest(dataRequestId);
  });

  // pipe archive data to the output file
  archive.pipe(output);

  // save files
  dataFiles.forEach((file: { path: string; name: string }) => {
    archive.file(`${process.env.FITS_BASE_DIR}/${file.path}`, {
      name: file.name
    });
  });
  //
  await archive.finalize();
};
