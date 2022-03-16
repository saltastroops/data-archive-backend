import { additionalFiles } from "../util/zipDataRequest";
import { basename, join } from "path";

describe("additionalFiles", () => {
  it("should return the correct files for HRS (red)", () => {
    const expectedFiles = [
      "mbgphR202103080021_2wm.fits",
      "mbgphR202103080021_u2wm.fits",
      "mbgphR202103080021_u1wm.fits",
      "mbgphR202103080021_2we.fits",
      "mbgphR202103080021_1we.fits",
      "mbgphR202103080021_1w.fits",
      "mbgphR202103080021_uwm.fits",
      "mbgphR202103080021_u2w.fits",
      "mbgphR202103080021_2w.fits",
      "mbgphR202103080021_u1we.fits",
      "mbgphR202103080021_1wm.fits",
      "mbgphR202103080021_u1w.fits",
      "mbgphR202103080021_u2we.fits"
    ];

    const file = join(
      process.env.FITS_BASE_DIR || "",
      "/salt/data/2021/0308/hrs/product/mbgphR202103080021.fits"
    );

    const actualFiles = Array.from(additionalFiles(file));
    const actualFilenames = actualFiles.map(f => basename(f.filepath));
    expect(new Set(actualFilenames)).toEqual(new Set(expectedFiles));
    expect(actualFiles.every(f => f.description == "MIDAS reduction file"));
  });

  it("should return the correct files for HRS (blue)", () => {
    const expectedFiles = [
      "mbgphH202103080021_2wm.fits",
      "mbgphH202103080021_u2wm.fits",
      "mbgphH202103080021_u1wm.fits",
      "mbgphH202103080021_2we.fits",
      "mbgphH202103080021_1we.fits",
      "mbgphH202103080021_1w.fits",
      "mbgphH202103080021_uwm.fits",
      "mbgphH202103080021_u2w.fits",
      "mbgphH202103080021_2w.fits",
      "mbgphH202103080021_u1we.fits",
      "mbgphH202103080021_1wm.fits",
      "mbgphH202103080021_u1w.fits",
      "mbgphH202103080021_u2we.fits"
    ];

    const file = join(
      process.env.FITS_BASE_DIR || "",
      "/salt/data/2021/0308/hrs/product/mbgphH202103080021.fits"
    );

    const actualFiles = Array.from(additionalFiles(file));
    const actualFilenames = actualFiles.map(f => basename(f.filepath));
    expect(new Set(actualFilenames)).toEqual(new Set(expectedFiles));
    expect(actualFiles.every(f => f.description == "MIDAS reduction file"));
  });

  it("should return the correct files for RSS", () => {
    const expectedFiles = new Set<string>();

    const file = join(
      process.env.FITS_BASE_DIR || "",
      "/salt/data/2021/0308/rss/product/mbxgpP202103080040.fits"
    );
    const actualFiles = Array.from(additionalFiles(file));
    expect(new Set(actualFiles)).toEqual(new Set(expectedFiles));
  });

  it("should return the correct files for Salticam", () => {
    const expectedFiles = new Set<string>();

    const file = join(
      process.env.FITS_BASE_DIR || "",
      "/salt/data/2021/0308/scam/product/mbxgpS202103080008.fits"
    );
    const actualFiles = Array.from(additionalFiles(file));
    expect(new Set(actualFiles)).toEqual(new Set(expectedFiles));
  });
});
