# Micro-loop 01 Contract — Dashboard CSS Consolidation

This is micro-loop 1 of 15 inside cycle 1.
Completing this micro-loop does not complete the cycle.
Completing 15 micro-loops completes only one cycle.

## Focus
Remove the `<style>` block from dashboard.js template and replace all inline styles with global CSS classes.

## Why This Matters
Dashboard has the worst case: 80+ lines of re-declared CSS inside its template (lines 136-215) that override the global design system.

## Aesthetic Hypothesis
Using consistent global classes instead of per-component overrides will make the dashboard visually coherent with the rest of the app.

## Screens Changed
- Dashboard page

## Completion Criteria
- Zero `<style>` tags inside dashboard.js template
- All dashboard elements use global sn- classes from index.html
- Dashboard renders correctly with data visible
- Inline style="" count in dashboard.js reduced by 50%+

## Evaluation Evidence
- Playwright screenshot of dashboard after changes
- grep count of `style="` before and after

## Risks
- Dashboard already has rendering issues (blank page with opacity:0)
- Removing inline styles may break layout

## Anti-patterns to Avoid
- Adding new inline styles to fix what removing old ones broke
- Creating dashboard-specific CSS classes (use global only)
