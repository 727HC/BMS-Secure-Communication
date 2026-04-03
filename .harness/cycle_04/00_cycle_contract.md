# Cycle 04 — Readability & Visual Authority Overhaul

This is cycle 4, not the whole project.
This cycle contains 15 micro-loops.
The project is not complete until 10 to 15 full cycles are done.

## Cycle Objective
Complete readability overhaul. The user has said 3 times across cycles 1-3 that readability is terrible. This cycle makes every screen effortlessly readable.

## Why This Cycle Matters
The user explicitly said "로그인 창부터 전체적으로 가독성이 너무 떨어져" and "전체적으로 다 갈아 엎어도 괜찮아". Previous cycles raised type sizes incrementally but the result is still hard to read. The root cause is systemic: the type scale, contrast ratios, Korean font handling, and visual hierarchy all need to be rebuilt from scratch.

## Cycle Hypothesis
"Readable Authority" — Replace the cramped tiny-text document aesthetic with a properly scaled, high-contrast hierarchy where Korean text is legible at every level and the interface feels authoritative rather than decorative.

## Key Changes
1. **CSS Design System**: Raise entire type scale (minimum 12px anywhere, body 15px, labels 13px+)
2. **Korean Font Handling**: Pretendard for ALL Korean text, JetBrains Mono only for IDs/codes/numbers
3. **Contrast**: Primary #111827, secondary #374151, muted minimum #6b7280
4. **Shell**: Wider sidebar (w-60), bigger nav text (15px), taller topbar (h-14)
5. **All Pages**: Remove visual clutter, increase spacing, strengthen hierarchy
6. **Login**: Complete readability pass

## Risks
- Over-correcting to "too big" — maintain density where appropriate
- Losing the document/passport identity while fixing readability

## Direction: PIVOT from incremental fixes to systemic rebuild
