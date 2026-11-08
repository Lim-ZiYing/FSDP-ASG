# Hawker eMenu

**Revitalising Hawker Culture in a Digital Economy** — FSDP assignment.

*Skip the queue, not the meal.* A mobile-friendly web app for people in a rush, such as office workers on a short lunch break: pre-order from one or more hawker stalls, pay with NETS QR, and collect when the food is ready. Diners upload photos of dishes and upvote the best ones; the top-voted photo becomes the dish's picture on the eMenu.

## Tech stack

| Layer | Technology |
|---|---|
| Front end | React (Vite) |
| Back end | Node.js + Express |
| Database | Supabase (PostgreSQL), plus Supabase Storage and Realtime |
| Payment | NETS QR Web |
| AI | Image check that rejects non-food photos |

The React app never talks to Supabase directly: every request goes **page → `api.js` → Express route → Supabase**. Only the server holds the Supabase keys.

## Team

| Name | Area |
|---|---|
| Zi Ying | Accounts, live orders and real-time, hawker side |
| Dana | Database (Supabase, test data), photo upload, AI food check |
| Declan | NETS QR payment |
| Lennox | Cart, ordering, pre-order, order history |
| Siyu | Stall browsing, eMenu, voting |

## Folder structure

```
FSDP-ASG/
├── database/          schema.sql, seed.sql (copies of the Supabase scripts)   Dana
├── docs/              CONTRIBUTING.md (team Git routine)
├── server/src/
│   ├── index.js       starts the server; all routes already connected
│   ├── supabase.js    shared Supabase connection
│   ├── middleware/    requireAuth, requireRole                                Zi Ying
│   ├── routes/
│   │   ├── auth.js      sign up, log in, log out                              Zi Ying
│   │   ├── hawker.js    hawker orders, update status                          Zi Ying
│   │   ├── stalls.js    stall list, eMenu, search                             Siyu
│   │   ├── votes.js     upvote, remove vote                                   Siyu
│   │   ├── orders.js    cart → order, pre-order, history                      Lennox
│   │   ├── payments.js  NETS QR, confirm payment                              Declan
│   │   └── photos.js    upload, AI check, community photos                    Dana
│   └── services/      nets.js (Declan), aiFoodCheck.js (Dana)
└── client/src/
    ├── App.jsx        all pages already connected
    ├── api.js         all calls to the server (shared)
    ├── auth.jsx       who's logged in                                         Zi Ying
    ├── components/    reusable pieces (StallCard, VoteButton, CartItem, OrderStatus…)
    └── pages/         one file per screen, matching the Figma
```

Unbuilt endpoints return **501 "Not built yet (FSDP-xx)"** and unbuilt pages show **"Coming soon"**. Replace them as you build each story.

## Getting started

You need **Node.js 18+** and **Git**. No local database: the team shares one Supabase project.

### 1. Get the code
```bash
git clone https://github.com/Lim-ZiYing/FSDP-ASG.git
cd FSDP-ASG
git checkout <your-branch>
git pull origin main
```

### 2. Back end
```bash
cd server
npm install
cp .env.example .env
npm run dev
```
Fill in `.env` with the Supabase URL, the service role key and the JWT secret shared privately in the group chat. Check it works: http://localhost:3000/api/health

### 3. Front end (second terminal)
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173

## API overview

| Method | Endpoint | Auth | Story | Owner |
|---|---|---|---|---|
| POST | `/api/auth/register` | – | FSDP-9 | Zi Ying |
| POST | `/api/auth/login` | – | FSDP-35 | Zi Ying |
| GET | `/api/auth/me` | ✓ | – | Zi Ying |
| POST | `/api/auth/logout` | – | FSDP-10 | Zi Ying |
| GET | `/api/hawker/orders` | hawker | FSDP-50 | Zi Ying |
| PATCH | `/api/hawker/orders/:stallOrderId/status` | hawker | FSDP-51 | Zi Ying |
| GET | `/api/stalls` | – | FSDP-11 | Siyu |
| GET | `/api/stalls/:id/menu` | – | FSDP-12 | Siyu |
| POST / DELETE | `/api/votes/:photoId` | ✓ | FSDP-22 | Siyu |
| POST | `/api/orders` | ✓ | FSDP-14 | Lennox |
| GET | `/api/orders/mine` | ✓ | FSDP-18 | Lennox |
| GET | `/api/orders/:id` | ✓ | FSDP-43, 48 | Lennox |
| POST | `/api/payments/:orderId/nets-qr` | ✓ | FSDP-16 | Declan |
| GET | `/api/payments/:orderId/status` | ✓ | FSDP-17 | Declan |
| GET | `/api/photos/item/:itemId` | – | FSDP-34 | Dana |
| POST | `/api/photos/item/:itemId` | ✓ | FSDP-20 | Dana |

## Links
[Jira board] · [Figma file](https://www.figma.com/design/HMrIlQdr3NR0NfztB5lc5X)
