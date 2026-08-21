# Tzu Chi Moz LMS — v2 (merged system)

This folder merges the two standalone prototypes (`Transportation System/` and `WAREHOUSE SYSTEM/`) into one system with a single login and a shared role model. It's a client-side demo (in-memory data, no backend) — the same status as the two source prototypes.

## v1.7 — decision-oriented executive dashboard for Top Management

- Top Management still holds the exact same permissions and sidebar as the Logistics Department (unchanged from v1.6), but what they land on at Dashboard is now a distinct, decision-focused view instead of the operational one Logistics sees — the same shift-by-shift "Fleet active / Active missions" style numbers don't help someone deciding budget or approvals.
- **Transportation executive dashboard**: KPIs are now Awaiting your sign-off, Committed spend (fuel/maintenance/hire), Service level and Risk exposure. Below that: a direct Approve/Reject table for pending Finance requisitions and hire requests, committed spend by category, demand by department, and a condensed risk & compliance feed.
- **Warehouse executive dashboard**: KPIs are now Awaiting your sign-off (high-value requisitions), Budget used, Service level and Stock value at risk. Below that: a direct Authorise/Reject table for high-value requisitions, budget vs. actual by line, demand by department, the key relief item stock levels panel, and a condensed risk & compliance feed.
- Logistics Department, Administrators and Coordinators are unaffected — they still get the original operational dashboards built around live fleet/stock status.

## v1.6 — Top Management now equal to Logistics Department, mobile layout fix

- **Top Management holds the same permissions as the Logistics Department** in both modules — create, verify/approve, authorise high-value, release, receive, operate and reports/audit are now identical between the two roles, and both get the same full sidebar (Control Tower, Requisitions, Receiving, Movements, Fleet, Dispatch, Fuel, Maintenance, Hire, Compliance, Budget, SOP, etc.), not a cut-down read-only subset. Existing accounts pick this up automatically since permissions are computed from role defaults at load.
- **Fixed the mobile layout.** The topbar (search box, language switch, live-status pill, notification bell) was a single non-wrapping flex row wider than a phone screen, so it overflowed sideways instead of laying out — the actual cause of the app looking broken in a phone webview. It now wraps onto multiple rows below 760px, the search box goes full-width, the live pill hides to save space, and the hub topbar wraps too. Added a global `overflow-x:hidden` safety net and a sub-420px breakpoint for very small phones.

## v1.5 — richer Top Management dashboards, PDF/Excel report downloads

- **Top Management now gets a genuinely detailed picture of both departments**, not just headline KPIs. Transportation's executive dashboard adds a full fleet composition table (plate, vehicle, driver, status, fuel, odometer), a requests-by-stage breakdown chart and driver rest-compliance visibility — the same depth of detail Logistics sees, still read-only.
- **Warehouse now gives Top Management the Inventory and Warehouses screens** (previously Logistics-only), plus a new "Key relief item stock levels" panel on the dashboard showing on-hand quantity for the main relief products — rice, tarpaulins, blankets, mosquito nets, hygiene kits, first aid kits, school kits, pallets — each with a progress bar against reorder level, so anyone landing on the dashboard sees what's actually in stock, not just an aggregate MZN value.
- **Download reports as PDF or Excel.** Both modules' dashboards (visible to anyone holding the "View Dashboards & Reports" permission — Top Management, Logistics and Administrators by default) now have Download PDF / Download Excel buttons. Excel export is a real `.xls` workbook (multi-sheet-style sectioned tables); PDF export is generated client-side with jsPDF + autotable — no server round-trip, no data leaves the browser.

## v1.4 — driver leave, real per-user permissions, multi-language, AI assistants

