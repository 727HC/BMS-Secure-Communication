import { scaleSOC, scaleTemp } from '../../lib/helpers';
import { Sparkline } from '../ui';
import { BADGE_STYLES, decodeStatusFlags, formatNumber, formatTimestamp, type BmuRecord } from './lib';

interface RecentSlice {
  soc: number[];
  voltage: number[];
  current: number[];
  temperature: number[];
}

interface Props {
  latestRecord: BmuRecord;
  recentSlice: RecentSlice;
}

export default function BmuSnapshotCard({ latestRecord, recentSlice }: Props) {
  const socValue = scaleSOC(latestRecord.soc);
  const socColor = socValue > 50 ? 'var(--color-text-1)' : socValue > 20 ? 'var(--color-warning)' : 'var(--color-danger)';
  const socLineColor = socValue > 50 ? 'var(--color-success)' : socValue > 20 ? 'var(--color-warning)' : 'var(--color-danger)';
  const flagBadges = decodeStatusFlags(latestRecord.statusFlags);

  return (
    <section className="sn-section-card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>Latest telemetry snapshot</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)' }}>
            {formatTimestamp(latestRecord.timestamp)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {flagBadges.map((b) => {
            const s = BADGE_STYLES[b.color];
            return (
              <span key={b.label} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: '0.875rem', fontWeight: 600, background: s.bg, color: s.color }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', marginRight: 6, background: s.dot }} />
                {b.label}
              </span>
            );
          })}
          {flagBadges.length === 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: '0.875rem', fontWeight: 500, background: 'var(--color-surface-alt)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', marginRight: 6, background: 'var(--color-success)' }} />
              정상
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div style={{ padding: '14px 16px', background: 'var(--color-surface-alt)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-3)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>SOC</p>
          <p className="sn-metric sn-metric-md" style={{ fontFamily: 'var(--font-mono)', color: socColor, margin: '0 0 4px' }}>
            {socValue}<span style={{ fontSize: '0.875rem', fontWeight: 500, marginLeft: 2 }}>%</span>
          </p>
          {recentSlice.soc.length > 1 && (
            <Sparkline values={recentSlice.soc} height={40} color={socLineColor} />
          )}
        </div>
        <div style={{ padding: '14px 16px', background: 'var(--color-surface-alt)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-3)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>전압</p>
          <p className="sn-metric sn-metric-md" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-1)', margin: '0 0 12px' }}>
            {formatNumber(latestRecord.voltage, 2)}<span style={{ fontSize: '0.875rem', fontWeight: 500, marginLeft: 2 }}>V</span>
          </p>
          {recentSlice.voltage.length > 1 && (
            <Sparkline values={recentSlice.voltage} height={40} color="var(--color-accent)" />
          )}
        </div>
        <div style={{ padding: '14px 16px', background: 'var(--color-surface-alt)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-3)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>전류</p>
          <p className="sn-metric sn-metric-md" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-1)', margin: '0 0 12px' }}>
            {formatNumber(latestRecord.current, 2)}<span style={{ fontSize: '0.875rem', fontWeight: 500, marginLeft: 2 }}>A</span>
          </p>
          {recentSlice.current.length > 1 && (
            <Sparkline values={recentSlice.current} height={40} color="var(--color-accent)" />
          )}
        </div>
        <div style={{ padding: '14px 16px', background: 'var(--color-surface-alt)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-3)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>온도</p>
          <p className="sn-metric sn-metric-md" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-1)', margin: '0 0 12px' }}>
            {scaleTemp(latestRecord.temperature)}<span style={{ fontSize: '0.875rem', fontWeight: 500, marginLeft: 2 }}>°C</span>
          </p>
          {recentSlice.temperature.length > 1 && (
            <Sparkline values={recentSlice.temperature} height={40} color="var(--color-warning)" />
          )}
        </div>
      </div>
    </section>
  );
}
