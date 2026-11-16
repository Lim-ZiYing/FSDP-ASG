# Hawker eMenu

**Revitalising Hawker Culture in a Digital Economy** — FSDP assignment.

*Skip the queue, not the meal.* A mobile-friendly web app for people in a rush, such as office workers on a short lunch break: pre-order from one or more hawker stalls, pay with NETS QR, and collect when the food is ready. Diners upload photos of dishes and upvote the best ones; the top-voted photo becomes the dish's picture on the eMenu.

## Tech stack

| Layer | Technology |
|---|---|
| Front end | React (Vite), react-router, qrcode.react |
| Back end | Node.js + Express |
| Database | Supabase (PostgreSQL), plus Supabase Storage |
| Login | Own Express login (bcrypt passwords + JWT) |
| Payment | NETS QR |
| AI | Image check that rejects non-food photos |

The React app never talks to Supabase directly: every request goes **page → `api.js` → Express route → Supabase**. Only the server holds the Supabase keys.

## Team

| Name | Area |
|---|---|
| Zi Ying | Accounts, live orders, hawker side, front end |
| Dana | Database (Supabase, test data), photo upload, AI food check |
| Declan | NETS QR payment |
| Lennox | Cart, ordering, pre-order, order history |
| Siyu | Hawker centres, stall browsing, search, eMenu, voting |

## How we build: front end first

**Every screen for Sprints 1–3 is already built** and runs on fake data from `client/src/mocks.js`. Your job is to build the **server route** behind each screen.

1. Find your function in `client/src/mocks.js`. The comment above it shows the **exact data shape** your route must return. That's the contract.
2. Find your placeholder in `server/src/routes/…`. It returns **501 "Not built yet (FSDP-xx)"** until you replace `notBuilt(...)` with real code.
3. When your route returns the same shape, **delete your function's name from `NOT_READY` in `client/src/api.js`**. The screen now uses your real route. You don't need to change any page.
4. Test it, commit, push and open a pull request into main.

### Fake data switch (`client/.env`)

| `VITE_MOCK=` | What you get |
|---|---|
| `all` | Everything fake. No server needed. Any email and password logs in; emails starting with `hawker` log in as a hawker. Good for demos. |
| `unbuilt` (default) | Real server for everything already connected, fake for whatever is still in `NOT_READY`. Use this while building. |
| `off` | Everything real. |

Restart `npm run dev` after changing it. To reset the fake data: browser console → `localStorage.clear()` → refresh.

## Integration checklist

Tick these off as each route goes live (delete the name from `NOT_READY` when done).

**Siyu**
- [ ] `getCentres` → `GET /api/centres` (FSDP-68)
- [ ] `getTopDishes` → `GET /api/centres/:id/top-dishes` (FSDP-22)
- [ ] `getDish` → `GET /api/menu-items/:id` (FSDP-12)
- [ ] `search` → `GET /api/stalls/search?q=&centreId=` (FSDP-41)
- [ ] `vote` / `unvote` → `POST` / `DELETE /api/votes/:photoId` (FSDP-22)
- [ ] `getStalls` also accepts `?centreId=` (FSDP-68)

**Dana**
- [ ] `getPhotos` → `GET /api/photos/item/:itemId`, including `votedByMe` and `isMine` (FSDP-34)
- [ ] `deletePhoto` → `DELETE /api/photos/:photoId` (FSDP-46)
- [x] `uploadPhoto` → returns **422** with a message when the photo isn't food (FSDP-21)

**Lennox**
- [ ] `getCollectionPoints` → `GET /api/centres/:id/collection-points` (FSDP-30)
- [ ] `getPickupSlots` → `GET /api/orders/pickup-slots?centreId=&stallIds=` (FSDP-29, 33)
- [ ] `placeOrder` → `POST /api/orders`, prices read from the database (FSDP-14, 65, 42)
- [ ] `myOrders` → `GET /api/orders/mine` (FSDP-18)
- [ ] `getOrder` → `GET /api/orders/:id` (FSDP-43, 45)
- [ ] `cancelOrder` → `POST /api/orders/:id/cancel` (FSDP-44)

