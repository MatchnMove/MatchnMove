import assert from "node:assert/strict";
import { buildLeadSpreadsheetRow, LEAD_SPREADSHEET_HEADERS } from "../lib/lead-spreadsheet";

const row = buildLeadSpreadsheetRow({
  id: "quote-test",
  name: '=HYPERLINK("bad")',
  email: "test@example.com",
  phone: "+64 21 123 456",
  movingWhat: "@SUM(1,1)",
  fromPropertyType: "House",
  toPropertyType: "Apartment",
  bedrooms: "3",
  fromAddress: "1 Queen Street",
  fromCity: "Auckland",
  fromRegion: "Auckland",
  fromPostcode: "1010",
  fromCountry: "New Zealand",
  toAddress: "2 Cuba Street",
  toCity: "Wellington",
  toRegion: "Wellington",
  toPostcode: "6011",
  toCountry: "New Zealand",
  moveDate: new Date("2026-06-20T00:00:00.000Z"),
  dateFlexible: false,
  transcriptRaw: null,
  transcriptFields: null,
  transcriptionState: "manual",
  createdAt: new Date("2026-06-09T00:00:00.000Z"),
});

assert.equal(row.length, LEAD_SPREADSHEET_HEADERS.length);
assert.ok(String(row[4]).startsWith("'="), "Customer name formula was not neutralised.");
assert.ok(String(row[5]).startsWith("'+"), "Phone formula was not neutralised.");
assert.ok(String(row[24]).startsWith("'@"), "Items formula was not neutralised.");

console.log(`Google Sheet row verified: ${row.length} columns, injection guards active.`);
