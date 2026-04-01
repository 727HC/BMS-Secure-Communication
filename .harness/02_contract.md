# 02 — CONTRACT

## Focus
Increase data density on passport detail + redesign navigation as a dossier index + fix dashboard to match the document metaphor.

## Why this matters
Loop 1 established structure but was too sparse. A real technical certificate packs information densely. Also, the rest of the app (sidebar, dashboard) still uses generic patterns that clash with the dossier detail page.

## Aesthetic hypothesis
"The entire app shell and dashboard should feel like a document management system for technical records — not a SaaS admin panel with a sidebar."

## What screens / flows will change
- passport-detail.js: Tighten spacing, improve status stamp, fix lifecycle
- dashboard.js: Replace KPI cards with a registry summary view
- index.html: Rethink sidebar as a document index

## Completion criteria
1. Passport detail sections have reduced padding — more data visible per viewport
2. Status in header looks like an official stamp (not just a bordered box)
3. Dashboard does NOT use the 4-KPI-card pattern
4. Sidebar navigation items are text-focused, not icon+label pairs

## Evaluation evidence
- Screenshots showing data density improvement
- Dashboard without KPI cards
- Sidebar without generic icon patterns

## Risks
- Over-tightening spacing could hurt readability
- Removing all icons from sidebar could confuse navigation
- Dashboard redesign might lose functionality

## Anti-patterns to avoid this loop
- KPI stat cards in a row
- Icon-heavy sidebar navigation
- Card-based dashboard sections
- Generic "recent activity" table

## Generator's top 3 AI-fallback risks
1. Replacing KPI cards with slightly different KPI cards
2. Making sidebar "minimal" but still using the same icon+label structure
3. Tightening spacing but keeping the same layout logic