- **Driver leave requests.** Drivers submit a leave request (type, dates, reason) from My Tasks and see their own history there; the Logistics Department reviews and approves/rejects from Driver Compliance. Demo data covers pending, approved and rejected cases across several drivers. (Marking missions complete already existed via the trip logbook flow — "Complete trip" on each task card.)
- **Real per-user permissions.** Every account now carries its own editable permission set (`PERM_CATALOG` in `app.js`) instead of a fixed role table — a System Administrator can grant or revoke Create/Approve/Authorise-High-Value/Release/Receive/Operate/Reports/Audit/Manage-Users per person from Admin ▸ User Accounts, in an Add/Edit form (name, username, email, phone, role, department, position, status, password, permission checklist) with working Add and Remove. Role still picks the starting defaults and still gates which *module* someone can enter.
- **Three working languages: English, Portuguese, Traditional Chinese.** A language switcher (top-right of login, hub and every module) drives the login screen, hub, sidebar/topbar chrome, role names and every navigation label/subtitle across all three modules — saved to `localStorage`. Deep in-screen content (table data, demo record text, long SOP prose) stays in its authored language; translating thousands of data strings three ways is future work, not something faked here.
- **AI Assistant for both modules.** A floating assistant answers questions about live data and procedures — vehicle/item status, requisition/trip lookups by ID, Karan balance, low stock, held containers, leave, role permissions, SOP explanations (24-hour rule, WH-SOP-01/02, logbook audits, emergency protocol) and navigation help. It's a local pattern-matching engine over the data already in the browser, not a live model call — no API key, no network dependency, and it never invents a figure it can't point back to.

## v1.3 — branding, live maps, drill-down KPIs

- **Real logo.** The Tzu Chi Moçambique emblem (`tzu-chi-logo.jpg`) now appears in the login screen, the hub, and the sidebar, replacing the placeholder "TZ" mark.
- **Palette re-derived from the logo.** `--navy`, `--blue` and `--teal` (used as the light-blue accent) were re-picked to match the emblem's deep-navy-shield / steel-blue-wing tones instead of the brighter generic SaaS blue/teal this started with; the unrelated purple/sand accents used for module icons were dropped in favour of navy/blue variants, so the brand reads as one consistent blue family rather than a five-color demo palette.
- **"TransportOps" renamed to "Transportation"** throughout the module shell.
- **Warehouse inventory now shows real photographs** — one representative, Wikimedia Commons–sourced photo per item category (food, shelter, hygiene, medical, education, equipment), as a thumbnail in the Inventory table and a larger captioned photo in the item detail drawer. These are category-representative stock photos, not photos of the exact SKU, and are labelled as such.
- **Fixed map drift.** The fleet and warehouse maps were an OpenStreetMap iframe with markers pinned by screen-percentage on top of it — zooming or panning the iframe moved the tiles but not the overlaid pins. Replaced with a real Leaflet map (CDN, no API key) plotting markers by actual latitude/longitude, so zoom and pan now move correctly together. The Nhamatanda pin's plus-code-verified coordinates are untouched.
- **KPI cards are now clickable drill-downs** on both modules' Dashboard and Control Tower — Critical/High priority/etc. open a detail drawer listing what's behind the number, with a jump-to-screen action; simpler ones (Fleet active, Below reorder) navigate straight to the relevant filtered view.

## v1.1 refresh

- **Sidebar restyled** to match the Warehouse System prototype's identity: nav items are grouped under mono, uppercase section headers (Overview / Operations / People / Finance / Reports / Administration), badge pills use the sand accent instead of a plain red dot, and IBM Plex Mono is now used for eyebrows, KPI figures and table headers throughout — the same systemic feel, applied consistently to Transportation, Warehouse and Admin.
- **Topbar search** — every list view now has a live filter box (`#gsearch`) that hides non-matching table rows as you type; it resets automatically when you switch views.
- **Warehouse now has a map.** The Warehouse dashboard plots Kura Warehouse (Beira), Maputo Central Store and Nhamatanda Field Store on a Mozambique-wide OpenStreetMap embed, colour-coded green/red by whether that store has anything below reorder level, with a per-store SKU/value/low-stock table beneath it — mirroring the Transportation fleet map rather than just bolting one on.
- **Both module dashboards carry more data** now: Warehouse's dashboard combines the map, a per-store summary table, the low-stock list and the requisition pipeline in one view instead of two disconnected panels.

