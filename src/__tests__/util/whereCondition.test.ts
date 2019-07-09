import { prune } from "../../../../frontend/src/util/query/whereCondition";

describe("prune", () => {
  it("should reject conditions which are not an object", () => {
    const f = () => prune(17 as any);

    expect(f).toThrowError("must be an object");
  });

  it("should prune a where condition", () => {
    const condition = {
      AND: [
        { EQUALS: { column: "A.b", value: 56 } },
        { OR: [] },
        { EQUALS: { column: "C.d", value: -89 } }
      ]
    };
    const expected = {
      AND: [
        { EQUALS: { column: "A.b", value: 56 } },
        { EQUALS: { column: "C.d", value: -89 } }
      ]
    };

    expect(prune(condition)).toEqual(expected);
  });

  it("should prune a more complex where condition", () => {
    const condition = {
      OR: [
        { AND: [] },
        { GREATER_THAN: { column: "A.a", value: 88 } },
        {
          AND: [
            {
              OR: [
                {
                  AND: [
                    { EQUALS: { column: "B.b", value: "Test" } },
                    { AND: [{ AND: [] }, { OR: [] }] }
                  ]
                }
              ]
            },
            { AND: [{ EQUALS: { column: "C.c", value: "Another test" } }] }
          ]
        },
        { OR: [] },
        { AND: [] }
      ]
    };
    const expected = {
      OR: [
        { GREATER_THAN: { column: "A.a", value: 88 } },
        {
          AND: [
            { OR: [{ AND: [{ EQUALS: { column: "B.b", value: "Test" } }] }] },
            { AND: [{ EQUALS: { column: "C.c", value: "Another test" } }] }
          ]
        }
      ]
    };

    expect(prune(condition)).toEqual(expected);
  });

  it("should prune conditions of empty AND and OR conditions to an empty object", () => {
    const condition = {
      AND: [
        {
          OR: [
            {
              AND: [{ OR: [] }, { AND: [{ AND: [] }, { OR: [] }] }, { OR: [] }]
            }
          ]
        },
        { OR: [] },
        { AND: [] }
      ]
    };

    expect(prune(condition)).toEqual({});
  });
});
