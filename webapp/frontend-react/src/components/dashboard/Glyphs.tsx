/**
 * Dashboard SVG glyph components — KPI cards, alerts, security, dataflow, tasks.
 * Pure presentation, no state.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function AlertGlyph({ severity }: { severity: string }) {
  if (severity === 'Low') {
    return <svg viewBox="0 0 24 24" width="18" height="18"><circle {...stroke} cx="12" cy="12" r="9"/><path {...stroke} d="M12 11v5"/><path {...stroke} d="M12 8h.01"/></svg>;
  }
  return <svg viewBox="0 0 24 24" width="18" height="18"><path {...stroke} d="M12 4l9 16H3z"/><path {...stroke} d="M12 9v5"/><path {...stroke} d="M12 17h.01"/></svg>;
}

export function ConnectorArrow() {
  return <svg viewBox="0 0 54 18" width="54" height="18" aria-hidden="true"><path d="M3 9h41" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 6" /><path d="M42 4.5L50 9l-8 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function FleetGauge({ label, value, tone }: { label: string; value: string; tone: 'green' | 'blue' | 'amber' | 'purple' }) {
  return (
    <div className={`vk-gauge vk-gauge--${tone}`}>
      <p className="vk-gauge__label">{label}</p>
      <p className="vk-gauge__value">{value}</p>
    </div>
  );
}

export function NodeGlyph({ name }: { name: string }) {
  if (name === 'cmu') return <svg viewBox="0 0 24 24" width="20" height="20"><rect {...stroke} x="4" y="7" width="16" height="10" rx="2"/><path {...stroke} d="M8 11h8M8 14h5"/></svg>;
  if (name === 'bmu') return <svg viewBox="0 0 24 24" width="20" height="20"><rect {...stroke} x="3" y="8" width="16" height="8" rx="2"/><path {...stroke} d="M19 10v4h2v-4z"/></svg>;
  if (name === 'agent') return <svg viewBox="0 0 24 24" width="20" height="20"><circle {...stroke} cx="12" cy="8" r="4"/><path {...stroke} d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>;
  if (name === 'blockchain') return <svg viewBox="0 0 24 24" width="20" height="20"><path {...stroke} d="M12 3l9 4.5-9 4.5-9-4.5z"/><path {...stroke} d="M3 12l9 4.5 9-4.5"/><path {...stroke} d="M3 16.5l9 4.5 9-4.5"/></svg>;
  return <svg viewBox="0 0 24 24" width="20" height="20"><rect {...stroke} x="5" y="3" width="14" height="18" rx="2"/><circle {...stroke} cx="12" cy="10" r="2.5"/><path {...stroke} d="M8 17h8"/></svg>;
}

export function SecurityGlyph({ name }: { name: string }) {
  if (name === 'shield') return <svg viewBox="0 0 24 24" width="22" height="22"><path {...stroke} d="M12 3l8 3v6c0 4.4-3.4 8.4-8 9-4.6-.6-8-4.6-8-9V6z"/><path {...stroke} d="M9 12l2.2 2.2L15 10"/></svg>;
  if (name === 'key') return <svg viewBox="0 0 24 24" width="22" height="22"><circle {...stroke} cx="8" cy="15" r="4"/><path {...stroke} d="M11 12l9-9 3 3-3 3 2 2-2 2-2-2-3 3"/></svg>;
  return <svg viewBox="0 0 24 24" width="22" height="22"><rect {...stroke} x="5" y="11" width="14" height="10" rx="2"/><path {...stroke} d="M8 11V7a4 4 0 118 0v4"/></svg>;
}

export function TaskGlyph({ name }: { name: string }) {
  if (name === 'folder') return <svg viewBox="0 0 24 24" width="24" height="24"><path {...stroke} d="M3.5 7.5h6l2 2h9v8.5a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/><path {...stroke} d="M3.5 7.5v-1a2 2 0 012-2h3.5l2 3"/></svg>;
  if (name === 'user') return <svg viewBox="0 0 24 24" width="24" height="24"><circle {...stroke} cx="12" cy="8" r="4"/><path {...stroke} d="M5 20c1.1-4 4-6 7-6s5.9 2 7 6"/></svg>;
  if (name === 'wrench') return <svg viewBox="0 0 24 24" width="22" height="22"><path {...stroke} d="M14 3a5 5 0 015 5l-.5 1.5L20 11l-2 2-1.5-1.5L15 12a5 5 0 01-5-5L3 14l4 4 7-7z"/></svg>;
  return <svg viewBox="0 0 24 24" width="24" height="24"><path {...stroke} d="M12 16V5"/><path {...stroke} d="M7.5 9.5L12 5l4.5 4.5"/><path {...stroke} d="M5 16v2.5a2 2 0 002 2h10a2 2 0 002-2V16"/></svg>;
}
