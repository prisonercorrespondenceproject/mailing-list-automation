import ky from "ky";

import { RISEUP_LIST_NAME, RISEUP_PASSWORD, RISEUP_USERNAME } from "./env.ts";

export async function getRiseupListUsers(): Promise<string[]> {
  const cookie = await getSessionCookie();

  const listRes = await ky.get(
    `https://lists.riseup.net/www/dump/${RISEUP_LIST_NAME}/light`,
    { headers: { cookie } },
  );

  const responseType = listRes.headers.get("Content-Type");
  const listText = await listRes.text();

  if (responseType === "text/plain") {
    // quick sanity check
    if (!/^\S+@\S+\.\S+$/gm.test(listText)) {
      throw new Error(
        [
          "Error retrieving Riseup user list:",
          "Response had expected Content-Type, but didn't look like a list of emails!",
        ].join("\n"),
      );
    }

    return listText.split("\n");
  }

  // anything else is an error.

  if (responseType?.startsWith("text/html")) {
    const { load } = await import("cheerio");
    const errorMessage =
      load(listText)("#ErrorMsg").text().trim() ||
      "(No error message found in response HTML)";

    throw new Error(`Error retrieving Riseup user list:\n${errorMessage}`);
  }

  throw new Error(
    `Error retrieving Riseup user list: Unknown response type: ${responseType}`,
  );
}

async function getSessionCookie(): Promise<string> {
  // login is in application/x-www-form-urlencoded format
  const body = new URLSearchParams();
  body.set("previous_action", "");
  body.set("previous_list", "");
  body.set("referer", "");
  body.set("list", "");
  body.set("action", "login");
  body.set("email", RISEUP_USERNAME);
  body.set("passwd", RISEUP_PASSWORD);
  body.set("action_login", "Login");

  const loginRes = await ky.post("https://lists.riseup.net/www", {
    body,
    headers: {
      Referer: "https://lists.riseup.net/www",
      Origin: "https://lists.riseup.net",
    },
    // we have to use the cookie returned in response to the *initial* request.
    // the inital response is 302 redirect, and if we don't set the cookie right
    // away before we follow the redirect, the redirected response will set a
    // *different* session cookie -- one representing a logged-out session.
    redirect: "manual",
    throwHttpErrors: (status) => status !== 302,
  });

  // worth noting that the session cookie will be set even in the event of auth
  // failure, though -- we'll need to check for errors in the subsequent call.

  const session = loginRes.headers
    .getSetCookie()
    .find((c) => c.startsWith("sympa_session"));

  if (!session) {
    throw new Error("No session cookie set in response to login request!");
  }

  return session.split(";")[0];
}
