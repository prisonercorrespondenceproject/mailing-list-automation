/* eslint-disable node/no-process-env */

import { parseEnv, z } from "znv";
import { init as initSentry, captureConsoleIntegration } from "@sentry/node";

const isDevEnv = process.env["NODE_ENV"] !== "production";

export const {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  SPREADSHEET_DOC_ID,
  SPREADSHEET_SHEET_IDS,

  RISEUP_USERNAME,
  RISEUP_PASSWORD,
  RISEUP_LIST_NAME,

  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_ACCOUNT_NAME,

  SENTRY_DSN,
} = parseEnv(process.env, {
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().min(1),
  GOOGLE_PRIVATE_KEY: z.string().min(1),
  SPREADSHEET_DOC_ID: z.string().min(1),
  SPREADSHEET_SHEET_IDS: z.object({
    log: z.number().min(0),
    aggregatedMasterList: z.number().min(0),
    zohoAdditions: z.number().min(0),
    riseupUnsubscribed: z.number().min(0),
    riseupPrevious: z.number().min(0),
  }),

  RISEUP_USERNAME: z.string().min(1),
  RISEUP_PASSWORD: z.string().min(1),
  RISEUP_LIST_NAME: z.string().min(1),

  ZOHO_CLIENT_ID: z.string().min(1),
  ZOHO_CLIENT_SECRET: z.string().min(1),
  ZOHO_REFRESH_TOKEN: z.string().min(1),
  ZOHO_ACCOUNT_NAME: z.string().min(1),

  SENTRY_DSN: z.string().min(1).optional(),
});

if (!SENTRY_DSN) {
  console.warn(
    `Sentry DSN is missing! Error reporting to Sentry will be disabled.`,
  );
} else {
  initSentry({
    dsn: SENTRY_DSN,
    environment: isDevEnv ? "dev" : "prod",
    integrations: [
      captureConsoleIntegration({
        levels: ["warn", "error", "debug", "assert"],
      }),
    ],
  });
}
