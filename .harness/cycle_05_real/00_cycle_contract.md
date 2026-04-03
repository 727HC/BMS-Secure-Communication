# Cycle 05 — STRUCTURAL REDESIGN (not CSS polish)

## What we're REMOVING (80%+)
- Dashboard: metrics strip + flat table layout
- Passports: flat table-only view
- Navigation: horizontal link list pattern
- Passport detail: tab-based content hiding
- Every page's "title + table" skeleton

## What we're BUILDING NEW
1. Dashboard → Status kanban board (columns per lifecycle stage)
2. Passports → Grid card view with visual indicators (SOC gauge, GBA score, status)
3. Passport detail → Single-scroll certificate document (no tabs hiding content)
4. Navigation → Contextual with role indicator

## Why this is NOT CSS
- Kanban board = completely different DOM structure from a table
- Card grid = different from table rows
- Scroll document = different from tabbed panels
- Every major template is being rewritten, not restyled

## FAIL criteria
- Screen skeleton looks the same as before
- Only card arrangement changed slightly
- Color/spacing/typography is the main difference
- User flow is identical to previous
