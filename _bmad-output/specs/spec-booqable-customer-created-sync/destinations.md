# Destinations — auth and landing

## Passport (every destination)

Send whole, never silently truncated: email, phone, name, address (country, region, city, street, zip), birthday.

Green = the person is known to exist in that tool. Address dropped after Mailchimp accepted the person is not a must-stay-red.

## Google Contacts

People API. Not an API key. One-time OAuth by `echeloncyclinghub@gmail.com`, then `GOOGLE_CONTACTS_CLIENT_ID`, `GOOGLE_CONTACTS_CLIENT_SECRET`, and `GOOGLE_CONTACTS_REFRESH_TOKEN` as server-only env vars. Scope: `https://www.googleapis.com/auth/contacts`. Setup steps: `google-oauth-setup.md`.

## Holded

`HOLDED_API_KEY` is already in `.env.local`. Send as the `key` header. Contacts write (or the minimum that can create/update contacts).

## Mailchimp

`MAILCHIMP_API_KEY` is already in `.env.local`. Audience ID `74fcbaad78` is `MAILCHIMP_AUDIENCE_ID` in env, not hardcoded. Data-center suffix comes from the API key. ADDRESS merge-field requiring region is destination configuration, not a code default.

## Isolation

Local webhook deliveries may write these live destination accounts. Preview/PR must not. Production uses the same live accounts after cutover. Do not put destination secrets on Vercel preview.
