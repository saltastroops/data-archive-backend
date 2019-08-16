// tslint:disable-next-line:no-submodule-imports
import iconv from "mysql2/node_modules/iconv-lite";
iconv.encodingExists("cesu8");
import { DatabaseModel } from "../../util/DatabaseModel";

describe("DatabaseModel", () => {
  describe("table", () => {
    it("should find the correct table", () => {
      const a = { join: "", name: "A", rightOf: new Set([]) };
      const b = { join: "A.b_id=B.id", name: "B", rightOf: new Set(["A"]) };
      const c = { join: "A.c_id=C.id", name: "C", rightOf: new Set(["A"]) };
      const dm = new DatabaseModel(new Set([a, b, c]));
      expect(dm.table("A")).toEqual(a);
      expect(dm.table("B")).toEqual(b);
      expect(dm.table("C")).toEqual(c);
    });

    it("should raise an error if the table does not exist", () => {
      const a = { join: "", name: "A", rightOf: new Set([]) };
      const b = { join: "A.b_id=B.id", name: "B", rightOf: new Set(["A"]) };
      const c = { join: "A.c_id=C.id", name: "C", rightOf: new Set(["A"]) };
      const dm = new DatabaseModel(new Set([a, b, c]));

      const f = () => dm.table("NonExisting");
      expect(f).toThrowError("does not exist");
    });
  });

  describe("dependencies", () => {
    it("should raise an error if the table does not exist", () => {
      const a = { join: "", name: "A", rightOf: new Set([]) };
      const b = { join: "", name: "B", rightOf: new Set(["A"]) };

      const dm = new DatabaseModel(new Set([a, b]));
      const f = () => dm.dependencies("NonExisting");
      expect(f).toThrowError("does not exist");
    });

    it("should raise an error if the table is part of a cyclic dependency", () => {
      const a = { join: "", name: "A", rightOf: new Set(["C"]) };
      const b = { join: "", name: "B", rightOf: new Set(["A"]) };
      const c = { join: "", name: "C", rightOf: new Set(["B"]) };

      const dm = new DatabaseModel(new Set([a, b, c]));
      const f = () => dm.dependencies("C");
      expect(f).toThrowError("cyclic");
    });

    it("should raise an error if a dependency is part of a cyclic dependency", () => {
      const a = { join: "", name: "A", rightOf: new Set(["C"]) };
      const b = { join: "", name: "B", rightOf: new Set(["A"]) };
      const c = { join: "", name: "C", rightOf: new Set(["B"]) };
      const d = { join: "", name: "D", rightOf: new Set(["B"]) };

      const dm = new DatabaseModel(new Set([a, b, c, d]));
      const f = () => dm.dependencies("D");
      expect(f).toThrowError("cyclic");
    });

    it("should find simple linear dependencies", () => {
      const a = { join: "", name: "A", rightOf: new Set([]) };
      const b = { join: "", name: "B", rightOf: new Set(["A"]) };
      const c = { join: "", name: "C", rightOf: new Set(["B"]) };
      const d = { join: "", name: "D", rightOf: new Set(["C"]) };
      const e = { join: "", name: "E", rightOf: new Set(["A"]) };

      const dm = new DatabaseModel(new Set([a, b, c, d, e]));
      expect(dm.dependencies("A")).toEqual(new Set([]));
      expect(dm.dependencies("B")).toEqual(new Set(["A"]));
      expect(dm.dependencies("C")).toEqual(new Set(["A", "B"]));
      expect(dm.dependencies("D")).toEqual(new Set(["A", "B", "C"]));
      expect(dm.dependencies("E")).toEqual(new Set(["A"]));
    });

    it("should find more complex dependencies", () => {
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
      const b = { join: "", name: "B", rightOf: new Set(["A"]) };
      const c = { join: "", name: "C", rightOf: new Set(["A"]) };
      const d = { join: "", name: "D", rightOf: new Set(["B", "C"]) };
      const e = { join: "", name: "E", rightOf: new Set(["A"]) };
      const f = { join: "", name: "F", rightOf: new Set(["D", "E"]) };
      const g = { join: "", name: "G", rightOf: new Set(["A"]) };
      const x = { join: "", name: "X", rightOf: new Set([]) };
      const y = { join: "", name: "Y", rightOf: new Set(["X"]) };

      const dm = new DatabaseModel(new Set([a, b, c, d, e, f, g, x, y]));
      expect(dm.dependencies("A")).toEqual(new Set([]));
      expect(dm.dependencies("B")).toEqual(new Set(["A"]));
      expect(dm.dependencies("C")).toEqual(new Set(["A"]));
      expect(dm.dependencies("D")).toEqual(new Set(["A", "B", "C"]));
      expect(dm.dependencies("E")).toEqual(new Set(["A"]));
      expect(dm.dependencies("F")).toEqual(new Set(["A", "B", "C", "D", "E"]));
      expect(dm.dependencies("G")).toEqual(new Set(["A"]));
      expect(dm.dependencies("X")).toEqual(new Set([]));
      expect(dm.dependencies("Y")).toEqual(new Set(["X"]));
    });
  });
});
