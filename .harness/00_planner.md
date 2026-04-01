# 00 — PLANNER

## Current Diagnosis

### What's broken

1. **Passport detail page is completely empty.** The most important screen in the entire product renders nothing. This is a critical functional failure before any design discussion.

2. **The UI has no domain identity.** Remove the word "Battery" from the sidebar and this could be any admin panel for any product. There is zero visual language that communicates traceability, provenance, compliance, or lifecycle management.

3. **Classic AI-generated layout syndrome.** Left sidebar with icon+label nav, top bar with breadcrumb, content area with cards/tables. This is the exact template every AI generates. It communicates nothing about the product.

4. **Mixed visual states.** Login page uses editorial dark (#1a1814 + lime), dashboard uses half-light-half-dark, passports list uses light with dark remnants. No coherent system.

5. **KPI cards pattern.** Dashboard shows 4 big numbers in a row — the single most common AI dashboard pattern. It says "I am a generic dashboard" immediately.

6. **Data presentation is flat.** The passport list is a flat table with no hierarchy. Every row looks identical. There's no sense that each passport is a living document with a lifecycle, compliance status, and provenance chain.

7. **Typography has no conviction.** Font sizes, weights, and spacing don't create a clear reading hierarchy. Labels and values have similar visual weight.

### Why it feels AI-generated

- Sidebar + topbar + cards is the default AI layout
- No information architecture — just pages with tables
- No visual metaphor — nothing communicates what this product is about
- Components are generic (cards, badges, tables) without domain-specific grammar
- Color choices are arbitrary rather than meaningful
- Every page follows the same pattern: header → filter → table/cards
- Empty states, loading states, and transitions feel like afterthoughts

## Chosen Metaphor

**Technical Certificate System**

Battery Passport is fundamentally a system of **certificates and dossiers**. Each battery has a passport — a structured document that certifies its identity, provenance, compliance, and history. The UI should feel like you're navigating a filing system of authoritative technical records, not scrolling through a dashboard.

Think: the digital equivalent of opening a thick technical binder for a certified piece of equipment. Each section has clear headers, structured data fields, stamps of verification, and a chain of custody.

## Design Thesis

**"Every screen should feel like a page in a structured technical dossier, not a panel in a dashboard."**

This means:
- **Document-grade typography**: Clear section headers, field labels with values, structured data pairs — not cards with icons
- **Vertical reading flow**: Information flows top-to-bottom like a document, not scattered in a card grid
- **Status as stamps, not badges**: Compliance and lifecycle status should feel like official stamps on a document, not colored pills
- **Navigation as a table of contents**: Not a generic sidebar with icons, but a structured index into the dossier system
- **Data density over decoration**: Show more information with less chrome. Tables should feel like technical specifications, not UI components
- **Provenance as a timeline**: Lifecycle and history should read as a chain of events, not disconnected log entries

## Anti-patterns to avoid

1. KPI cards in a row
2. Card-everything layout
3. Generic sidebar + topbar shell
4. Colored badges as the primary status indicator
5. Charts for the sake of charts
6. Empty decorative space
7. Rounded corners everywhere
8. Soft shadows on everything
9. Generic loading spinners
10. Pages that repeat the same header → filter → table structure

## 15-Loop Roadmap

| Loop | Focus | Milestone |
|------|-------|-----------|
| 1 | Fix passport detail + establish document layout grammar | Detail page renders and looks like a technical record |
| 2 | Redesign navigation as dossier index | Navigation communicates document structure, not app sections |
| 3 | Redesign passport list as a registry | List feels like a register of certified documents |
| 4 | Dashboard as system overview, not KPI cards | Overview communicates fleet status without card pattern |
| 5 | Login as institutional entry point | Login communicates authority and trust |
| 6 | BMU data as inspection record | Sensor data presented as technical measurement log |
| 7 | Maintenance as service history dossier | Maintenance records feel like filed service reports |
| 8 | Materials + recycling as supply chain ledger | Material flow reads as connected chain |
| 9 | Typography and spacing system-wide pass | Consistent document-grade type hierarchy |
| 10 | Status and lifecycle visualization | Lifecycle stages feel like stamps on a document |
| 11 | Interaction refinement | Hover, focus, transitions support the metaphor |
| 12 | Data density and information hierarchy | Key screens show the right amount of data |
| 13 | Responsive behavior | Document layout adapts without losing character |
| 14 | Polish and consistency | Every screen feels like part of the same system |
| 15 | Final QA and evaluation | Full Playwright inspection, all flows verified |

## Success Criteria

1. A first-time viewer can tell this is a Battery Passport system within 10 seconds
2. The passport detail page feels like reading a technical certificate, not viewing a profile card
3. Navigation feels like a table of contents, not a generic app menu
4. No screen triggers the reaction "AI made this"
5. Data is presented with conviction and hierarchy, not just displayed
6. The metaphor of "technical certificate system" is visible throughout
7. All Playwright tests pass
8. Evaluator scores: Design ≥ 7.5, Originality ≥ 7.5, Polish ≥ 7.0, Functionality ≥ 7.0
