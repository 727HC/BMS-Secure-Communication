import { getStatusBadge, STATUS_DOT_COLORS } from '../../lib/helpers';

interface StatusPillProps {
  status?: string;
}

export default function StatusPill({ status }: StatusPillProps) {
  const badge = getStatusBadge(status || 'DISPOSED');
  const color = STATUS_DOT_COLORS[status || 'DISPOSED'] || '#94a3b8';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: `${color}18`,
        color,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      {badge.label}
    </span>
  );
}
