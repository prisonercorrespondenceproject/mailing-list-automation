import {
  GoogleSpreadsheet,
  type GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";
import { JWT } from "google-auth-library";

import {
  GOOGLE_PRIVATE_KEY,
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  SPREADSHEET_DOC_ID,
  SPREADSHEET_SHEET_IDS,
} from "./env.ts";

export async function getSpreadsheets() {
  const SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ];

  const jwt = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: SCOPES,
  });

  const doc = new GoogleSpreadsheet(SPREADSHEET_DOC_ID, jwt);
  await doc.loadInfo(); // loads document properties and worksheets

  return getSheetsObjectFromIds(doc);
}

function getSheetsObjectFromIds(doc: GoogleSpreadsheet) {
  return Object.fromEntries(
    Object.entries(SPREADSHEET_SHEET_IDS).map(([k, v]) => {
      const sheet = doc.sheetsById[v];
      if (sheet == null) {
        throw new Error(`Sheet not found: ${k} (id: ${v})`);
      }
      return [k, sheet];
    }),
  ) as {
    [k in keyof typeof SPREADSHEET_SHEET_IDS]: GoogleSpreadsheetWorksheet;
  };
}
