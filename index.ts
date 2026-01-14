import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: SCOPES,
});

const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID!, jwt);

await doc.loadInfo(); // loads document properties and worksheets

const sheet = doc.sheetsByIndex[0];

console.log(sheet.title);
console.log(sheet.rowCount);

const rows = await sheet.getRows(); // can pass in { limit, offset }

console.log(rows[0].get("hello"));
rows[1].set("beep", `abc${Math.random()}`);

await rows[1].save();
