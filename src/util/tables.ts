import { DatabaseModel } from "./DatabaseModel";

/**
 * SSDA observation tables
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

const artifact = {
  join: "plane.plane_id=artifact.plane_id",
  name: "artifact",
  rightOf: new Set(["plane"])
};

const data_product_type = {
  join: "plane.data_product_type_id=data_product_type.data_product_type_id",
  name: "data_product_type",
  rightOf: new Set(["plane"])
};

const energy = {
  join: "plane.plane_id=energy.plane_id",
  name: "energy",
  rightOf: new Set(["plane"])
};

const institution = {
  join: "proposal.institution_id=institution.institution_id",
  name: "institution",
  rightOf: new Set(["proposal"])
};

const instrument = {
  join: "observation.instrument_id=instrument.instrument_id",
  name: "instrument",
  rightOf: new Set(["observation"])
};

const instrument_keyword = {
  join:
    "instrument_keyword_value.instrument_keyword_id=instrument_keyword.instrument_keyword_id",
  name: "instrument_keyword",
  rightOf: new Set(["instrument_keyword_value"])
};

const instrument_keyword_value = {
  join:
    "instrument.instrument_id=instrument_keyword_value.instrument_id AND instrument_keyword.instrument_keyword_id=instrument_keyword_id",
  name: "instrument_keyword_value",
  rightOf: new Set(["instrument"])
};

const intent = {
  join: "observation.intent_id=intent.intent_id",
  name: "intent",
  rightOf: new Set(["intent"])
};

const observation = {
  join: "",
  name: "observation",
  rightOf: new Set()
};

const observation_group = {
  join:
    "observation.observation_group_id=observation_group.observation_group_id",
  name: "observation_group",
  rightOf: new Set(["observation"])
};

const observation_time = {
  join: "plane.plane_id=observation_time.plane_id",
  name: "observation_time",
  rightOf: new Set(["plane"])
};

const observation_type = {
  join: "observation.observation_type_id=observation_type.observation_type_id",
  name: "observation_type",
  rightOf: new Set(["observation"])
};

const plane = {
  join: "observation.observation_id=plane.observation_id",
  name: "plane",
  rightOf: new Set(["observation"])
};

const polarization = {
  join: "plane.plane_id=polarization.plane_id",
  name: "polarization",
  rightOf: new Set(["plane"])
};

const position = {
  join: "plane.plane_id=position.plane_id",
  name: "position",
  rightOf: new Set(["position"])
};

const product_type = {
  join: "artifact.product_type_id=product_type.product_type_id",
  name: "product_type",
  rightOf: new Set(["artifact"])
};

const proposal = {
  join: "observation.proposal_id=proposal.proposal_id",
  name: "proposal",
  rightOf: new Set(["observation"])
};

const status = {
  join: "observation.status_id=status.status_id",
  name: "status",
  rightOf: new Set(["observation"])
};

const stokes_parameter = {
  join: "polarization.stokes_parameter_id=stokes_parameter.stokes_parameter_id",
  name: "stokes_parameter",
  rightOf: new Set(["polarization"])
};

const target = {
  join: "observation.observation_id=target.observation_id",
  name: "target",
  rightOf: new Set(["observation"])
};

const target_type = {
  join: "target.target_type_id=target_type.target_type_id",
  name: "target_type",
  rightOf: new Set(["target"])
};

const telescope = {
  join: "observation.telescope_id=telescope.telescope_id",
  name: "telescope",
  rightOf: new Set(["observation"])
};

export const dataModel = new DatabaseModel(
  new Set([
    artifact,
    data_product_type,
    energy,
    institution,
    instrument,
    instrument_keyword,
    instrument_keyword_value,
    intent,
    observation,
    observation_group,
    observation_time,
    observation_type,
    plane,
    polarization,
    position,
    product_type,
    proposal,
    status,
    stokes_parameter,
    target,
    target_type,
    telescope
  ])
);
