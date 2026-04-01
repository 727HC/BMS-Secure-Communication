# 01 — CONTRACT

## Focus
Fix the passport detail page (currently renders nothing) and establish the document-layout grammar that all other pages will follow.

## Why this matters
The passport detail is the single most important screen — it IS the battery passport. If this page doesn't work and doesn't feel like a technical certificate, nothing else matters.

## Aesthetic hypothesis
"The passport detail should feel like opening a structured technical dossier — with clear section headers, labeled data fields in a vertical flow, and compliance status shown as authoritative stamps rather than colored badges."

## What screens / flows will change
- passport-detail.js: Complete template rewrite
- index.html: Minor shell adjustments to support document feel

## Completion criteria
1. Passport detail page renders all data (identity, specs, status, DID, BMU records)
2. Information is organized in clear labeled sections with a vertical reading flow
3. Battery identity (model, serial, manufacturer) is immediately prominent at the top
4. Compliance/lifecycle status is visually distinct — not a small colored pill
5. The page does NOT look like a profile card or a generic detail panel
6. Playwright can navigate to the detail page and see content

## Evaluation evidence
- Screenshot of passport detail with data visible
- Verify section headers, data field labels, and values are hierarchically clear
- Verify it doesn't resemble a generic admin detail view

## Risks
- Falling back to "card with fields" pattern
- Making it too sparse/empty in an attempt to be minimal
- Losing functionality while redesigning

## Anti-patterns to avoid this loop
- Profile card layout (avatar + name + bio pattern)
- Tab bar with identical card sections
- Excessive whitespace with no information
- Generic key-value pair styling

## Generator's top 3 AI-fallback risks
1. Turning the detail page into a profile card with tabs and stats cards
2. Using a generic key-value list with rounded cards for each section
3. Making it look like every other "entity detail" page in every SaaS app
