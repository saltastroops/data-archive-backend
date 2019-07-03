import { DatabaseModel } from "../../util/DatabaseModel";
import {
  createFromExpression,
  parseWhereCondition
} from "../../util/observationsQuery";

function checkInvalidColumn(column: string) {
  const f = () => objectToSQL({ IS_NULL: { column } });
  expect(f).toThrowError("A.B");
}

function objectToSQL(condition: any) {
  return parseWhereCondition(JSON.stringify(condition)).sql;
}

function objectToValues(condition: any) {
  return parseWhereCondition(JSON.stringify(condition)).values;
}

function objectToColumns(condition: any) {
  return parseWhereCondition(JSON.stringify(condition)).columns;
}

describe("parseWhereCondition", () => {
  describe("column parsing", () => {
    it("should refuse an undefined column", () => {
      const f = () => objectToSQL({ IS_NULL: {} });
      expect(f).toThrowError("undefined");
    });

    it("should refuse a null column", () => {
      const f = () => objectToSQL({ IS_NULL: { column: null } });
      expect(f).toThrowError("null");
    });

    it("should refuse columns without a dot", () => {
      checkInvalidColumn("ProposalName");
    });

    it("should refuse columns with more than one dot", () => {
      checkInvalidColumn("Proposal.Given.Name");
    });

    it("should refuse columns with white space", () => {
      checkInvalidColumn(" Proposal.Name");
      checkInvalidColumn("Proposal .Name");
      checkInvalidColumn("Prop osal.Name");
      checkInvalidColumn("Proosal. Name");
      checkInvalidColumn("Proposal.Na me");
      checkInvalidColumn("Proposal.Name ");
    });

    it("should refuse column names with invalid characters", () => {
      checkInvalidColumn("`Proposal.Name");
      checkInvalidColumn("Prop;osal.Name");
    });

    it("should refuse table names with invalid characters", () => {
      checkInvalidColumn("Proposal.Name`");
      checkInvalidColumn("Proposal.Nam;e");
    });
  });

  describe("value parsing", () => {
    it("should not change numbers", () => {
      const values = objectToValues({
        EQUALS: { column: "A.B", value: 15.34 }
      });
      expect(values).toHaveLength(1);
      expect(values[0]).toBeCloseTo(15.34);
    });

    it("should not change strings", () => {
      expect(objectToValues({ EQUALS: { column: "A.B", value: "V" } })).toEqual(
        ["V"]
      );
    });

    it("should convert true to 1", () => {
      const values = objectToValues({ EQUALS: { column: "A.B", value: true } });
      expect(values).toHaveLength(1);
      expect(values[0]).toBeCloseTo(1);
    });

    it("should convert false to 0", () => {
      const values = objectToValues({
        EQUALS: { column: "A.B", value: false }
      });
      expect(values).toHaveLength(1);
      expect(values[0]).toBeCloseTo(0);
    });
  });

  describe("column collection", () => {
    it("should collect the columns used", () => {
      const condition = {
        AND: [
          {
            OR: [
              { IS_NULL: { column: "Proposal.Title" } },
              {
                AND: [
                  { EQUALS: { column: "RSS.Filter", value: "pc07000" } },
                  {
                    OR: [
                      {
                        LESS_THAN: {
                          column: "Observation.StartTime",
                          value: "2019-05-01"
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            WITHIN_RADIUS: {
              declination: -14,
              declinationColumn: "Target.Dec",
              radius: 0.7,
              rightAscension: 98,
              rightAscensionColumn: "Target.RA"
            }
          },
          { GREATER_THAN: { column: "RSS.Filter", value: "pc05400" } }
        ]
      };
      expect(objectToColumns(condition)).toEqual(
        new Set<string>([
          "Proposal.Title",
          "RSS.Filter",
          "Observation.StartTime",
          "Target.Dec",
          "Target.RA"
        ])
      );
    });
  });

  describe("AND", () => {
    it("should generate the correct SQL for a single condition", () => {
      const condition = { EQUALS: { column: "A.B", value: "A" } };
      const and = { AND: [condition] };
      expect(objectToSQL(and)).toEqual("(" + objectToSQL(condition) + ")");
      expect(objectToValues(and)).toEqual(["A"]);
    });

    it("should generate the correct SQL for two conditions", () => {
      const condition1 = { EQUALS: { column: "A.B", value: "A" } };
      const condition2 = { EQUALS: { column: "C.D", value: "C" } };
      const and = { AND: [condition1, condition2] };
      expect(objectToSQL(and)).toEqual(
        "(" + objectToSQL(condition1) + " AND " + objectToSQL(condition2) + ")"
      );
      expect(objectToValues(and)).toEqual(["A", "C"]);
    });

    it("should generate the correct SQL for three conditions", () => {
      const condition1 = { EQUALS: { column: "A.B", value: "A" } };
      const condition2 = { EQUALS: { column: "C.D", value: "C" } };
      const condition3 = { IS_NULL: { column: "E.F" } };
      const and = { AND: [condition1, condition2, condition3] };
      expect(objectToSQL(and)).toEqual(
        "(" +
          objectToSQL(condition1) +
          " AND " +
          objectToSQL(condition2) +
          " AND " +
          objectToSQL(condition3) +
          ")"
      );
      expect(objectToValues(and)).toEqual(["A", "C"]);
    });

    it("should collect the columns", () => {
      const condition1 = { EQUALS: { column: "A.B", value: "A" } };
      const condition2 = { EQUALS: { column: "C.D", value: "C" } };
      const condition3 = { IS_NULL: { column: "E.F" } };
      const and = { AND: [condition1, condition2, condition3] };
      expect(objectToColumns(and)).toEqual(
        new Set<string>(["A.B", "C.D", "E.F"])
      );
    });
  });

  describe("OR", () => {
    it("should generate the correct SQL for a single condition", () => {
      const condition = { EQUALS: { column: "A.B", value: "A" } };
      const or = { OR: [condition] };
      expect(objectToSQL(or)).toEqual("(" + objectToSQL(condition) + ")");
      expect(objectToValues(or)).toEqual(["A"]);
    });

    it("should generate the correct SQL for two conditions", () => {
      const condition1 = { EQUALS: { column: "A.B", value: "A" } };
      const condition2 = { EQUALS: { column: "C.D", value: "C" } };
      const or = { OR: [condition1, condition2] };
      expect(objectToSQL(or)).toEqual(
        "(" + objectToSQL(condition1) + " OR " + objectToSQL(condition2) + ")"
      );
      expect(objectToValues(or)).toEqual(["A", "C"]);
    });

    it("should generate the correct SQL for three conditions", () => {
      const condition1 = { EQUALS: { column: "A.B", value: "A" } };
      const condition2 = { EQUALS: { column: "C.D", value: "C" } };
      const condition3 = { IS_NULL: { column: "E.F" } };
      const or = { OR: [condition1, condition2, condition3] };
      expect(objectToSQL(or)).toEqual(
        "(" +
          objectToSQL(condition1) +
          " OR " +
          objectToSQL(condition2) +
          " OR " +
          objectToSQL(condition3) +
          ")"
      );
      expect(objectToValues(or)).toEqual(["A", "C"]);
    });

    it("should collect the columns", () => {
      const condition1 = { EQUALS: { column: "A.B", value: "A" } };
      const condition2 = { EQUALS: { column: "C.D", value: "C" } };
      const condition3 = { IS_NULL: { column: "E.F" } };
      const or = { OR: [condition1, condition2, condition3] };
      expect(objectToColumns(or)).toEqual(
        new Set<string>(["A.B", "C.D", "E.F"])
      );
    });
  });

  describe("NOT", () => {
    it("should generate the correct SQL", () => {
      const condition = { LESS_THAN: { column: "A.B", value: "U" } };
      const not = { NOT: condition };
      expect(objectToSQL(not)).toEqual("NOT(" + objectToSQL(condition) + ")");
      expect(objectToValues(not)).toEqual(["U"]);
    });

    it("should collect the columns", () => {
      expect(
        objectToColumns({ NOT: { EQUALS: { column: "A.B", value: 14 } } })
      ).toEqual(new Set<string>(["A.B"]));
    });
  });

  describe("IS_NULL", () => {
    it("should fail for a missing column", () => {
      const f = () => objectToSQL({ IS_NULL: {} });
      expect(f).toThrow("undefined");
    });

    it("should fail for an invalid column", () => {
      const f = () => objectToSQL({ IS_NULL: { column: "Proposal" } });
      expect(f).toThrow("A.B");
    });

    it("should generate the correct SQL", () => {
      const isNull = { IS_NULL: { column: "A.B" } };
      expect(objectToSQL(isNull)).toEqual("(A.B IS NULL)");
      expect(objectToValues(isNull)).toEqual([]);
    });

    it("should collect the columns", () => {
      expect(objectToColumns({ IS_NULL: { column: "A.B" } })).toEqual(
        new Set<string>(["A.B"])
      );
    });
  });

  describe("EQUALS", () => {
    it("should fail for a missing column", () => {
      const f = () => objectToSQL({ EQUALS: { value: 17 } });
      expect(f).toThrow("undefined");
    });

    it("should fail for an invalid column", () => {
      const f = () =>
        objectToSQL({ EQUALS: { column: "Proposal", value: 17 } });
      expect(f).toThrow("A.B");
    });

    it("should fail for a missing value", () => {
      const f = () => objectToSQL({ EQUALS: { column: "A.B" } });
      expect(f).toThrow("undefined");
    });

    it("should generate the correct SQL", () => {
      const equals = { EQUALS: { column: "A.B", value: "Simbad" } };
      expect(objectToSQL(equals)).toEqual("(A.B = ?)");
      expect(objectToValues(equals)).toEqual(["Simbad"]);
    });

    it("should collect the columns", () => {
      expect(objectToColumns({ EQUALS: { column: "A.B", value: 14 } })).toEqual(
        new Set<string>(["A.B"])
      );
    });
  });

  describe("LESS_THAN", () => {
    it("should fail for a missing column", () => {
      const f = () => objectToSQL({ LESS_THAN: { value: 17 } });
      expect(f).toThrow("undefined");
    });

    it("should fail for an invalid column", () => {
      const f = () =>
        objectToSQL({ LESS_THAN: { column: "Proposal", value: 17 } });
      expect(f).toThrow("A.B");
    });

    it("should fail for a missing value", () => {
      const f = () => objectToSQL({ LESS_THAN: { column: "A.B" } });
      expect(f).toThrow("undefined");
    });

    it("should generate the correct SQL", () => {
      const lessThan = { LESS_THAN: { column: "A.B", value: "Doe" } };
      expect(objectToSQL(lessThan)).toEqual("(A.B < ?)");
      expect(objectToValues(lessThan)).toEqual(["Doe"]);
    });

    it("should collect the columns", () => {
      expect(
        objectToColumns({ LESS_THAN: { column: "A.B", value: 14 } })
      ).toEqual(new Set<string>(["A.B"]));
    });
  });

  describe("GREATER_THAN", () => {
    it("should fail for a missing column", () => {
      const f = () => objectToSQL({ GREATER_THAN: { value: 17 } });
      expect(f).toThrow("undefined");
    });

    it("should fail for an invalid column", () => {
      const f = () =>
        objectToSQL({ GREATER_THAN: { column: "Proposal", value: 17 } });
      expect(f).toThrow("A.B");
    });

    it("should fail for a missing value", () => {
      const f = () => objectToSQL({ GREATER_THAN: { column: "A.B" } });
      expect(f).toThrow("undefined");
    });

    it("should generate the correct SQL", () => {
      const greaterThan = { GREATER_THAN: { column: "A.B", value: "Doe" } };
      expect(objectToSQL(greaterThan)).toEqual("(A.B > ?)");
      expect(objectToValues(greaterThan)).toEqual(["Doe"]);
    });

    it("should collect the columns", () => {
      expect(
        objectToColumns({ GREATER_THAN: { column: "A.B", value: 14 } })
      ).toEqual(new Set<string>(["A.B"]));
    });
  });

  describe("LESS_EQUAL", () => {
    it("should fail for a missing column", () => {
      const f = () => objectToSQL({ LESS_EQUAL: { value: 17 } });
      expect(f).toThrow("undefined");
    });

    it("should fail for an invalid column", () => {
      const f = () =>
        objectToSQL({ LESS_EQUAL: { column: "Proposal", value: 17 } });
      expect(f).toThrow("A.B");
    });

    it("should fail for a missing value", () => {
      const f = () => objectToSQL({ LESS_EQUAL: { column: "A.B" } });
      expect(f).toThrow("undefined");
    });

    it("should generate the correct SQL", () => {
      const lessEqual = { LESS_EQUAL: { column: "A.B", value: "Doe" } };
      expect(objectToSQL(lessEqual)).toEqual("(A.B <= ?)");
      expect(objectToValues(lessEqual)).toEqual(["Doe"]);
    });

    it("should collect the columns", () => {
      expect(
        objectToColumns({ LESS_EQUAL: { column: "A.B", value: 14 } })
      ).toEqual(new Set<string>(["A.B"]));
    });
  });

  describe("GREATER_EQUAL", () => {
    it("should fail for a missing column", () => {
      const f = () => objectToSQL({ GREATER_EQUAL: { value: 17 } });
      expect(f).toThrow("undefined");
    });

    it("should fail for an invalid column", () => {
      const f = () =>
        objectToSQL({ GREATER_EQUAL: { column: "Proposal", value: 17 } });
      expect(f).toThrow("A.B");
    });

    it("should fail for a missing value", () => {
      const f = () => objectToSQL({ GREATER_EQUAL: { column: "A.B" } });
      expect(f).toThrow("undefined");
    });

    it("should generate the correct SQL", () => {
      const greaterEqual = { GREATER_EQUAL: { column: "A.B", value: "Doe" } };
      expect(objectToSQL(greaterEqual)).toEqual("(A.B >= ?)");
      expect(objectToValues(greaterEqual)).toEqual(["Doe"]);
    });

    it("should collect the columns", () => {
      expect(
        objectToColumns({ GREATER_EQUAL: { column: "A.B", value: 14 } })
      ).toEqual(new Set<string>(["A.B"]));
    });
  });

  describe("CONTAINS", () => {
    it("should fail for a missing column", () => {
      const f = () => objectToSQL({ CONTAINS: { value: "SCI-024" } });
      expect(f).toThrow("undefined");
    });

    it("should fail for an invalid column", () => {
      const f = () =>
        objectToSQL({ CONTAINS: { column: "Proposal", value: "SCI-024" } });
      expect(f).toThrow("A.B");
    });

    it("should fail for a missing value", () => {
      const f = () => objectToSQL({ CONTAINS: { column: "A.B" } });
      expect(f).toThrow("undefined");
    });

    it("should generate the correct SQL", () => {
      const contains = { CONTAINS: { column: "A.B", value: "SCI-024" } };
      expect(objectToSQL(contains)).toEqual("(A.B LIKE ?)");
      expect(objectToValues(contains)).toEqual(["SCI-024"]);
    });

    it("should collect the columns", () => {
      expect(
        objectToColumns({ CONTAINS: { column: "A.B", value: "AGN" } })
      ).toEqual(new Set<string>(["A.B"]));
    });
  });

  describe("WITHIN_RADIUS", () => {
    const withinRadius = (
      rightAscension: number = 114.7,
      declination: number = -43.9,
      radius = 0.00005
    ) => ({
      WITHIN_RADIUS: {
        declination,
        declinationColumn: "Target.Dec",
        radius,
        rightAscension,
        rightAscensionColumn: "Target.RA"
      }
    });

    it("should fail for a missing right ascension column", () => {
      const wr = withinRadius();
      delete wr.WITHIN_RADIUS.rightAscensionColumn;
      const f = () => objectToSQL(wr);
      expect(f).toThrowError("undefined");
    });

    it("should fail for an invalid right ascension column", () => {
      const wr = withinRadius();
      wr.WITHIN_RADIUS.rightAscensionColumn = "RA";
      const f = () => objectToSQL(wr);
      expect(f).toThrowError("A.B");
    });

    it("should fail for a missing declination column", () => {
      const wr = withinRadius();
      delete wr.WITHIN_RADIUS.declinationColumn;
      const f = () => objectToSQL(wr);
      expect(f).toThrowError("undefined");
    });

    it("should fail for an invalid declination column", () => {
      const wr = withinRadius();
      wr.WITHIN_RADIUS.declinationColumn = "Dec";
      const f = () => objectToSQL(wr);
      expect(f).toThrowError("A.B");
    });

    it("should fail for a missing right ascension", () => {
      const wr = withinRadius();
      delete wr.WITHIN_RADIUS.rightAscension;
      const f = () => objectToSQL(wr);
      expect(f).toThrowError("undefined");
    });

    it("should fail for a right ascension which is no number", () => {
      const wr = withinRadius("45.9" as any, 4, 0.3);
      const f = () => objectToSQL(wr);
      expect(f).toThrowError("number");
    });

    it("should fail for a right ascension outside the interval [0, 360]", () => {
      const f = () => objectToSQL(withinRadius(-0.1));
      expect(f).toThrowError("between 0 and 360");

      const g = () => objectToSQL(withinRadius(360.1));
      expect(g).toThrowError("between 0 and 360");
    });

    it("should fail for a missing declination", () => {
      const wr = withinRadius();
      delete wr.WITHIN_RADIUS.declination;
      const f = () => objectToSQL(wr);
      expect(f).toThrowError("undefined");
    });

    it("should fail for a declination which is no number", () => {
      const wr = withinRadius(45.9, "-45.9" as any, 0.3);
      const f = () => objectToSQL(wr);
      expect(f).toThrowError("number");
    });

    it("should fail for a declination outside the interval [-90, 90]", () => {
      const f = () => objectToSQL(withinRadius(25, -90.1));
      expect(f).toThrowError("between -90 and 90");

      const g = () => objectToSQL(withinRadius(25, 90.1));
      expect(g).toThrowError("between -90 and 90");
    });

    it("should fail for a missing radius", () => {
      const wr = withinRadius();
      delete wr.WITHIN_RADIUS.radius;
      const f = () => objectToSQL(wr);
      expect(f).toThrowError("undefined");
    });

    it("should fail for a radius which is no number", () => {
      const wr = withinRadius(45.9, 4, "0.3" as any);
      const f = () => objectToSQL(wr);
      expect(f).toThrowError("number");
    });

    it("should fail for a non-positive radius or a radius greater than 1 degree", () => {
      const f = () => objectToSQL(withinRadius(46, -17, -0.1));
      expect(f).toThrowError("positive");

      const g = () => objectToSQL(withinRadius(46, -17, 0));
      expect(g).toThrowError("positive");

      const h = () => objectToSQL(withinRadius(46, -17, 1.1));
      expect(h).toThrowError("not greater than 1");
    });

    it("should generate the correct SQL close to a right ascension of 0", () => {
      const declination = (Math.acos(0.25) * 180) / Math.PI - 2 * 0.5;
      const wr = withinRadius(0.1, declination, 0.5);
      expect(objectToSQL(wr)).toEqual(
        "((((`Target.RA` BETWEEN 0 AND ?) OR (`Target.RA` BETWEEN ? AND 360)) AND (`Target.Dec` BETWEEN ? AND ?)) AND (ANGULAR_DISTANCE(`Target.Dec`, `Target.RA`, ?, ?) <= ?))"
      );
      const expected = [
        2.1,
        358.1,
        declination - 2 * 0.5,
        declination + 2 * 0.5,
        declination,
        0.1
      ];
      const values = objectToValues(wr);
      expect(values.length).toBe(expected.length);
      values.forEach((v: any, i: number) =>
        expect(values[i]).toBeCloseTo(expected[i])
      );
    });

    it("should generate the correct SQL close to a right ascension of 360", () => {
      const declination = (Math.acos(0.25) * 180) / Math.PI - 2 * 0.5;
      const wr = withinRadius(359.9, declination, 0.5);
      expect(objectToSQL(wr)).toEqual(
        "((((`Target.RA` BETWEEN 0 AND ?) OR (`Target.RA` BETWEEN ? AND 360)) AND (`Target.Dec` BETWEEN ? AND ?)) AND (ANGULAR_DISTANCE(`Target.Dec`, `Target.RA`, ?, ?) <= ?))"
      );
      const expected = [
        1.9,
        357.9,
        declination - 2 * 0.5,
        declination + 2 * 0.5,
        declination,
        359.9
      ];
      const values = objectToValues(wr);
      expect(values.length).toBe(expected.length);
      values.forEach((v: any, i: number) =>
        expect(values[i]).toBeCloseTo(expected[i])
      );
    });

    it("should generate the correct SQL close to the celestial south pole", () => {
      const wr = withinRadius(12.9, -89.9, 0.5);
      expect(objectToSQL(wr)).toEqual(
        "((`Target.Dec` BETWEEN ? AND ?) AND (ANGULAR_DISTANCE(`Target.Dec`, `Target.RA`, ?, ?) <= ?))"
      );
      const expected = [-90, -88.9, -89.9, 12.9];
      const values = objectToValues(wr);
      expect(values.length).toBe(expected.length);
      values.forEach((v: any, i: number) =>
        expect(values[i]).toBeCloseTo(expected[i])
      );
    });

    it("should generate the correct SQL close to the celestial north pole", () => {
      const wr = withinRadius(12.9, 89.9, 0.5);
      expect(objectToSQL(wr)).toEqual(
        "((`Target.Dec` BETWEEN ? AND ?) AND (ANGULAR_DISTANCE(`Target.Dec`, `Target.RA`, ?, ?) <= ?))"
      );
      const expected = [88.9, 90, 89.9, 12.9];
      const values = objectToValues(wr);
      expect(values.length).toBe(expected.length);
      values.forEach((v: any, i: number) =>
        expect(values[i]).toBeCloseTo(expected[i])
      );
    });

    it("should collect the columns", () => {
      expect(objectToColumns(withinRadius())).toEqual(
        new Set<string>(["Target.Dec", "Target.RA"])
      );
    });
  });
});

describe("createFromExpression", () => {
  it("should raise an error if no table is passed", () => {
    const a = { join: "", name: "A", rightOf: new Set<string>() };
    const dm = new DatabaseModel(new Set([a]));

    const f = () => createFromExpression(new Set(), dm);
    expect(f).toThrowError("at least one");
  });

  it("should raise an error if a non-existing table is passed", () => {
    const a = { join: "", name: "A", rightOf: new Set<string>() };
    const dm = new DatabaseModel(new Set([a]));

    const f = () => createFromExpression(new Set(["A", "NonExisting"]), dm);
    expect(f).toThrowError("does not exist");
  });

  it("should raise an error if there is more than one root dependency", () => {
    const a = { join: "", name: "A", rightOf: new Set<string>() };
    const x = { join: "", name: "X", rightOf: new Set<string>() };
    const dm = new DatabaseModel(new Set([a, x]));

    const f = () => createFromExpression(new Set(["A", "X"]), dm);
    expect(f).toThrowError("single root");
  });

  it("should create the FROM expression for a single table", () => {
    const a = { join: "", name: "A", rightOf: new Set<string>() };
    const dm = new DatabaseModel(new Set([a]));

    expect(createFromExpression(new Set(["A"]), dm)).toEqual("`A`");
  });

  it("should create the FROM expression for a linear dependency", () => {
    const a = { join: "", name: "A", rightOf: new Set<string>() };
    const b = {
      join: "A.b_id=B.id",
      name: "B",
      rightOf: new Set<string>(["A"])
    };
    const c = {
      join: "B.c_id=C.id",
      name: "C",
      rightOf: new Set<string>(["B"])
    };
    const dm = new DatabaseModel(new Set([a, b, c]));

    expect(createFromExpression(new Set(["A"]), dm)).toEqual("`A`");
    expect(createFromExpression(new Set(["A", "B"]), dm)).toEqual(
      "`A` LEFT JOIN `B` ON (A.b_id=B.id)"
    );
    expect(createFromExpression(new Set(["A", "B", "C"]), dm)).toEqual(
      "`A` LEFT JOIN `B` ON (A.b_id=B.id) LEFT JOIN `C` ON (B.c_id=C.id)"
    );

    // The order to which tables are passed to the set is irrelevant
    expect(createFromExpression(new Set(["B", "C", "A"]), dm)).toEqual(
      "`A` LEFT JOIN `B` ON (A.b_id=B.id) LEFT JOIN `C` ON (B.c_id=C.id)"
    );
    expect(createFromExpression(new Set(["C", "A", "B"]), dm)).toEqual(
      "`A` LEFT JOIN `B` ON (A.b_id=B.id) LEFT JOIN `C` ON (B.c_id=C.id)"
    );
    expect(createFromExpression(new Set(["A", "C", "B"]), dm)).toEqual(
      "`A` LEFT JOIN `B` ON (A.b_id=B.id) LEFT JOIN `C` ON (B.c_id=C.id)"
    );
    expect(createFromExpression(new Set(["B", "A", "C"]), dm)).toEqual(
      "`A` LEFT JOIN `B` ON (A.b_id=B.id) LEFT JOIN `C` ON (B.c_id=C.id)"
    );
    expect(createFromExpression(new Set(["C", "B", "A"]), dm)).toEqual(
      "`A` LEFT JOIN `B` ON (A.b_id=B.id) LEFT JOIN `C` ON (B.c_id=C.id)"
    );
  });

  it("should create the FROM expression for a more complex table structure", () => {
    /*
    The following dependency structure is tested.

    A --- B --- +
    |           |
    + --- C --- + --- D --- + --- F
    |                       |
    + --- E --------------- +
    |
    + --- G

    X --- Y
     */
    const a = { join: "", name: "A", rightOf: new Set([]) };
    const b = { join: "A.b_id=B.id", name: "B", rightOf: new Set(["A"]) };
    const c = { join: "A.c_id=C.id", name: "C", rightOf: new Set(["A"]) };
    const d = {
      join: "B.d_id=D.id OR C.d_id=D.id",
      name: "D",
      rightOf: new Set(["B", "C"])
    };
    const e = { join: "A.e_id=E.id", name: "E", rightOf: new Set(["A"]) };
    const f = {
      join: "D.f_id=F.id OR E.f_id=F.id",
      name: "F",
      rightOf: new Set(["D", "E"])
    };
    const g = { join: "A.g_id=G.id", name: "G", rightOf: new Set(["A"]) };
    const x = { join: "", name: "X", rightOf: new Set([]) };
    const y = { join: "X.y_id=Y.id", name: "Y", rightOf: new Set(["X"]) };

    const dm = new DatabaseModel(new Set([a, b, c, d, e, f, g, x, y]));

    expect(createFromExpression(new Set(["A"]), dm)).toEqual("`A`");
    expect(createFromExpression(new Set(["B"]), dm)).toEqual(
      "`A` LEFT JOIN `B` ON (A.b_id=B.id)"
    );
    expect(createFromExpression(new Set(["A", "B"]), dm)).toEqual(
      "`A` LEFT JOIN `B` ON (A.b_id=B.id)"
    );

    const joins: any = {
      a: "`A`",
      b: "LEFT JOIN `B` ON (A.b_id=B.id)",
      c: "LEFT JOIN `C` ON (A.c_id=C.id)",
      d: "LEFT JOIN `D` ON (B.d_id=D.id OR C.d_id=D.id)",
      e: "LEFT JOIN `E` ON (A.e_id=E.id)",
      f: "LEFT JOIN `F` ON (D.f_id=F.id OR E.f_id=F.id)",
      g: "LEFT JOIN `G` ON (A.g_id=G.id)",
      x: "`X`",
      y: "LEFT JOIN `Y` ON (X.y_id=Y.id)"
    };

    const findIndexes = (from: string) =>
      Object.keys(joins).reduce(
        (indexes: any, key) => ({
          ...indexes,
          [key]: from.indexOf(joins[key])
        }),
        {}
      );

    (() => {
      const from = createFromExpression(new Set(["B", "D"]), dm);
      const indexes = findIndexes(from);

      expect(indexes.a).toBe(0);
      expect(indexes.b).toBeGreaterThan(indexes.a);
      expect(indexes.c).toBeGreaterThan(indexes.a);
      expect(indexes.d).toBeGreaterThan(indexes.b);
      expect(indexes.d).toBeGreaterThan(indexes.c);
      expect(indexes.e).toBe(-1);
      expect(indexes.f).toBe(-1);
      expect(indexes.g).toBe(-1);
      expect(indexes.x).toBe(-1);
      expect(indexes.y).toBe(-1);
    })();

    (() => {
      const from = createFromExpression(new Set(["F"]), dm);
      const indexes = findIndexes(from);

      expect(indexes.b).toBeGreaterThan(indexes.a);
      expect(indexes.c).toBeGreaterThan(indexes.a);
      expect(indexes.d).toBeGreaterThan(indexes.b);
      expect(indexes.d).toBeGreaterThan(indexes.c);
      expect(indexes.e).toBeGreaterThan(indexes.a);
      expect(indexes.f).toBeGreaterThan(indexes.d);
      expect(indexes.f).toBeGreaterThan(indexes.e);
      expect(indexes.g).toBe(-1);
      expect(indexes.x).toBe(-1);
      expect(indexes.y).toBe(-1);
    })();

    (() => {
      const from = createFromExpression(new Set(["G", "B", "F"]), dm);
      const indexes = findIndexes(from);

      expect(indexes.b).toBeGreaterThan(indexes.a);
      expect(indexes.c).toBeGreaterThan(indexes.a);
      expect(indexes.d).toBeGreaterThan(indexes.b);
      expect(indexes.d).toBeGreaterThan(indexes.c);
      expect(indexes.e).toBeGreaterThan(indexes.a);
      expect(indexes.f).toBeGreaterThan(indexes.d);
      expect(indexes.f).toBeGreaterThan(indexes.e);
      expect(indexes.g).toBeGreaterThan(indexes.a);
      expect(indexes.x).toBe(-1);
      expect(indexes.y).toBe(-1);
    })();
  });
});
