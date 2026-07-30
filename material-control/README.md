# Material Control

A construction material management system: import a takeoff and the purchase
orders behind it, stage material to site by section, record what arrives and
what gets used, and find out you are short *before* the crew does.

Standalone React + TypeScript app. No backend, no accounts — everything lives in
the browser and exports to JSON.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 73 engine tests
npm run build
```

The app opens on a seeded demo project (Aspen Ridge Apartments). **Settings →
Start empty** clears it; **Load demo project** brings it back.

---

## The problem it solves

Five numbers live in five different places on a job: what the takeoff calls for,
what was bought, what was delivered, what is physically on the ground, and how
much of the work is actually built. Everything expensive hides in the gaps
between them.

The system reconciles all five against one another and reports the consequences.

### Usage is derived, never typed

Nobody records what a crew consumed. So the system computes it:

```
used      = delivered − counted on hand
expected  = takeoff × percent built
burn rate = used ÷ expected
forecast  = used ÷ percent built        (projected to 100%)
```

That is why **the inventory count and the progress update happen on the same
walk** — a count without a matching progress figure measures the burn rate
against the wrong denominator.

The payoff is the case a quantity check cannot see. In the demo project the
studs are **over-bought by 85 pieces against the takeoff and still forecast 134
short**, because the crew is burning 17% faster than the estimate allowed. A
plain takeoff-versus-PO comparison says everything is fine.

---

## Correlating takeoff wording with purchase-order wording

The takeoff says `2x4x10 (PET 116 5/8") DF#2`. The vendor's PO says
`2x4x116 5/8" DF2`. Same stick. Every description is reduced to a canonical
signature:

```
2x4x10 (PET 116 5/8") DF#2  ─┐
                             ├─►  2X4 | 116.625 | DF2 | NONE
2x4x116 5/8" DF2            ─┘
```

- A **parenthetical length wins** over the nominal one — `10'` stock trimmed to
  116-5/8" is a 116-5/8" stick.
- A bare number is **feet up to 30, inches above** — `2x4x10` is a ten-footer,
  `2x4x116` is not.
- Grade punctuation collapses: `DF#2`, `DF 2` and `DF2` agree.
- **Treatment is a hard gate.** PT, FRT and untreated stock never merge, however
  alike the text reads.

Identical signatures merge silently on import. Everything else becomes a
**proposal the user confirms**, because a wrong merge corrupts the takeoff, the
drops and the cost report at once. Proposals are scored by dimensional match,
shared catalogue number (`SIMPSON HDU5-SDS2.5` ↔ `HDU5-SDS2.5 Holdown`), or text
similarity that understands abbreviations (`SHTG` ↔ `Sheathing`).

Accepting a match **keeps the purchase-order wording** and files the takeoff
wording as an alias, so ordering, receiving and cost all speak the vendor's
language.

Two deliberate non-merges, both of which cost money if you get them wrong:

- `7/16" OSB 4x8` and `23/32" OSB 4x8` share a sheet size but are different
  panels — a dimensional key needs a cross-section **and** a length.
- `FRAMING` is not fire-retardant, so `FRT` detection never matches a bare `FR`.

---

## Screens

| Screen | What it answers |
|---|---|
| **Overview** | What needs a decision today, ranked |
| **Import** | Load takeoff / PO / CO from Excel or CSV with column mapping |
| **Materials** | Groups and subgroups, aliases, merges, and cleanup |
| **Correlation** | Which takeoff wording means which PO wording |
| **Coverage** | Does what we bought cover what the drawings call for |
| **Drops** | Stage material to site by section and level |
| **Drop tracking** | Percent delivered per material, total and per section |
| **Deliveries** | Vendor, BOL, date, quantities — searchable and editable |
| **Progress & inventory** | Update progress and count stock, together |
| **Prediction** | Forecast usage; flag over and short; cut-down suggestions |
| **Cost & vendors** | Committed vs received vs paid, per vendor and per order |
| **Settings** | Project, sections, vendors, export and restore |

### Material grouping

```
Lumber      Studs · FRT Studs · Regular Lumber · PT Lumber · FRT Lumber · EWP
Sheathing   Regular Sheathing · FRT Sheathing · PT Sheathing
WRB · Siding · Firewall · Hardware · Other
```

Assigned automatically on import from the description, and overridable per
material.

---

## How the other pieces behave

**Section drops** are planned against what an area *still needs* — takeoff, less
what already landed there, less what other open drops already promised — so
re-planning after a partial delivery never double-orders.

**Deliveries** carry vendor, BOL number, date and quantities. Only vendors with
a PO or CO can appear, and a ticket can only carry material that vendor was
actually bought from, so every ticket reconciles against a commitment. Lines
assigned to a section drive the per-section percentages; unassigned lines count
as yard stock and are flagged so the numbers are never quietly wrong.

**Cut-down suggestions** pair a forecast shortage with surplus longer stock of
identical section, species, grade and treatment, and show the yield and the
waste per cut (`68 × 2x4x20' → 136 × 2x4x116 5/8"`, 6.75" drop each). They are
**proposals only** — the system never applies one.

**Cleanup** surfaces material bought in preconstruction and fully credited back
on a change order: no takeoff, no live order, no delivery. It suggests deletion
and never deletes on its own. Material still in the takeoff is never an orphan —
that is a purchasing gap, which is Coverage's job.

**Cost** keeps three numbers apart, because confusing them is how vendors get
overpaid:

```
committed  value of every PO and CO issued, credits included
received   material actually delivered, at the order price
paid       cash that has left
```

Owed today is `received − paid`. Left to spend is `committed − received`. A
material whose received value runs past its commitment is flagged.

---

## Architecture

```
src/
  types.ts          domain model
  seed.ts           demo project, built to exercise every path
  store.ts          pure reducer + localStorage + JSON import/export
  engine/           no React, fully testable
    naming.ts       description parsing and canonical signatures
    classify.ts     group / subgroup assignment
    matching.ts     correlation proposals and merges
    rollup.ts       the five-number reconciliation and forecast
    drops.ts        drop planning and delivery progress
    substitution.ts cut-down suggestions
    cost.ts         vendor and order balances
    hygiene.ts      orphan and duplicate detection
    alerts.ts       ranked, consequence-first alerts
  importing/        workbook reading and column mapping
  views/            one file per screen
```

The engine is pure functions over a state snapshot and never reads the system
clock — the reference date lives on the project record, so every calculation is
deterministic and testable. Swapping localStorage for an API touches only
`store.ts`.

## Known limits

- Single user, single browser. Export before switching machines.
- Delivery value is attributed to orders oldest-first when a ticket does not name
  a PO; naming the order on the ticket is exact.
- The burn-rate forecast needs ≥5% progress and some actual consumption before it
  extrapolates — below that it falls back to the takeoff.
