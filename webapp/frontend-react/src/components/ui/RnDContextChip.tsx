interface Props {
  year: 1 | 2 | 3;
  focus: string;
}

const YEAR_META = {
  1: { label: '1년차', tint: 'var(--color-surface-accent)', text: 'var(--color-accent)' },
  2: { label: '2년차', tint: 'var(--color-surface-warm)', text: 'var(--color-warning)' },
  3: { label: '3년차', tint: 'var(--color-surface-teal)', text: 'var(--color-success)' },
} as const;

export default function RnDContextChip({ year, focus }: Props) {
  const m = YEAR_META[year];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 999,
        background: m.tint,
        color: m.text,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.02em',
        border: '1px solid var(--color-border)',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.85 }}>국가과제 {m.label}</span>
      <span style={{ width: 1, height: 10, background: 'currentColor', opacity: 0.3 }} />
      <span>{focus}</span>
    </span>
  );
}
