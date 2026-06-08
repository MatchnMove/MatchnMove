import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  buildLeadSpreadsheetRow,
  buildLeadWorkbookBuffer,
  LEAD_SPREADSHEET_HEADERS,
} from "../lib/lead-spreadsheet";

async function main() {
  const buffer = await buildLeadWorkbookBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const leads = workbook.getWorksheet("Leads");
  assert.ok(leads, "Leads worksheet is missing.");
  assert.equal(leads.getTable("LeadsTable").name, "LeadsTable");
  const headerValues = leads.getRow(1).values;
  assert.ok(Array.isArray(headerValues), "Lead headers were not written as a row.");
  assert.deepEqual(headerValues.slice(1), [...LEAD_SPREADSHEET_HEADERS]);
  assert.equal(leads.getCell("C2").dataValidation.type, "list");
  assert.ok(workbook.getWorksheet("Read Me"), "Read Me worksheet is missing.");

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

  console.log(`Workbook verified: ${buffer.length} bytes, ${row.length} columns, injection guards active.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
