# Hawker eMenu

**Revitalising Hawker Culture in a Digital Economy** — FSDP assignment.

A mobile-friendly web app for people in a rush: order ahead from one or more hawker stalls, pay with NETS QR, and collect at a collection point when the food is ready. Diners upload photos of dishes and upvote the best ones; the top-voted photo becomes the dish's picture on the eMenu.

## Tech stack

| Layer | Technology |
|---|---|
| Front end | React (Vite) |
| Back end | Node.js + Express |
| Database | Supabase (PostgreSQL) + Supabase Storage for photos |
| Login | Own Express login (bcrypt passwords + JWT) |
| Payment | NETS QR Web (sandbox, or a clearly labelled mock) |
| AI | Image check that rejects non-food photos |

## Folder structure

```
FSDP-ASG/
├── client/          React front end (runs on http://localhost:5173)
│   └── src/
│       ├── pages/       One file per screen (Home, StallMenu, Cart...)
│       ├── components/  Reusable pieces (StallCard, BottomNav...)
│       └── api.js       All calls to the back end go through here
├── server/          Express back end (runs on http://localhost:3000)
│   └── src/
│       ├── routes/      auth, stalls, photos, orders
│       ├── middleware/  requireAuth (JWT check)
│       └── db.js        MSSQL connection
├── database/        Run these in order in the Supabase SQL Editor
│   ├── 01_schema.sql    Creates all 14 tables
│   ├── 02_security.sql  Row Level Security (menu data public, the rest private)
│   ├── 03_extras.sql    Order numbers, indexes, vote rules, views, photo bucket
│   └── 04_seed.sql      Sample users, stalls, dishes, photos, votes and orders
└── docs/
    └── CONTRIBUTING.md  How the team uses Git and Jira
```

## Getting started

You need **Node.js 18+**. The database is the team's shared Supabase project, so you don't install a database yourself.

### 1. Database (already set up in Supabase — only redo this for a fresh project)
1. Open the Supabase project → **SQL Editor** → **New query**.
2. Paste and run each file in order: `01_schema.sql`, `02_security.sql`, `03_extras.sql`, `04_seed.sql`.
3. Ask the project owner for the **Project URL** and **secret key** for `server/.env`. Never commit them.

Useful views: `menu_with_photo` (eMenu with top-voted photo), `top_photos`, `photo_votes`, `stall_queue`.
Re-running `04_seed.sql` resets all data to the sample data.

### 2. Back end
```bash
cd server
npm install
cp .env.example .env     # then fill in your own DB password and JWT secret
npm run dev
```
Check it works: open http://localhost:3000/api/health

### 3. Front end
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173

## Features (mapped to Jira epics)

| Epic | Feature | Status |
|---|---|---|
| Accounts & login | Register, log in, JWT auth | Starter code |
| Stalls & eMenu | Stall list with live queue, eMenu with top-voted photos | Starter code |
| Ordering & cart | Multi-stall cart, pick-up time, collection point | Tables ready |
| NETS QR payment | Generate QR, confirm payment | To do |
| Order history | Past orders, "reorder my usual" | Tables ready |
| Photo upload + AI check | Upload dish photo, reject non-food | To do |
| Upvoting & top photo | One vote per user per photo, earliest upload wins ties | Starter code |

## API overview

| Method | Endpoint | Auth | What it does |
|---|---|---|---|
| GET | `/api/health` | – | Check the server is running |
| POST | `/api/auth/register` | – | Create an account |
| POST | `/api/auth/login` | – | Log in, returns a token |
| GET | `/api/stalls` | – | List stalls with live queue |
| GET | `/api/stalls/:id/menu` | – | Menu items with their top photo |
| GET | `/api/photos/item/:itemId` | – | Community photos for a dish |
| POST | `/api/photos/:photoId/vote` | ✓ | Upvote a photo (once per user) |
| DELETE | `/api/photos/:photoId/vote` | ✓ | Remove your vote |
| POST | `/api/orders` | ✓ | Place an order (can span several stalls) |
| GET | `/api/orders/mine` | ✓ | Your order history |

## Team

| Name | Main area |
|---|---|
| [Name] | [e.g. Accounts & login] |
| [Name] | [e.g. Upvoting & top photo] |
| [Name] | [e.g. NETS QR payment] |
| [Name] | [e.g. Ordering & cart] |

Links: [Jira board] · [Figma file](https://www.figma.com/design/HMrIlQdr3NR0NfztB5lc5X)
