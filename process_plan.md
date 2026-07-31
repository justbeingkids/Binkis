# Binkis — Process Plan & Progress

> Cross-session handoff document. Captures what's built, what's pending, the
> decisions still owed by the client, and the environment/coordination notes
> needed to continue. Keep this updated as work progresses.

**Product:** QR-hologram raffle / collectible system. Physical "Limited Edition"
pieces carry a unique code (`BNK-XXXX-XXXX`). Customers scan → learn win/lose →
winners claim (name/email/phone/address) → get a character prize + loyalty
points. Admin dashboard manages codes, the draw, characters, winners, customers,
scans, and points.

**Ownership split:**
- **This side (backend + admin dashboard):** everything in `app/(admin)`, the API
  routes, the Supabase schema/logic.
- **Other dev (MIMIC — customer-facing):** `/v`, `/claim`, hologram animations,
  and the Shopify storefront.

---

## Status legend
✅ done & pushed · 🟡 needs a client/business decision · ⚪ optional / later

---

## ✅ Completed

### Admin redesign (all pages)
- **Design system:** Geist / Geist Mono fonts, zinc palette, near-black primary
  (`accent`), indigo `brand` accent, status green/amber/red. Tokens remapped in
  `tailwind.config.ts` **keeping the same names**, so pages adopted the look with
  no class rewrites.
- **Shell:** `Sidebar` (wordmark, collapse rail, flat nav, user footer),
  single-viewport frame (`h-screen`, no page scroll), per-page `Topbar`
  (title + `Inicio › …` breadcrumb + action). Shared nav config in `lib/nav.ts`.
- **Principle:** fit one screen at ≥1024×768 (fixed frame; data tables scroll
  **internally**), responsive on mobile, no hard-coding.
- **Pages:** Resumen (Overview: KPI row + Actividad reciente table), Códigos
  (CodesExplorer toolbar), Generar (form + Vista previa), Sorteo (centered draw
  card + results), Personajes (card grid + edit/delete/upload dialogs),
  Verificar, Ganadores, Cuenta.

### Backend features
- **Scan logging** — `scan_requests` table + `recordScan()`; `GET /api/codes/validate`
  records **every** scan (result + is_winner + ip/geo/user-agent), winner or not.
  Admin **Escaneos** page (`/escaneos`).
- **Prize awarded at win moment** — `assignCharacter()` moved from claim to the
  win-confirmation scan (`/api/codes/validate`). Idempotent per code; the prize
  is returned in `ValidationResult.character`. Claim no longer assigns (no
  duplicate award); it only records shipping details + loyalty.
- **Customers (one person → many cards/characters)** — `customers` table
  (email identity, `tier`, `shopify_customer_id` placeholder) + `codes.customer_id`
  FK + `link_customer()` SQL fn, called by `linkCustomer()` at claim. Admin
  **Clientes** page (`/clientes`): each person, win count, their characters, tier.
- **Loyalty balances** — existing `loyalty_accounts` / `loyalty_transactions` /
  `add_loyalty_points()`; `winner_bonus` granted at claim. `getLoyaltyAccounts()`
  + admin **Puntos** page (`/puntos`).

### Character assignment mechanism (existing, confirmed correct)
- `assign_character()`: weighted-random draw over active, in-stock characters via
  `order by -ln(random()) / win_probability` (proportional selection, equivalent
  to roulette-wheel CDF). Idempotent per code (row lock + `character_id` check).
- `recompute_win_probabilities()` runs after each award and after admin edits:
  `win_probability = weight × remaining ÷ Σ(weight × remaining)` over active
  in-stock characters. So odds drift as stock depletes ("rotation" as recompute).

---

## Loyalty program — CONFIRMED by David Vargas (2026-07-31)

**Model:** points-based collector tiers, earned by **purchases only**.
- **Earning:** 1 point per Binkis piece bought online; **complete collection =
  13 points (8 + 5 bonus)**. Winning a Limited Edition grants **NO points** — its
  value is the rare find / an exclusive experience.
- **Tiers** (thresholds + permanent, cumulative benefits):
  - **Collector — 20 pts** → free classic BINKIS figure
  - **Elite Collector — 30 pts** → Premium Display Case at $49 MXN (1 piece)
  - **Founder Reserve — 40 pts** → lifetime VIP / permanent Founders Reserve
- **Split:** backend owns **balance, level, unlocked benefits, eligibility**;
  **Shopify** only applies the discount / enables the free product.

### ✅ Done for this model
- `lib/loyalty-tiers.ts` — single source of truth (`TIERS` + `tierForPoints()`
  → current tier, unlocked benefits, next tier, points-to-next).
