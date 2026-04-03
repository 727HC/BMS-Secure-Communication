# Cycle 03 — Passport Detail as Technical Certificate

## Objective
Transform passport-detail from a generic admin page into a recognizable technical certificate document. The user should feel like they're reading a formal compliance dossier, not browsing a dashboard.

## Hypothesis
Adding certificate-style visual elements (section stamps, fill-state indicators, compliance grade prominence, lifecycle rail) will make the passport detail page feel domain-specific and different from every other page in the system.

## Key Changes Planned
1. Header: model name + status as a formal certificate header with document number
2. GBA-21 compliance: make the fill percentage and grade (A/B/C/D) the most prominent element
3. Identity fields: dense two-column grid with field labels above values (not cards)
4. Lifecycle rail: horizontal timeline showing current stage prominently
5. Tab content: each tab should feel like a different section of the same certificate

## Risks
- Over-decorating into "stamp/seal" territory (previous cycles failed with this)
- Breaking the 13 modals while restructuring template
- Making it too document-like at the expense of usability

## Direction: PIVOT — from generic admin to certificate metaphor