## What changed from v1

- **One login, one user directory.** `app.js` defines a single `USERS` list and role set instead of the two separate demo rosters the old prototypes had.
- **Roles now match `USERS.png`:** System Administrator, Logistics Department, Top Management, Coordinator — plus **Driver**, added as a fifth, Transportation-only role per your request. Driver replaces the old scattered "Transport Coordinator / HR Officer / Warehouse Manager / Storekeeper" roles, which are folded into **Logistics Department** ("manages everything operational").
- **Driver dashboard is single-purpose**, as asked: after login a Driver goes straight to "My Tasks" — their assigned transport requests and a notification banner — with no hub, no other nav items, no way to wander into other screens.
- **Post-login hub.** Every other role lands on a hub screen with modules shown side by side (Transportation, Warehouse & Procurement, and — for the Administrator only — System Administration), each with a quick live-stat preview. Clicking a module enters its dashboard; a role that can't use a module sees it locked with a reason instead of just being hidden.
- **Permissions are enforced per module**, not just per app: e.g. Top Management is view-only in both modules except for authorising items above the 50,000 MZN threshold (mirrors the DB-level rule already in `database/schema.sql`), Coordinators can only create/track their own requests, and the warehouse requisition chain (`SUBMITTED → VERIFIED → AUTHORIZED → RELEASED → RECORDED`, from `WH-SOP-01`) is enforced in the UI's available actions per role.
- **One shared design system** (`styles.css`) so Transportation and Warehouse look like one product, not two stitched-together apps.

## File structure

```
TZU CHI MOZ LMS V2/
├── index.html      # login + hub + module shell (all screens live here)
├── styles.css       # shared design system
├── app.js           # users, roles, permissions, login, hub, module router
├── transport.js     # Transportation module (T namespace)
├── warehouse.js      # Warehouse & Procurement module (W namespace)
├── admin.js          # System Administration module (A namespace)
└── README.md
```

## Demo accounts (password shown on the login card)

| Role | Name | Module access |
|---|---|---|
| System Administrator | Arcélio Chiulele | Hub only; Admin console; read-only dashboards in both modules |
| Logistics Department | Fernando Graça Cossa, Luísa Sheila Chambal | Full operational control — both modules |
| Top Management | Augusto Chissano | View-only both modules; approves above threshold |
| Coordinator | Ana Mucavele, Samuel Machava, Paula Matola | Self-service requests, own records only, both modules |
| Driver | José Joaquim, Carlos Mussa, Lina Macuacua | Transportation "My Tasks" only — no hub |

## Known simplifications (flagged, not hidden)

These are deliberate v1 shortcuts — say the word and any of them can be built out next:

1. **Warehouse operational sub-roles collapsed.** The original warehouse prototype had `warehouse_manager` / `storekeeper` / `logistics_coordinator` as separate roles with separate verify/release permissions. They're now all under **Logistics Department**. If Tzu Chi wants that separation back (e.g. a Storekeeper who can release but not authorise), it needs its own role.
2. **HR/compliance folded into Logistics Department**, not a standalone HR Officer role — the driver work/rest compliance screen still exists (Transportation → "Driver Compliance") but there's no dedicated HR login.
3. **No cross-module data linkage yet.** A vehicle in Transportation and a `Logistics & Warehouse` requisition in Warehouse don't reference each other (e.g. fuel purchased via a warehouse requisition isn't reflected on the vehicle's fuel log). `SPEC.md`'s `ExpenseRecord` concept would be the place to wire that up.
4. **No offline/sync handling** in this merged build yet — `SPEC.md` §7 calls for local caching + sync-on-reconnect; the Warehouse prototype had a storage-probe pattern (`window.storage` / `localStorage`) worth carrying over.
5. **Still entirely client-side/demo data** — matches `SPEC.md`'s intended Node/Express + PostgreSQL backend only in shape (roles, statuses, thresholds), not in implementation.
