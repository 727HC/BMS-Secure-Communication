# BATP Master Plan — Battery Passport Frontend Redesign

## 1. Current Diagnosis
Supanova design system (sn- classes) applied to index.html but undermined: 769 inline styles vs 230 class usages across all pages. Components carry their own `<style>` blocks re-declaring sn- classes with different values. Every page follows identical cadence: eyebrow → heading → white cards → pill button → table. Dashboard has rendering issues (opacity). passport-detail.js is 2624-line monolith with 13 modals.

## 2. Why It Feels AI-Generated
- Uniform rhythm: every page opens identically
- Pill-button monoculture: border-radius: 9999px × 14 occurrences
- Double-bezel card as single visual idea applied everywhere
- Animation as filler (sn-reveal fade-in-up stagger)
- Inline style explosion (769 vs 230 classes = design system is facade)
- No information hierarchy: KPI, charts, tables all equal weight
- Copy-pasted status color ternaries across 4+ files

## 3. Chosen Metaphor
**Technical Certificate System** — each passport is a formal certificate with stamped sections, not a dashboard card.

## 4. Design Thesis
The Battery Passport is a regulatory compliance artifact, not a social feed. The UI should feel like opening a bound technical dossier: dense but legible, with clear section stamps, visible fill-state for mandatory fields, and a sense that the document itself is the product. Pages must differ structurally based on their role.

## 5. Mandatory Product Qualities
1. Typographic hierarchy — 4 distinct scales actually used
2. Page-specific layouts — dashboard, registry, detail must look structurally different
3. Data density — passport-detail shows 21 GBA fields without hiding behind tabs
4. Compliance-forward — GBA fill %, grade, missing-field indicators are primary UI
5. Zero decorative animation — motion only on user-initiated actions

## 6. Anti-Patterns
- Color-swap-as-redesign (failed 10+ times)
- Layout toggle without structural change
- Feature deletion (ABSOLUTELY FORBIDDEN)
- Uniform card grids on every page
- Design system as facade (inline styles override classes)
- Animation as polish substitute

## 7. Cycle Roadmap
| Cycle | Focus |
|-------|-------|
| 1 | CSS consolidation — delete in-component styles, use only index.html classes |
| 2 | Dashboard rebuild — new layout distinct from other pages |
| 3 | Passports registry — ledger-style with inline indicators |
| 4 | Passport-detail certificate layout — scrollable single-page certificate |
| 5 | Passport-detail modals audit — all 13 modals working, standardized |
| 6 | Login page — minimal, branded, meaningful org selector |
| 7 | Secondary pages (materials, maintenance, BMU, recycling) |
| 8 | Audit log + QR scan |
| 9 | Typography + spacing pass |
| 10 | Interaction polish |
| 11 | Responsive + print |
| 12 | Final integration test |

## 8. Evaluation Logic
3 axes (1-5 each, max 15):
- Structural differentiation: pages look different from each other
- Data legibility: compliance officer finds info in <3 seconds
- Implementation hygiene: zero in-component styles, design system classes only

## 9. Stop / Continue Rules
- STOP if features deleted
- STOP if inline style count increases
- CONTINUE if visual diff shows real layout change
- Minimum 10 cycles before stopping allowed
