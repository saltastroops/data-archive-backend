import { DatabaseModel } from "./DatabaseModel";

/**
 *
 * SSDA tables
 * See tables.sql on data archive database code(different project) for full description of each
 *
 * @type:
 *      join: string;
 *          JOIN ON string. For table(s) on Set rightOf
 *      name: string;
 *          Table name
 *      rightOf: Set
 *          All tables that this table is right of
 */

const DataCategory = {
  join: "DataFile.dataCategoryId=DataCategory.dataCategoryId",
  name: "DataCategory",
  rightOf: new Set(["DataFile"])
};

const DataFile = {
  join: "",
  name: "DataFile",
  rightOf: new Set([])
};

const DataPreview = {
  join: "DataFile.dataPreviewId=DataPreview.dataPreviewId",
  name: "DataPreview",
  rightOf: new Set(["DataFile"])
};

const Institution = {
  join:
    "Proposal.instituteId=Institute.instituteId OR Telescope.instituteId=Institute.instituteId",
  name: "Institution",
  rightOf: new Set(["Telescope", "Proposal"])
};

const Instrument = {
  join: "`Instrument`.`instrumentId`=`DataFile`.`instrumentId`",
  name: "Instrument",
  rightOf: new Set(["DataFile"])
};

const HRS = {
  join: "HRS.dataFileId=DataFile.dataFileId",
  name: "HRS",
  rightOf: new Set(["DataFile"])
};

const Observation = {
  join: "DataFile.observationId=Observation.observationId",
  name: "Observation",
  rightOf: new Set(["DataFile"])
};

const ObservationStatus = {
  join: "ObservationStatus.observationStatusId=Observation.observationStatusId",
  name: "ObservationStatus",
  rightOf: new Set(["Observation"])
};

const Proposal = {
  join: "Proposal.proposalId=Observation.proposalId",
  name: "Proposal",
  rightOf: new Set(["Observation"])
};

const ProposalInvestigator = {
  join: "",
  name: "ProposalInvestigator",
  rightOf: new Set(["Proposal"])
};

const RSS = {
  join: "RSS.dataFileId=DataFile.dataFileId",
  name: "RSS",
  rightOf: new Set(["DataFile"])
};

const RssFabryPerotMode = {
  join: "RssFabryPerotMode.rssFabryPerotModeId=RSS.rssFabryPerotModeId",
  name: "RssFabryPerotMode",
  rightOf: new Set(["RSS"])
};

const RssMode = {
  join: "RssMode.rssModeId=RSS.rssModeId",
  name: "RssMode",
  rightOf: new Set(["RSS"])
};

const Salticam = {
  join: "Salticam.dataFileId=DataFile.dataFileId",
  name: "Salticam",
  rightOf: new Set(["DataFile"])
};

const Target = {
  join: "`Target`.targetId=`DataFile`.targetId",
  name: "Target",
  rightOf: new Set(["DataFile"])
};

const TargetType = {
  join: "Target.targetTypeId=TargetType.targetTypeId",
  name: "TargetType",
  rightOf: new Set(["Target"])
};

const Telescope = {
  join: "Telescope.telescopeId=Observation.TelescopeId",
  name: "Telescope",
  rightOf: new Set(["Observation"])
};

export const dataModel = new DatabaseModel(
  new Set([
    DataCategory,
    DataFile,
    DataPreview,
    HRS,
    Institution,
    Instrument,
    Observation,
    ObservationStatus,
    Proposal,
    ProposalInvestigator,
    RSS,
    RssFabryPerotMode,
    RssMode,
    Salticam,
    Target,
    TargetType,
    Telescope
  ])
);
