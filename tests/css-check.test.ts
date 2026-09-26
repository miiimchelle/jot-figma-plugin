import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS build helper
import { caseCollisions } from "../scripts/css-check.mjs";

describe("caseCollisions", () => {
  it("finds class names that differ only by case", () => {
    expect(caseCollisions(".jo{a:b}.Jo button{c:d}.field{}")).toEqual([["jo", "Jo"]]);
    expect(caseCollisions(".tabs_tab{}.button_button{}")).toEqual([]);
  });
});
