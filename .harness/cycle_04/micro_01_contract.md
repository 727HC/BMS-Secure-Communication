# Micro-loop 01-08 Contract — Cycle 04

This is micro-loops 1-8 of 15 inside cycle 4.
Completing these micro-loops does not complete the cycle.
Completing 15 micro-loops completes only one cycle.

## Focus
Complete readability overhaul across CSS design system and all 10 page templates.

## Aesthetic Hypothesis
"Readable Authority" — raising the entire type scale, fixing Korean font usage, and strengthening contrast will transform the interface from a cramped tiny-text aesthetic into an authoritative, easily scannable product.

## Changes
1. **CSS Design System** (index.html):
   - bp-page-title: 1.5rem → 1.75rem (28px)
   - bp-overline: 0.6875rem mono → 0.8125rem Pretendard (13px)
   - bp-section-title: 0.875rem uppercase → 1.0625rem normal (17px)
   - bp-label: 0.75rem → 0.875rem (14px)
   - bp-body: 0.875rem → 0.9375rem (15px)
   - bp-data: 0.875rem → 0.9375rem (15px)
   - bp-th: 0.75rem → 0.8125rem (13px)
   - bp-stamp: 0.6875rem mono → 0.75rem Pretendard (12px)
   - bp-seal: 0.75rem mono → 0.875rem Pretendard (14px)
   - bp-caption: 0.75rem → 0.8125rem (13px)
   - bp-mono-sm: 0.8125rem → 0.875rem (14px)
   - bp-badge: 0.6875rem → 0.75rem (12px)
   - bp-action: 0.75rem → 0.8125rem (13px)
   - bp-lifecycle-step: 0.6875rem → 0.8125rem Pretendard (13px)
   - bp-table th: 0.75rem → 0.8125rem (13px)
   - bp-table td: 0.875rem → 0.9375rem (15px)
   - Mobile breakpoint sizes raised proportionally

2. **Shell Template** (index.html):
   - Sidebar: w-56 → w-60, header h-14 → h-16
   - Section labels: 11px → 12px, nav items: 14px → 15px
   - User section: 10-12px → 12-13px
   - Topbar: h-12 → h-14, breadcrumb text raised
   - Fabric status: text-xs → text-sm

3. **All 10 Pages**: text-xs → 0.8125rem, text-sm → 0.9375rem, gray-400 → gray-500/600 on readable text, modal inputs and buttons enlarged

## Completion Criteria
- Zero sub-12px font sizes on desktop (except mobile breakpoint stamp)
- All Korean text uses Pretendard
- All readable text achieves minimum 4.5:1 contrast ratio
- Modals have readable input fields and button text
