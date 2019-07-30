import archiver from "archiver";
import fs from "fs";
import { ssdaAdminPool, ssdaPool } from "../db/pool";

const successfullyZipDataRequest = async (dataRequestId: number) => {
  // get success status id
  const successStatusId = ((await ssdaAdminPool.query(
    `
    SELECT dataRequestStatusId FROM DataRequestStatus WHERE dataRequestStatus=?
    `,
    ["SUCCESSFUL"]
  )) as any)[0][0].dataRequestStatusId;

  // update SSDA Admin with success status
  await ssdaAdminPool.query(
    `
    UPDATE DataRequest 
    SET 
      dataRequestStatusId=?,
      uri=?
    WHERE dataRequestId=?
    `,
    [
      successStatusId,
      `${process.env.DATA_REQUEST_BASE_DIR}/${dataRequestId.toString()}.zip`,
      dataRequestId
    ]
  );

  // TODO send email to user when done.
};

const failToZipDataRequest = async (dataRequestId: number) => {
  // Get fail status id
  const failStatusId = ((await ssdaAdminPool.query(
    `
    SELECT dataRequestStatusId FROM DataRequestStatus WHERE dataRequestStatus=?
    `,
    ["FAILED"]
  )) as any)[0][0].dataRequestStatusId;
  // update SSDA Admin with fail
  await ssdaAdminPool.query(
    `
    UPDATE DataRequest 
    SET dataRequestStatusId=?
    WHERE dataRequestId=?
    `,
    [failStatusId, dataRequestId]
  );

  // delete file created by fs
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
  fileIds: number[],
  dataRequestId: number
) => {
  // collect the files
  const dataFilesPaths = ((await ssdaPool.query(
    `
  SELECT path, dataFileName as name FROM DataFile WHERE dataFileId IN (${fileIds.join(
    ","
  )})
  `,
    []
  )) as any)[0];

  // zip files
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
  dataFilesPaths.forEach((file: { path: string; name: string }) => {
    archive.file(`${process.env.FITS_BASE_DIR}/${file.path}`, {
      name: file.name
    });
  });
  //
  await archive.finalize();
};