**Declan**
- [ ] `createNetsQr` → `POST /api/payments/:orderId/nets-qr`; send `qrImage` and the page shows the real NETS QR (FSDP-16, 44)
- [ ] `paymentStatus` → `GET /api/payments/:orderId/status` (FSDP-17)

**Zi Ying**
- [ ] `hawkerMenu` → `GET /api/hawker/menu` (FSDP-53)
- [ ] `setItemSoldOut` → `PATCH /api/hawker/menu-items/:itemId/sold-out` (FSDP-53)
- [ ] Add `subtotalCents`, `stallCount` and `estimatedReadyAt` to `GET /api/hawker/orders` (FSDP-66)

## Folder structure

```
FSDP-ASG/
├── database/          Supabase scripts, run in this order                      Dana
│   ├── 01_schema.sql    creates all tables
│   ├── 02_security.sql  Row Level Security (menu data public, the rest private)
│   ├── 03_extras.sql    order numbers, indexes, vote rules, views, photo bucket
│   └── 04_seed.sql      sample data (WIPES all data, ask the group first)
├── docs/              CONTRIBUTING.md (team Git routine), AI provider spike
├── server/src/
│   ├── index.js       starts the server; all routes already connected
│   ├── supabase.js    shared Supabase connection
│   ├── notBuilt.js    the 501 placeholder
│   ├── middleware/    requireAuth, requireRole                                Zi Ying
│   ├── routes/
│   │   ├── auth.js       sign up, log in, log out                             Zi Ying
│   │   ├── hawker.js     hawker orders, status, menu, sold out                Zi Ying
│   │   ├── tracking.js   live order tracking                                  Zi Ying
│   │   ├── centres.js    centres, top dishes · collection points       Siyu · Lennox
│   │   ├── stalls.js     stall list, eMenu, search                            Siyu
│   │   ├── menuItems.js  one dish for the dish page                           Siyu
│   │   ├── votes.js      upvote, remove vote                                  Siyu
│   │   ├── orders.js     pick-up slots, place, history, receipt, cancel       Lennox
│   │   ├── payments.js   NETS QR, payment status                              Declan
│   │   └── photos.js     upload, AI check, community photos, delete           Dana
│   └── services/      nets.js (Declan), aiFoodCheck.js and topPhotos.js (Dana)
└── client/
    ├── public/mock/   sample food pictures used by the fake data
    └── src/
        ├── App.jsx      every page and its route
        ├── api.js       every call to the server + the NOT_READY list (shared)
        ├── mocks.js     fake data; the comments are the data contracts (shared)
        ├── auth.jsx     who's logged in                                        Zi Ying
        ├── cart.jsx     the cart, across many stalls                           Lennox
        ├── centre.jsx   the chosen hawker centre                               Siyu
        ├── index.css    shared design: colours, fonts, buttons, cards
        ├── components/  reusable pieces (Icon, StallCard, MenuItemCard, Sheet…)
        └── pages/       one file per screen, matching the Figma
```

### Screens and owners

| Screen | File | Stories | Owner |
|---|---|---|---|
| Log in, Sign up | `Login.jsx`, `Signup.jsx` | FSDP-9, 35, 10 | Zi Ying |
| Home | `Home.jsx` | FSDP-11, 40, 41, 68, 69 | Siyu |
| Stall menu | `StallMenu.jsx` | FSDP-12, 65 | Siyu |
| Dish page | `DishPage.jsx` | FSDP-22, 34, 46, 42 | Siyu, Dana |
| Cart | `Cart.jsx` | FSDP-14, 15, 65, 42 | Lennox |
| Pick-up time | `PickupTime.jsx` | FSDP-29, 33, 30 | Lennox |
| Payment | `Payment.jsx` | FSDP-16, 17, 44 | Declan |
| Order placed | `OrderConfirmed.jsx` | FSDP-43 | Declan |
| Orders, Receipt | `OrderHistory.jsx`, `Receipt.jsx` | FSDP-18, 45 | Lennox |
| Tracking | `TrackOrder.jsx` | FSDP-48, 32, 66, 49 | Zi Ying |
| Hawker dashboard | `HawkerOrders.jsx` | FSDP-50, 51, 39, 53 | Zi Ying |
| Upload photo | `UploadPhoto.jsx` | FSDP-20, 21 | Dana |

