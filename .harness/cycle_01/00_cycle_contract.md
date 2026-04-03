# Cycle 01 Contract — CSS Consolidation & Design System Foundation

## Cycle Objective
Eliminate all in-component `<style>` blocks and inline styles. Every visual property must come from the global design system in index.html. This is the foundation — without it, every future cycle will be undermined.

## Why This Cycle Matters
The current codebase has 769 inline styles vs 230 class usages. Components re-declare sn- classes with conflicting values. Until this is fixed, no design change will be consistent.

## Expected Movement
From: fragmented inline styles per component
To: single source of truth in index.html CSS

## Cycle Hypothesis
Consolidating all styles into the global design system will make the UI more consistent AND reveal structural sameness that needs to be fixed in subsequent cycles.

## Visible Improvement by End
- Zero `<style>` blocks inside component templates
- Inline `style=""` count reduced by 50%+
- All pages render correctly using shared classes
- Consistent typography, spacing, and color across all pages

## Risks
- Breaking component rendering by removing inline styles without equivalent global classes
- Accidentally deleting functionality while refactoring templates

## Direction: BUILD FOUNDATION
