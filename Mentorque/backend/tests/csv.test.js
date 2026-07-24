import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../src/utils/csv.js";

describe("toCsv", () => {
  test("serializes simple rows with a header", () => {
    const rows = [{ name: "Ada", email: "ada@example.com" }];
    const csv = toCsv(rows, [
      { header: "Name", value: (r) => r.name },
      { header: "Email", value: (r) => r.email },
    ]);
    assert.equal(csv, "Name,Email\r\nAda,ada@example.com");
  });

  test("quotes values containing commas", () => {
    const csv = toCsv([{ v: "Smith, Jane" }], [{ header: "V", value: (r) => r.v }]);
    assert.equal(csv, 'V\r\n"Smith, Jane"');
  });

  test("escapes embedded quotes by doubling them", () => {
    const csv = toCsv([{ v: 'She said "hi"' }], [{ header: "V", value: (r) => r.v }]);
    assert.equal(csv, 'V\r\n"She said ""hi"""');
  });

  test("quotes values containing newlines", () => {
    const csv = toCsv([{ v: "line1\nline2" }], [{ header: "V", value: (r) => r.v }]);
    assert.equal(csv, 'V\r\n"line1\nline2"');
  });

  test("renders null/undefined as an empty cell", () => {
    const csv = toCsv([{ v: null }, { v: undefined }], [{ header: "V", value: (r) => r.v }]);
    assert.equal(csv, "V\r\n\r\n");
  });

  test("handles an empty row set (header only)", () => {
    const csv = toCsv([], [{ header: "Name", value: (r) => r.name }]);
    assert.equal(csv, "Name");
  });
});
