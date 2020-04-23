import { DatabaseModel } from "./DatabaseModel";

/* tslint:disable:variable-name */

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

const detector_mode = {
  join: "instrument_setup.detector_mode_id=detector_mode.detector_mode_id",
  name: "detector_mode",
  rightOf: new Set(["instrument_setup"])
};

const energy = {
  join: "plane.plane_id=energy.plane_id",
  name: "energy",
  rightOf: new Set(["plane"])
};

const filter = {
  join: "instrument_setup.filter_id=filter.filter_id",
  name: "filter",
  rightOf: new Set(["instrument_setup"])
};

const hrs_mode = {
  join: "hrs_setup.hrs_mode_id=hrs_mode.hrs_mode_id",
  name: "hrs_mode",
  rightOf: new Set(["hrs_setup"])
};

const hrs_setup = {
  join: "instrument_setup.instrument_setup_id=hrs_setup.instrument_setup_id",
  name: "hrs_setup",
  rightOf: new Set(["instrument_setup"])
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

const instrument_mode = {
  join:
    "instrument_setup.instrument_mode_id=instrument_mode.instrument_mode_id",
  name: "instrument_mode",
  rightOf: new Set(["instrument_setup"])
};

const instrument_setup = {
  join: "observation.observation_id=instrument_setup.observation_id",
  name: "instrument_setup",
  rightOf: new Set(["observation"])
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

const polarization_mode = {
  join:
    "polarization.polarization_mode_id=polarization_mode.polarization_mode_id",
  name: "polarization_mode",
  rightOf: new Set(["polarization"])
};

const position = {
  join: "plane.plane_id=position.plane_id",
  name: "position",
  rightOf: new Set(["plane"])
};

const product_category = {
  join: "product_type.product_category_id=product_category.product_category_id",
  name: "product_category",
  rightOf: new Set(["product_type"])
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

const proposal_type = {
  join: "proposal.proposal_type_id=proposal_type.proposal_type_id",
  name: "proposal_type",
  rightOf: new Set(["observation"])
};

const rss_fabry_perot_mode = {
  join:
    "rss_setup.rss_fabry_perot_mode_id=rss_fabry_perot_mode.rss_fabry_perot_mode_id",
  name: "rss_fabry_perot_mode",
  rightOf: new Set(["rss_setup"])
};

const rss_grating = {
  join: "rss_setup.rss_grating_id=rss_grating.rss_grating_id",
  name: "rss_grating",
  rightOf: new Set(["rss_setup"])
};

const rss_setup = {
  join: "instrument_setup.instrument_setup_id=rss_setup.instrument_setup_id",
  name: "rss_setup",
  rightOf: new Set(["instrument_setup"])
};

const status = {
  join: "observation.status_id=status.status_id",
  name: "status",
  rightOf: new Set(["observation"])
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
    detector_mode,
    energy,
    filter,
    hrs_mode,
    hrs_setup,
    institution,
    instrument,
    instrument_keyword,
    instrument_keyword_value,
    instrument_mode,
    instrument_setup,
    intent,
    observation,
    observation_group,
    observation_time,
    observation_type,
    plane,
    polarization,
    polarization_mode,
    position,
    product_category,
    product_type,
    proposal,
    proposal_type,
    rss_fabry_perot_mode,
    rss_grating,
    rss_setup,
    status,
    target,
    target_type,
    telescope
  ] as any)
);
