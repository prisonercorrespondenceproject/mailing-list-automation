import { type GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { format } from "date-fns/format";

import { getSpreadsheets } from "./google.ts";
import { getRiseupListUsers } from "./riseup.ts";
import { getOutsideMemberEmailAddresses } from "./zoho.ts";

const today = format(new Date(), "yyyy/MM/dd");

await main();

async function main() {
  const sheets = await getSpreadsheets();

  const logToSpreadsheet = async (message: string) => {
    console.log(`${today}: ${message}`);
    await sheets.log.addRow([today, message]);
  };

  await checkAndUpdateNewMembersFromZoho({
    zohoAdditionsSheet: sheets.zohoAdditions,
    logToSpreadsheet,
  });

  await compareAndUpdateRiseup({
    riseupPreviousSheet: sheets.riseupPrevious,
    riseupUnsubSheet: sheets.riseupUnsubscribed,
    logToSpreadsheet,
  });

  await updateAggregatedList({
    aggregatedSheet: sheets.aggregatedMasterList,
    zohoAdditionsSheet: sheets.zohoAdditions,
    riseupPreviousSheet: sheets.riseupPrevious,
    riseupUnsubSheet: sheets.riseupUnsubscribed,
    logToSpreadsheet,
  });
}

async function getColumn(sheet: GoogleSpreadsheetWorksheet, column: string) {
  return (await sheet.getRows()).map((r, i) => {
    const col = r.get(column);
    if (typeof col !== "string") {
      throw new Error(
        `Unexpected value "${col}" at row ${i + 2} in sheet "${sheet.title}"`,
      );
    }
    return col;
  });
}

async function checkAndUpdateNewMembersFromZoho({
  zohoAdditionsSheet,
  logToSpreadsheet,
}: {
  zohoAdditionsSheet: GoogleSpreadsheetWorksheet;
  logToSpreadsheet: (message: string) => Promise<void>;
}) {
  const zohoEmails = await getOutsideMemberEmailAddresses();
  const alreadyAddedEmails = await getColumn(zohoAdditionsSheet, "Email");

  const newEmails = [
    ...new Set(zohoEmails).difference(new Set(alreadyAddedEmails)),
  ];

  if (newEmails.length > 0) {
    await zohoAdditionsSheet.addRows(newEmails.map((email) => [email, today]));
    await logToSpreadsheet(`Added ${newEmails.length} from Zoho`);
  }

  await zohoAdditionsSheet.saveUpdatedCells();
}

async function compareAndUpdateRiseup({
  riseupPreviousSheet,
  riseupUnsubSheet,
  logToSpreadsheet,
}: {
  riseupPreviousSheet: GoogleSpreadsheetWorksheet;
  riseupUnsubSheet: GoogleSpreadsheetWorksheet;
  logToSpreadsheet: (message: string) => Promise<void>;
}) {
  const previousEmails = await getColumn(riseupPreviousSheet, "Email");
  const currentEmails = await getRiseupListUsers();
  const alreadyUnsubscribedEmails = await getColumn(riseupUnsubSheet, "Email");

  const [...unsubscribed] = new Set(previousEmails)
    .difference(new Set(currentEmails))
    .difference(new Set(alreadyUnsubscribedEmails));

  if (unsubscribed.length > 0) {
    await riseupUnsubSheet.addRows(unsubscribed.map((email) => [email, today]));
    await logToSpreadsheet(
      `Found ${unsubscribed.length} newly-unsubscribed Riseup users`,
    );
  }

  await riseupPreviousSheet.clear("A2:A");
  await riseupPreviousSheet.addRows(currentEmails.map((email) => [email]));
  await riseupPreviousSheet.loadCells("B1");
  riseupPreviousSheet.getCellByA1("B1").value = `Last updated: ${today}`;

  await Promise.all([
    riseupUnsubSheet.saveUpdatedCells(),
    riseupPreviousSheet.saveUpdatedCells(),
  ]);
}

async function updateAggregatedList({
  aggregatedSheet,
  zohoAdditionsSheet,
  riseupPreviousSheet,
  riseupUnsubSheet,
  logToSpreadsheet,
}: {
  aggregatedSheet: GoogleSpreadsheetWorksheet;
  zohoAdditionsSheet: GoogleSpreadsheetWorksheet;
  riseupPreviousSheet: GoogleSpreadsheetWorksheet;
  riseupUnsubSheet: GoogleSpreadsheetWorksheet;
  logToSpreadsheet: (message: string) => Promise<void>;
}) {
  const currentAggregatedList = new Set(
    await getColumn(aggregatedSheet, "Email"),
  );

  const allEmails = new Set([
    ...(await getColumn(zohoAdditionsSheet, "Email")),
    ...(await getColumn(riseupPreviousSheet, "Email")),
  ]);

  const newAggregatedList = allEmails.difference(
    new Set(await getColumn(riseupUnsubSheet, "Email")),
  );

  // if the list is different...
  if (currentAggregatedList.symmetricDifference(newAggregatedList).size > 0) {
    await aggregatedSheet.clear("A2:A");
    await aggregatedSheet.addRows([...newAggregatedList].map((e) => [e]));
    await aggregatedSheet.loadCells("B1");
    aggregatedSheet.getCellByA1("B1").value = `Last updated: ${today}`;
    await logToSpreadsheet(
      `Updated aggregated list (size is now ${newAggregatedList.size})`,
    );
  }

  await aggregatedSheet.saveUpdatedCells();
}
