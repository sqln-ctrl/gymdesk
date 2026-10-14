import { describe, expect, it } from "vitest";

import { toCsv } from "./csv";

describe("CSV reporting utility", () => {
  it("quotes values and prevents spreadsheet formula execution", () => {
    expect(toCsv(["Name", "Value"], [["Amina, Khan", '=SUM(A1:A2)']])).toBe(
      '"Name","Value"\r\n"Amina, Khan","\'=SUM(A1:A2)"',
    );
  });
});
