# PCP Mailing List Automation

This repo houses an automation designed to make wrangling external penpals on Riseup and Zoho a bit easier. Those two, duct-taped together alongside Google's labyrinthine Cloud APIs, form an unholy trifecta of horrible janky code, running on beloved failchild Github Actions. I've done the best I can...

Riseup in particular has a few shortcomings as a mailing list service. List members can unsubscribe, but Riseup won't keep track of who has unsubscribed -- it just immediately deletes them from the list. By contrast, most mailing list services keep a separate unsubscribe list, so as to avoid accidentally resubscribing anyone who opted out. This is particularly important when wrangling an external member list or roster you periodically synchronize to the mailing list (like PCP does).

In order to work around this, before adding contacts to Riseup, you can compare the current subscriber list against an older version to check if anyone is missing -- if so, that means they've unsubscribed since we last checked. If we keep our own unsubscribe list in this manner, we can remove anyone on it from a contact list before bulk-adding it to Riseup. That ensures nobody gets resubscribed again by accident (which people have gotten mad at PCP for before!).

(Another shortcoming of Riseup is that it doesn't have a scripting API for doing any of this sort of thing automatically. No sweat, we'll just pretend we're a browser instead. That's not cursed or anything. Fun fact: the software Riseup is based on, Sympa, actually does include both unsubscribe list and scripting API functionality -- Riseup just disables them for some reason.)

Zoho isn't quite as bad -- it has absurdly low API rate limits, like 50 total calls _per day_ even on the paid plan, and its OAuth setup is needlessly janky and error-prone. Regardless, Creator itself more or less works... but it can still be a bit of a pain to export a list of outside penpals and format them to add to Riseup. So this script also handles that.

Finally, it takes all these disparate parts (the latest version of the the Riseup member list, the unsubscribe list, and outside member emails from Zoho) and gloms them together into one aggregated "master" list. As of right now it doesn't reinsert that back into Riseup -- since the script runs automatically on a daily basis, it would be kind of bad if some bug accidentally resubscribed people who didn't want to be on the list. Thus the final step of syncing the list from this spreadsheet to Riseup is a manual step.

Hopefully this is still a lot easier than the previous process!

# Setup

If for some ungodly reason you want to run something like this yourself locally, you'll need Node and Git installed. If you install Node manually, you should match the Node version listed in [the `.node-version`](.node-version) file. (But instead of installing Node directly I recommend using [fnm](https://github.com/Schniz/fnm), which can automatically handle installing and switching Node versions by detecting `.node-version` files.)

Once you're set, run:

```sh
git clone https://github.com/prisonercorrespondenceproject/mailing-list-automation/
cd mailing-list-automation
corepack enable # enable use of the pnpm package manager
pnpm install # install dependencies
```

Before you can run the script, you'll also need a boatload of environment variables set up for the various integrations. Here they are:

| Environment Variable | Description |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email address of the Google service account used to authenticate with the Google Sheets API. Setting up a Google service account is beyond the scope of this readme, and I wouldn't wish it on anyone. |
| `GOOGLE_PRIVATE_KEY` | Private key for the Google service account. |
| `SPREADSHEET_DOC_ID` | ID of the Google Sheet the application reads from or writes to. You can get this from the URL of the doc, eg. `https://docs.google.com/spreadsheets/d/<doc_id>/edit` |
| `SPREADSHEET_SHEET_IDS` | Each part of the script writes to different tabs of the Google Sheet. This env var should be a JSON object that maps the internal tab names (check `src/env.ts`) to Google Sheets tab IDs. You can find the tab ID from the doc URL while the tab is active, eg. `https://docs.google.com/spreadsheets/d/<doc_id>/edit?gid=<tab_id>` |
|---|---|
| `RISEUP_USERNAME` | Username of the Riseup mailing list admin account. |
| `RISEUP_PASSWORD` | Password of the Riseup mailing list admin account. |
| `RISEUP_LIST_NAME` | Name of the Riseup mailing list, ie. `https://lists.riseup.net/www/admin/<list_name>`. |
|---|---|
| `ZOHO_CLIENT_ID` | OAuth client ID for the Zoho API. |
| `ZOHO_CLIENT_SECRET` | OAuth client secret for the Zoho API. |
| `ZOHO_REFRESH_TOKEN` | OAuth refresh token used to obtain access tokens for Zoho APIs. |
| `ZOHO_ACCOUNT_NAME` | Zoho account and application name, ie. given the URL `https://creatorapp.zoho.com/freako/members#Form:whatever` this var should be set to `freako/members`. |
|---|---|
| `SENTRY_DSN` | Optional Sentry DSN for error monitoring. |

You can set them up in a `.env` file in the root of the repo. Once you're good to go, run `pnpm start` in the project root.