## Getting started

You need **Node.js 18+** and **Git**. No local database: the team shares one Supabase project, which is already set up.

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
copy .env.example .env
npm run dev
```
Fill in `.env` with the values shared **privately** (never in GitHub, slides or screenshots). Check it works: http://localhost:3000/api/health

### 3. Front end (second terminal)
```bash
cd client
npm install
copy .env.example .env
npm run dev
```
Open http://localhost:5173. Press F12 → Ctrl+Shift+M to see it at phone size.

Run `npm install` again in **both** folders whenever you pull main and someone has added a package.

## API overview

| Method | Endpoint | Auth | Story | Owner | Status |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | – | FSDP-9 | Zi Ying | ✓ |
| POST | `/api/auth/login` | – | FSDP-35 | Zi Ying | ✓ |
| GET | `/api/auth/me` | ✓ | – | Zi Ying | ✓ |
| POST | `/api/auth/logout` | – | FSDP-10 | Zi Ying | ✓ |
| GET | `/api/hawker/orders` | hawker | FSDP-50 | Zi Ying | ✓ |
| PATCH | `/api/hawker/orders/:stallOrderId/status` | hawker | FSDP-51 | Zi Ying | ✓ |
| GET | `/api/hawker/menu` | hawker | FSDP-53 | Zi Ying | 501 |
| PATCH | `/api/hawker/menu-items/:itemId/sold-out` | hawker | FSDP-53 | Zi Ying | 501 |
| GET | `/api/track/:orderId` | ✓ | FSDP-48 | Zi Ying | ✓ |
| GET | `/api/centres` | – | FSDP-68 | Siyu | 501 |
| GET | `/api/centres/:id/top-dishes` | – | FSDP-22 | Siyu | 501 |
| GET | `/api/stalls` | – | FSDP-11 | Siyu | ✓ |
| GET | `/api/stalls/:id` | – | FSDP-11 | Siyu | ✓ |
| GET | `/api/stalls/:id/menu` | – | FSDP-12 | Siyu | ✓ |
| GET | `/api/stalls/search` | – | FSDP-41 | Siyu | 501 |
| GET | `/api/menu-items/:id` | – | FSDP-12 | Siyu | 501 |
| POST / DELETE | `/api/votes/:photoId` | ✓ | FSDP-22 | Siyu | 501 |
| GET | `/api/centres/:id/collection-points` | – | FSDP-30 | Lennox | 501 |
| GET | `/api/orders/pickup-slots` | ✓ | FSDP-29, 33 | Lennox | 501 |
| POST | `/api/orders` | ✓ | FSDP-14, 65 | Lennox | 501 |
| GET | `/api/orders/mine` | ✓ | FSDP-18 | Lennox | 501 |
| GET | `/api/orders/:id` | ✓ | FSDP-43, 45 | Lennox | 501 |
| POST | `/api/orders/:id/cancel` | ✓ | FSDP-44 | Lennox | 501 |
| POST | `/api/payments/:orderId/nets-qr` | ✓ | FSDP-16 | Declan | 501 |
| GET | `/api/payments/:orderId/status` | ✓ | FSDP-17 | Declan | 501 |
| GET | `/api/photos/item/:itemId` | – | FSDP-34 | Dana | 501 |
| GET | `/api/photos/item/:itemId/top` | – | FSDP-23 | Dana | ✓ |
| POST | `/api/photos/item/:itemId` | ✓ | FSDP-20, 21 | Dana | ✓ |
| DELETE | `/api/photos/:photoId` | ✓ | FSDP-46 | Dana | 501 |

Update the **Status** column when you finish a route.

## Links
[Jira board] · [Figma file](https://www.figma.com/design/HMrIlQdr3NR0NfztB5lc5X)