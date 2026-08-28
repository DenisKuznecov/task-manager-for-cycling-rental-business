---
title: 'Show navbar logout on pending page'
type: 'bugfix'
created: '2026-08-28'
status: 'done'
route: 'one-shot'
---

# Show navbar logout on pending page

## Intent

**Problem:** Signed-in users who land on `/pending` (no role yet) see only a bare message. There is no navbar, so they cannot log out and try another account.

**Approach:** Wrap `/pending` with the same `DefaultPageLayout` chrome used elsewhere, without a role gate that would bounce the page to itself, so the avatar menu’s Log out stays reachable.

## Suggested Review Order

**Pending chrome**

- Session check only; wrap with the shared topbar so Log out is on this page.
  [`layout.tsx:23`](../../src/app/pending/layout.tsx#L23)

- No role redirect — this route is the waiting room, not a gated area.
  [`layout.tsx:27`](../../src/app/pending/layout.tsx#L27)

**Copy**

- Heading plus the existing approval message, same type scale as other pages.
  [`page.tsx:4`](../../src/app/pending/page.tsx#L4)

**User menu**

- Hide Contact Us when there is no role so the item cannot loop back here.
  [`UserMenu.tsx:27`](../../src/ui/layouts/UserMenu.tsx#L27)

- Log out stays last in the menu for every signed-in user.
  [`UserMenu.tsx:88`](../../src/ui/layouts/UserMenu.tsx#L88)

**Tests**

- Source checks: layout wrap, no `/pending` bounce, Log out still in chrome.
  [`pending-layout.test.mts:10`](../../src/pending-layout.test.mts#L10)
