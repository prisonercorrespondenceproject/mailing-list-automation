import ky from "ky";
import z from "zod";

import {
  ZOHO_ACCOUNT_NAME,
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
} from "./env.ts";

const OAUTH_HOST = "https://accounts.zoho.com";
const API_HOST = "https://www.zohoapis.com";

const tokenSchema = z.object({
  access_token: z.string().min(1),
});

// these two below are the same response, but we first have to check for the
// error code before performing a check on the shape of the data, so we check
// via two schemas.
const responseSchema = z.object({
  code: z.number().min(0),
});
const emailsSchema = z.object({
  data: z.array(z.object({ Email: z.string().min(1) })),
});

async function refreshAccessToken() {
  const res = await ky(`${OAUTH_HOST}/oauth/v2/token`, {
    method: "POST",
    searchParams: {
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: ZOHO_REFRESH_TOKEN,
    },
  }).json();

  const { access_token } = tokenSchema.parse(res);

  return access_token;
}

export async function getOutsideMemberEmailAddresses() {
  const token = await refreshAccessToken();

  const allData = [];

  let cursor;
  let data;

  do {
    ({ cursor, data } = await getEmailsFromAPI(token, cursor));
    allData.push(...data);
  } while (cursor);

  const deduplicated = [...new Set(allData.map((d) => d.Email))];

  return deduplicated;
}

async function getEmailsFromAPI(token: string, prevCursor: string | undefined) {
  const headers: Record<string, string> = {
    Authorization: `Zoho-oauthtoken ${token}`,
  };
  if (prevCursor) headers.record_cursor = prevCursor;

  const res = await ky(
    `${API_HOST}/creator/v2.1/data/${ZOHO_ACCOUNT_NAME}/report/Members_Form_View`,
    {
      method: "GET",
      searchParams: {
        field_config: "custom",
        fields: "Email",
        criteria:
          'Email != "" && Priority == "Successfully Matched" || Priority == "Requires Confirmation"',
        max_records: "1000",
      },
      headers,
    },
  );

  // if there are more than 1000 results, this should be present
  const cursor = res.headers.get("record_cursor");

  const json = await res.json();

  const { code } = responseSchema.parse(json);
  if (code !== 3000) {
    throw new Error(
      [
        `Unexpected status code from Zoho API: ${code}`,
        "See https://www.zoho.com/creator/help/api/v2/status-codes.html",
      ].join("\n"),
    );
  }

  const { data } = emailsSchema.parse(json);

  return { cursor, data };
}
