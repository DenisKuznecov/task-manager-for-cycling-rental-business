# Echelon Cycling Hub Portal

Echelon Cycling Hub Portal is an internal platform for managing Echelon Cycling Hub operations and its partner network. It tracks orders from Booqable, provides sales statistics for partners, and calculates commissions owed to each partner.

In the future, the portal will also provide:

- A communication channel between the Echelon team and partners.
- Order tracking capabilities for mechanics to streamline order preparation and fulfillment.

## Tech Stack

- [Next.js](https://nextjs.org/) — React framework powering the application (App Router).
- [React](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/) — UI library and type-safe language.
- [Supabase](https://supabase.com/) — Postgres database, authentication, and row-level security.
- [Booqable](https://booqable.com/) — Rental management platform; source of truth for orders and inventory.
- [Subframe](https://subframe.com/) — Design system and component library used across the UI.
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first styling.
- [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) — Drag-and-drop for the mechanic kanban board.
- [Vercel](https://vercel.com/) — Hosting, preview deployments, and CI/CD.
- [ESLint](https://eslint.org/) & [PostCSS](https://postcss.org/) — Code quality and CSS tooling.

## Getting Started

First, install dependencies:

```bash
npm install
```

And then run the project:

```bash
npm run dev
```

## Test Accounts

The following accounts are available for testing each role in non-production environments.

| Role     | Email                     | Password          |
| -------- | ------------------------- | ----------------- |
| Admin    | admintest@gmail.com       | Echeloncycling26! |
| Partner  | partnertest@gmail.com     | Echeloncycling26! |
| Manager  | managertest@gmail.com     | Echeloncycling26! |
| Mechanic | mechanictest@gmail.com    | Echeloncycling26! |

## Access Control

Access is scoped by role. The following rules describe what each role can see and do within the portal.

### Admin

- Full access across the entire platform.
- Can create and edit everything, including partners, fleet, bookings, tickets, and users.

### Manager

- Same read access as Admin across the platform.
- Cannot create or edit partners.

### Partner

- Scoped to their own data only.
- Can view their own orders, sales statistics, and commissions.
- Can view and manage their own support tickets.
- Cannot access fleet management, live bookings, or the partner portal.
- Can create bookings for guests using their own coupon code.

### Mechanic

- Scoped to the mechanic kanban board only.
- Can read and write tickets on the kanban board.

## Learn More

- [Next.js documentation](https://nextjs.org/docs)
- [Supabase documentation](https://supabase.com/docs)
- [Booqable API documentation](https://developers.booqable.com/)
- [Subframe documentation](https://docs.subframe.com/overview)
- [Tailwind CSS documentation](https://tailwindcss.com/docs)
