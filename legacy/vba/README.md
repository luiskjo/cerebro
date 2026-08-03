# Legacy Excel Material Management — `Add_PO` macro

This folder holds the VBA for the **pre-Cerebro** Material Management Log workbook
(Colt Builders). It is kept here so the spreadsheet stays usable on active
projects until they transition to the Framing Material Control app.

- `Add_PO.bas` — drop-in replacement for the original `Add_PO` macro.

## Why the old macro froze Excel

Six separate problems, in rough order of impact:

**1. `ScreenUpdating`/`DisplayAlerts` were never restored on early exits.**
The macro turned the screen off at the top and only turned it back on at the very
bottom. Cancelling the file dialog, closing the material-type form, hitting "No
valid materials found", or *any* runtime error jumped straight past the restore.
Excel was then left with drawing disabled, alerts suppressed, and the sheet
unprotected — it looks like the whole machine has locked up. This is the single
most likely cause of what you were seeing, because it needs no big PO at all;
one cancelled dialog does it.

**2. Per-cell clipboard formatting.**
```vba
For row = 7 To lastRow
    For col = 12 To destCol
        wsDest.Range("K6").Copy
        wsDest.Cells(row, col).PasteSpecial xlPasteFormats
```
That is one Windows clipboard round trip per cell. On the sheet in your
screenshot (≈600 material rows × ~20 PO/CO columns) it is ~12,000 copy/paste
operations, plus one for column J on every row. Each one also churns the
clipboard globally, which is why other apps get sluggish while it runs.

**3. Calculation was left on `automatic`.**
Every row insert, every paste, every value write triggered a full recalc of a
sheet whose D–I columns are all formulas. Combined with #2 this is multiplicative.

**4. Events were left enabled.**
Every single write fired the workbook's `Worksheet_Change` handlers. If any of
them writes back to the sheet, you get re-entrant event storms — a genuine hang
rather than just slowness.

**5. One `Rows.Insert` per material.**
Each insert shifts everything below it and reformats/recalculates. 200 new
materials = 200 inserts + 800 clipboard operations.

**6. Correctness bugs that made the output wrong even when it finished.**
- `materialDict` cached row numbers *before* the inserts, then wrote quantities
  using those stale numbers — so after the first insert, quantities landed on
  the wrong rows.
- `codeDict` was never updated with newly created codes, so the
  `Do While codeDict.exists(groupCode & "." & matIndex)` loop always settled on
  `matIndex = 1`. Every material added to an existing group got the same item
  code (`3.1`, `3.1`, `3.1`, …).
- `codeDict` keys were built with `CStr(cell.Value)`, which yields `"1"` for a
  numeric `1.0`, so the group-code search never matched numeric codes.
- `wsDest.Columns(destCol).ColumnWidth = 200` set the new column 200 characters
  wide, then a later loop reset it to 15 — the wide state was live for the whole
  slow part of the run, forcing constant re-layout.
- `wsSource` was closed before `materialList.Count` was checked, but the sheet
  was left unprotected on that exit path.

## What the rewrite does

| Area | Before | After |
|---|---|---|
| UI state | restored once, at the end | saved/restored on **every** exit path incl. errors (`FreezeApp`/`ThawApp`) |
| Prompts | forms shown with screen frozen | all forms/MsgBoxes shown with the UI live |
| Formatting | ~12,000 clipboard ops | 2 ops per contiguous run of material rows (typically < 50 total) |
| Calculation | automatic throughout | manual during the import, restored after |
| Events | enabled | disabled during the import, restored after |
| Row inserts | one per material | one block insert for all new rows |
| Source read | 2 COM calls per row | one bulk array read per column |
| Row bookkeeping | stale after inserts | adjusted for the shift; item codes tracked per group |
| Duplicate line items | last one wins | summed |
| Material matching | case-sensitive exact | case-insensitive (`Trim` + text compare) |
| `RefreshVendorDropdown` failure | aborts the run | ignored; the import is already committed |

Behaviour that was deliberately kept identical: sheet/row/column layout, the
`K6`/`J6`/`B6:I6`/`D6:I6` template sources, group-header styling, hidden item-code
font colour, the boundary column, protection password, and the merged-cell rule
for reading source descriptions.

One added convenience: if a source file has **no** merged description cells but
does have rows that otherwise look valid, you get a Yes/No prompt instead of a
flat "No valid materials found."

## Installing

1. Open the workbook → `Alt+F11`.
2. Back up the current module first (right-click `modAddPO` → *Export File…*).
3. Delete the old `Add_PO` procedure (or the whole module), then
   *File → Import File…* and pick `Add_PO.bas`.
4. `Debug → Compile VBAProject` — it must compile clean.
5. Re-point the "Add PO" button to `Add_PO` if you replaced the whole module.

### Required one-line change in the two user forms

VBA destroys a form's state when the form does `Unload Me`. Reading
`poSelector.SelectedOption` *after* that silently creates a brand-new, blank
form instance — which is why a cancelled or oddly-closed form can read back as
`""` even when you picked something.

In **both** `frmSelectPOType` and `frmSelectMaterialType`, change the OK/close
handlers from:

```vba
Unload Me
```
to:
```vba
Me.Hide
```

The calling code (`AskPOType` / `AskMaterialType`) unloads the form itself once
it has read the value. If either form is cancelled with the X button, the value
reads back empty and the import is abandoned cleanly.

### If Excel is ever left frozen again

Run `Unfreeze_Excel` (in `modAddPO`) from the VBA immediate window or a button.
It restores `ScreenUpdating`, `EnableEvents`, `DisplayAlerts`, `Calculation`,
the cursor and the status bar.

## Not covered here

Only `Add_PO` was rewritten. The same freeze pattern (no error handler, no
`EnableEvents`/`Calculation` guard, per-cell clipboard work) very likely exists
in the other macros in the workbook — `New Delivery`, `Sort material`,
`Merge materials`, `Delete empty Mat`, `Change Section`, `Modify Delivery`,
`RefreshVendorDropdown`. Send the full workbook and those can be audited and
fixed the same way.
