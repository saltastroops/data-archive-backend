import { DatabaseModel } from "./DatabaseModel";

const DataFile = {
  join: "",
  name: "DataFile",
  rightOf: new Set([])
};
const DataCategory = {
  join: "DataFile.dataCategoryId=DataCategory.dataCategoryId",
  name: "DataCategory",
  rightOf: new Set(["DataFile"])
};
const DataPreview = {
  join: "DataFile.dataPreviewId=DataPreview.dataPreviewId",
  name: "DataPreview",
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

const RSS = {
  join: "RSS.dataFileId=DataFile.dataFileId",
  name: "RSS",
  rightOf: new Set(["DataFile"])
};
const HRS = {
  join: "HRS.dataFileId=DataFile.dataFileId",
  name: "HRS",
  rightOf: new Set(["DataFile"])
};
const Salticam = {
  join: "Salticam.dataFileId=DataFile.dataFileId",
  name: "Salticam",
  rightOf: new Set(["DataFile"])
};
const Observation = {
  join: "DataFile.observationId=Observation.observationId", // TODO: how to join in multiple table using MYSQL using condition
  name: "Observation",
  rightOf: new Set(["DataFile"])
};
const ObservationStatus = {
  join: "ObservationStatus.observationStatusId=Observation.observationStatusId",
  name: "ObservationStatus",
  rightOf: new Set(["Observation"])
};
const Telescope = {
  join: "Telescope.telescopeId=Observation.TelescopeId",
  name: "Telescope",
  rightOf: new Set(["Observation"])
};
const Proposal = {
  join: "Proposal.proposalId=Observation.proposalId",
  name: "Proposal",
  rightOf: new Set(["Observation"])
};
const Institution = {
  join:
    "Proposal.instituteId=Institute.instituteId OR Telescope.instituteId=Institute.instituteId",
  name: "Institution",
  rightOf: new Set(["Telescope", "Proposal"])
};
const ProposalInvestigator = {
  join: "",
  name: "ProposalInvestigator",
  rightOf: new Set(["Proposal"])
};

//
// RSS                 => [DataFile]
// HRS                 => [DataFile]
// Salticam            => [DataFile]
// DataFile            => [DataCategory, Target, Observation]
// DataCategory        => []
// Target              => [TargetType]
// TargetType          => []
// Observation         => [ObservationStatus, Telescope, Proposal]
// Telescope           => [Institution]
// Proposal            => [Institution]
// ObservationStatus   => []
// Institution           => []
// ProposalInvestigator=> [Proposal]
export const dataModel = new DatabaseModel(
  new Set([
    RSS,
    HRS,
    Salticam,
    DataFile,
    DataCategory,
    DataPreview,
    Target,
    TargetType,
    Observation,
    Telescope,
    Proposal,
    ObservationStatus,
    Institution,
    ProposalInvestigator
  ])
);
// export const dataModel = new DatabaseModel(
//     new Set([
//         DataFile, HRS, DataCategory, Target, Observation, TargetType
//     ])
// );
