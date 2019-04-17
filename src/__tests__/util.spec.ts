import { groupDataFileByPart } from "../util";

describe("groupDataFiles", () => {
  it("should group by observation id", () => {
    const df = [
      { id: "123a", observation: { id: "1234" } },
      { id: "123b", observation: { id: "1235" } },
      { id: "123c", observation: { id: "1234" } },
      { id: "123d", observation: { id: "1233" } },
      { id: "123e", observation: { id: "1234" } }
    ];
    expect(groupDataFileByPart(df)).toEqual({
      "1233": ["123d"],
      "1234": ["123a", "123c", "123e"],
      "1235": ["123b"]
    });
  });
  it("should group files in one observation if obs id don't exist", () => {
    const df = [
      { id: "123a", observation: { id: "1234" } },
      { id: "123b", observation: { id: "1235" } },
      { id: "123c", observation: { id: "1234" } },
      { id: "123d", observation: { id: "1233" } },
      { id: "123e", observation: {} },
      { id: "123f", observation: undefined }
    ];
    expect(groupDataFileByPart(df)).toEqual({
      "1233": ["123d"],
      "1234": ["123a", "123c"],
      "1235": ["123b"],
      unknownObs: ["123e", "123f"]
    });
  });
});