- **Winner bonus removed** from the claim route (points are purchases-only);
  `WINNER_BONUS_POINTS` config deleted.
- Puntos admin view shows the computed **Nivel** + Collectors / Founder KPIs.
- Removed the old (win-count) tier column/filter from Clientes (tier is
  point-based now; `customers.tier` column is legacy/unused).

### 🟡 Remaining (needs Shopify)
- **Earning trigger:** a Shopify **order webhook** → an inbound endpoint that
  calls `addPoints(email, n, "purchase")`. Needs the Shopify integration + a
  way to authenticate the webhook.
- **Loyalty status endpoint** (the store's contract): `email → { points, tier,
  benefits, eligibility }`, for Shopify to read and apply perks. Needs a store-
  facing auth scheme (API key), so deferred with the Shopify work.
- **Redemptions** (free figure / display-case price / VIP) happen in Shopify;
  backend exposes eligibility.

### Factory export QR URL
`app/api/codes/export/route.ts` prints `/claim?code=`. Canonical customer URL may
be `/v/{code}`. Confirm with the frontend dev which the holograms should carry
(gets physically printed) → one-line change + optional 301.

### Reserve-on-scan lock (deferred)
Today an unclaimed winning code shows "You won" to **anyone** who scans it; only
after the claim form is submitted does it show "already claimed" to everyone.
If a "first scanner locks it" behavior is wanted, decide how to identify the
first scanner (device/session cookie, or a "reserved" code state).

---

## ⚪ Optional / later

- **Shopify integration** (redeem points, `characters.variant_id` → product
  mapping, customer sync). Recommended: build behind a **typed adapter + mock**
  so downstream logic and MIMIC's storefront integrate against a stable contract;
  connect the real client last. Needs: store creds + API scopes, and the
  redemption mechanism decision (discount code / store credit / gift card).
- **Digital character file** in the app after a win (mirror the printed BINKIS
  FILE: first appearance, powers, trivia). Currently a win reveals only the
  character name.

---

## Architecture & environment notes
- **Repo location:** `d:\Projects\Binkis` (was `e:` in an earlier session). On
  `main`, synced with `origin` (github.com/justbeingkids/Binkis).
- **No `.env` in this checkout** → only `npm run typecheck` works locally; a full
  `next build` / run fails at Supabase env validation. Verify against a real
  Supabase project.
- **Node not on PATH by default** in this shell — prefix with
  `$env:Path = "C:\Program Files\nodejs;" + $env:Path` before `npm`.
- **Vercel deploy gating:** deploys blocked unless XAutoSolution has Vercel
  project access (client must grant).
- **Middleware gate:** admin routes are protected by an **explicit allow-list**
  `ADMIN_PROTECTED_PREFIXES` in `middleware.ts`. **Any new admin route MUST be
  added there**, or it is publicly accessible.
- **Schema migrations:** `supabase/schema.sql` is idempotent (`if not exists`).
  Run it in the Supabase SQL editor to apply new tables/columns/functions
  (`scan_requests`, `customers`, `codes.customer_id`, `link_customer`).
- **Award-at-scan** lives in `/api/codes/validate`. If the customer frontend
  reveals wins via the `/v/[code]` **page** (server render, uses `findCode`
  directly) instead of the validate API, add the same `assignCharacter()` call
  there so the award still fires at the win moment.

---

## Key files
| Area | Path |
|---|---|
| DB schema + SQL functions | `supabase/schema.sql` |
| Admin nav config | `lib/nav.ts` |
| Route protection | `middleware.ts` |
| App config (points, uploads) | `lib/config.ts` |
| Scan validation + award | `app/api/codes/validate/route.ts` |
| Claim (details + loyalty) | `app/api/codes/claim/route.ts` |
| Customers logic | `lib/supabase/customers.ts` |
| Loyalty logic | `lib/supabase/loyalty.ts` |
| Scan log logic | `lib/supabase/scans.ts` |
| Codes / metrics | `lib/supabase/codes.ts` |
| Characters / assignment | `lib/supabase/characters.ts` |

---

## Recommended next steps (in order)
1. **Founders Reserve** — get the threshold-vs-cost answer, wire eligibility into
   `link_customer`, expose on Clientes/Puntos.
2. **Set `WINNER_BONUS_POINTS = 20`** once design is final.
3. **Lock the factory QR URL** (`/v/{code}` vs `/claim?code=`).
4. **Shopify adapter + mock** so the loyalty redemption / early-buy contract is
   ready before creds arrive.
