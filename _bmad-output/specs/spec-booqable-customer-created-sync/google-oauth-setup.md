# Google Contacts — one-time OAuth setup

Chosen path: the business Google account that already owns the shared contacts consents once. The app stores a refresh token and writes to that account's Contacts. Domain-wide delegation is not required for v1.

Do this in a browser while signed into that business Google account (the one Zapier already writes to). If you are not sure which mailbox that is, open Zapier's Google Contacts connection and note the email.

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/) as that business user.
2. Create a project named `echelon-customer-sync` (or reuse an existing Echelon project).
3. APIs & Services → Library → enable **People API**. That is the current Google Contacts API. The old **Contacts API** (`m8/feeds`) was turned down on 2022-01-19; do not enable it.

## 2. OAuth consent / Data Access

Current Cloud Console puts this under **Google Auth Platform** (Audience + Data Access), not only the old “OAuth consent screen” page.

1. Audience: **External**. Internal is unavailable unless the Cloud project sits under a Google Workspace organization (a `@echeloncyclinghub.com` login is not enough). Stay in **Testing**. Do not publish.
2. Branding must be complete enough to dismiss “OAuth configuration is incomplete,” or Test users stay blocked. Use the public shop pages: home `https://www.echeloncyclinghub.com`, privacy `https://www.echeloncyclinghub.com/privacy-policy`. Authorized domain: `echeloncyclinghub.com`. Terms of service and logo can stay empty. Developer / support email: the business mailbox doing the consent. Then add Test users.
3. Data Access → **Add or remove scopes**.
4. Filter `People API` or paste `https://www.googleapis.com/auth/contacts`.
5. Check that one scope only. The user-facing line is usually **See, edit, download, and permanently delete your contacts**. It will land under **Sensitive scopes**. That is expected.
6. Do not add `contacts.readonly`, `contacts.other.readonly`, or directory scopes.
7. **Update**, then **Save**. On Audience, add every mailbox that will click Allow as a **Test user** (the Cloud Console owner is not added automatically). Do not publish; verification is not needed while Testing.

## 3. OAuth client

1. APIs & Services → Credentials → Create credentials → OAuth client ID.
2. Application type: **Web application**. Name: `echelon-customer-sync`.
3. Authorized redirect URIs → add `https://developers.google.com/oauthplayground`.
4. Create. Copy `client_id` and `client_secret`.

## 4. Get a refresh token (once)

Use Google's OAuth Playground so you do not have to write a script.

1. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
3. Gear icon (top right) → check **Use your own OAuth credentials** → paste the client ID and client secret.
4. Left list → **People API v1** → check `https://www.googleapis.com/auth/contacts` → **Authorize APIs**.
5. Sign in as a listed **Test user** (the mailbox that owns the contacts) → Allow. If you get **Error 403: access_denied**, that email is missing from Test users. Add it, wait a minute, try again.
6. **Exchange authorization code for tokens**. Copy `refresh_token`. Google only shows it this once unless you re-consent with `prompt=consent`.

## 5. Env vars (server-only)

Put these in `.env.local` now, and later in Vercel production (not preview):

```
GOOGLE_CONTACTS_CLIENT_ID=...
GOOGLE_CONTACTS_CLIENT_SECRET=...
GOOGLE_CONTACTS_REFRESH_TOKEN=...
```

Never commit them. The app uses the refresh token to mint short-lived access tokens on each write. No one clicks Allow again unless you revoke the token.

## 6. Check it worked

After the three vars are set, a later implementation story can create one test contact named `ECHELON SYNC TEST` and you delete it in Google Contacts. Until that story exists, having the three vars is enough to close this setup.
