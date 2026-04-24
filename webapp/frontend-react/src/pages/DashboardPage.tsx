import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Sparkline, SkeletonCard } from '../components/ui';

interface Passport {
  passportId?: string;
  status?: string;
  vin?: string;
  manufacturerName?: string;
  chemistry?: string;
  createdAt?: string;
  updatedAt?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface ApiListResponse<T> {
  records?: T[];
}

const KPI_ACCENTS = {
  blue: '#1769e0',
  green: '#10b981',
  amber: '#f59e0b',
  purple: '#8b5cf6',
} as const;

function buildSparklineSeries(passports: Passport[], days = 7): number[] {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const buckets = Array(days).fill(0);
  for (const p of passports) {
    const raw = p.createdAt || p.timestamp;
    if (!raw) continue;
    const d = new Date(raw as string);
    if (isNaN(d.getTime())) continue;
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < days) buckets[days - 1 - diff] += 1;
  }
  return buckets;
}

function formatTime(value?: string): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('ko-KR', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return value;
  }
}

const MOCK_ALERTS = [
  { id: 'A-1042', severity: 'high', message: 'Pack #2187 — Temperature spike detected (62°C)', source: 'BMU', time: '14:22', status: 'active' },
  { id: 'A-1041', severity: 'medium', message: 'Pack #1983 — SOH below 85% threshold', source: 'Analytics', time: '13:47', status: 'investigating' },
  { id: 'A-1040', severity: 'low', message: 'Pack #2201 — Cell voltage deviation 12mV', source: 'BMU', time: '12:10', status: 'resolved' },
  { id: 'A-1039', severity: 'medium', message: 'Pack #1856 — Maintenance cycle due', source: 'Scheduler', time: '09:05', status: 'active' },
];

const MOCK_SECURITY = [
  { label: 'Ed25519 Signature', value: '99.8%', detail: 'Verified / 24h', tone: 'green', icon: 'shield' },
  { label: 'Cert Rotation', value: '4 / 4', detail: 'Orgs current', tone: 'blue', icon: 'key' },
  { label: 'Threat Alerts', value: '0', detail: 'Last 7 days', tone: 'green', icon: 'alert' },
  { label: 'Data Integrity', value: '100%', detail: 'Chain parity', tone: 'blue', icon: 'lock' },
] as const;

const MOCK_TASKS = [
  { label: 'Pending Maintenance', value: 5, tone: 'amber', icon: 'wrench' },
  { label: 'Analysis Requests', value: 2, tone: 'purple', icon: 'flask' },
  { label: 'Correction Review', value: 3, tone: 'blue', icon: 'edit' },
  { label: 'Recycling Intake', value: 6, tone: 'green', icon: 'recycle' },
];

const MOCK_LEDGER = [
  { tx: '0xe4a1...9f2c', type: 'CreateBatteryPassport', org: 'ManufacturerMSP', at: '14:28', status: 'committed' },
  { tx: '0x81b3...0a7d', type: 'RecordBMUData', org: 'ManufacturerMSP', at: '14:25', status: 'committed' },
  { tx: '0xcc92...4e11', type: 'BindVIN', org: 'EVManufacturerMSP', at: '14:18', status: 'committed' },
  { tx: '0x45df...2a90', type: 'RequestMaintenance', org: 'EVManufacturerMSP', at: '14:05', status: 'committed' },
  { tx: '0x7b58...8c04', type: 'SubmitAnalysis', org: 'ServiceMSP', at: '13:52', status: 'committed' },
  { tx: '0xa3f0...5d6b', type: 'ExtractMaterial', org: 'RegulatorMSP', at: '13:40', status: 'committed' },
];

const DATAFLOW_NODES = [
  { key: 'cmu', label: 'CMU', value: '4.2k', sub: 'msgs/min' },
  { key: 'bmu', label: 'BMU', value: '1.1k', sub: 'msgs/min' },
  { key: 'agent', label: 'Agent', value: '982', sub: 'req/min' },
  { key: 'blockchain', label: 'Blockchain', value: '248', sub: 'tx/h' },
  { key: 'passport', label: 'Passport', value: '87', sub: 'updates/h' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [passports, setPassports] = useState<Passport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = (await api.get('/passports')) as ApiListResponse<Passport>;
        if (!cancelled) setPassports(res.records ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const sparklineAll = useMemo(() => buildSparklineSeries(passports, 14), [passports]);

  const kpiCards = useMemo(() => {
    const total = passports.length;
    const active = passports.filter((p) => p.status === 'ACTIVE' || p.vin).length;
    const alerts = MOCK_ALERTS.filter((a) => a.status === 'active').length;
    const txCount = MOCK_LEDGER.length * 41; // realistic-ish
    return [
      { label: 'Total Passports', value: total || 256, delta: '+12 this week', series: sparklineAll, accent: KPI_ACCENTS.blue },
      { label: 'Active Fleet', value: active || 242, delta: '+8 this week', series: sparklineAll.map((v) => Math.round(v * 0.85)), accent: KPI_ACCENTS.green },
      { label: 'Alerts', value: alerts || 7, delta: '-3 vs last week', series: [2, 4, 3, 5, 6, 4, 7, 5, 3, 6, 4, 5, 7, 7], accent: KPI_ACCENTS.amber },
      { label: 'Tx / 24h', value: txCount || 248, delta: '+21% MoM', series: [180, 192, 210, 205, 220, 235, 228, 240, 231, 248, 244, 250, 246, 248], accent: KPI_ACCENTS.purple },
    ];
  }, [passports, sparklineAll]);

  return (
    <div className="vk-dash">
      <p className="vk-dash__sub">실시간 배터리 여권 플랫폼 운영 현황을 한눈에 확인합니다.</p>

      {loading ? (
        <div className="vk-grid vk-grid--4"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      ) : (
        <div className="vk-grid vk-grid--4">
          {kpiCards.map((k) => (
            <article key={k.label} className="vk-card vk-kpi">
              <div className="vk-kpi__row">
                <span className="vk-kpi__label">{k.label}</span>
                <span className="vk-kpi__delta">{k.delta}</span>
              </div>
              <div className="vk-kpi__value">{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}</div>
              <div className="vk-kpi__spark">
                <Sparkline values={k.series} height={42} color={k.accent} />
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="vk-grid vk-grid--fleet">
        <article className="vk-card vk-fleet">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">Fleet Digital Twin</h2>
              <p className="vk-card__sub">실시간 대표 팩 상태</p>
            </div>
            <button type="button" className="vk-linkbtn" onClick={() => navigate('/bmu-data')}>상세 보기 →</button>
          </div>
          <div className="vk-fleet__body">
            <div className="vk-fleet__pack vk-fleet__pack--empty" aria-hidden="true">
              <span>Battery image slot</span>
            </div>
            <div className="vk-fleet__gauges">
              <FleetGauge label="SOC" value="89" unit="%" tone="green" />
              <FleetGauge label="Voltage" value="382.1" unit="V" tone="blue" />
              <FleetGauge label="Temperature" value="24.3" unit="°C" tone="amber" />
              <FleetGauge label="Cycles" value="1,042" unit="" tone="purple" />
            </div>
          </div>
        </article>

        <article className="vk-card vk-dataflow">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">Data Flow</h2>
              <p className="vk-card__sub">처리량 분포 (최근 1시간)</p>
            </div>
          </div>
          <div className="vk-dataflow__chart">
            <Sparkline values={[120, 135, 128, 150, 162, 148, 170, 182, 175, 190, 205, 198, 212, 220]} height={110} color="#1769e0" fillOpacity={0.18} />
          </div>
          <div className="vk-dataflow__nodes">
            {DATAFLOW_NODES.map((n) => (
              <div key={n.key} className="vk-dataflow__node">
                <div className="vk-dataflow__badge"><NodeGlyph name={n.key} /></div>
                <p className="vk-dataflow__label">{n.label}</p>
                <p className="vk-dataflow__val">{n.value}</p>
                <p className="vk-dataflow__sub">{n.sub}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="vk-grid vk-grid--2">
        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">Alerts</h2>
              <p className="vk-card__sub">최근 24시간 이벤트</p>
            </div>
            <button type="button" className="vk-linkbtn" onClick={() => navigate('/audit-log')}>전체 로그 →</button>
          </div>
          <ul className="vk-alerts">
            {MOCK_ALERTS.map((a) => (
              <li key={a.id} className={`vk-alerts__row vk-alerts__row--${a.severity}`}>
                <span className={`vk-alerts__dot vk-alerts__dot--${a.severity}`} />
                <span className="vk-alerts__id">{a.id}</span>
                <span className="vk-alerts__msg">{a.message}</span>
                <span className="vk-alerts__meta">{a.source}</span>
                <span className="vk-alerts__time">{a.time}</span>
                <span className={`vk-alerts__status vk-alerts__status--${a.status}`}>{a.status}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">Security Status</h2>
              <p className="vk-card__sub">플랫폼 보안 지표</p>
            </div>
          </div>
          <div className="vk-grid vk-grid--2 vk-grid--tight">
            {MOCK_SECURITY.map((s) => (
              <div key={s.label} className={`vk-sec vk-sec--${s.tone}`}>
                <div className="vk-sec__icon"><SecurityGlyph name={s.icon} /></div>
                <div>
                  <p className="vk-sec__label">{s.label}</p>
                  <p className="vk-sec__value">{s.value}</p>
                  <p className="vk-sec__detail">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="vk-grid vk-grid--ledger">
        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">Tasks / Queue</h2>
              <p className="vk-card__sub">실행 대기 작업</p>
            </div>
            <button type="button" className="vk-linkbtn" onClick={() => navigate('/maintenance')}>전체 작업 →</button>
          </div>
          <div className="vk-grid vk-grid--2 vk-grid--tight">
            {MOCK_TASKS.map((t) => (
              <div key={t.label} className={`vk-task vk-task--${t.tone}`}>
                <div className="vk-task__icon"><TaskGlyph name={t.icon} /></div>
                <div>
                  <p className="vk-task__count">{t.value}</p>
                  <p className="vk-task__label">{t.label}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">Blockchain Ledger</h2>
              <p className="vk-card__sub">최근 커밋 트랜잭션</p>
            </div>
            <button type="button" className="vk-linkbtn" onClick={() => navigate('/audit-log')}>전체 보기 →</button>
          </div>
          <table className="vk-ledger">
            <thead>
              <tr>
                <th>Tx Hash</th>
                <th>Type</th>
                <th>Org</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_LEDGER.map((r) => (
                <tr key={r.tx}>
                  <td className="vk-ledger__hash">{r.tx}</td>
                  <td className="vk-ledger__type">{r.type}</td>
                  <td className="vk-ledger__org">{r.org}</td>
                  <td className="vk-ledger__time">{r.at}</td>
                  <td><span className="vk-ledger__status">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>

      <p className="vk-dash__foot">마지막 업데이트 {formatTime(new Date().toISOString())}</p>
    </div>
  );
}

function FleetGauge({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: 'green' | 'blue' | 'amber' | 'purple' }) {
  return (
    <div className={`vk-gauge vk-gauge--${tone}`}>
      <p className="vk-gauge__label">{label}</p>
      <p className="vk-gauge__value">{value}<span>{unit}</span></p>
    </div>
  );
}

function NodeGlyph({ name }: { name: string }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'cmu') return <svg viewBox="0 0 24 24" width="20" height="20"><rect {...stroke} x="4" y="7" width="16" height="10" rx="2"/><path {...stroke} d="M8 11h8M8 14h5"/></svg>;
  if (name === 'bmu') return <svg viewBox="0 0 24 24" width="20" height="20"><rect {...stroke} x="3" y="8" width="16" height="8" rx="2"/><path {...stroke} d="M19 10v4h2v-4z"/></svg>;
  if (name === 'agent') return <svg viewBox="0 0 24 24" width="20" height="20"><circle {...stroke} cx="12" cy="8" r="4"/><path {...stroke} d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>;
  if (name === 'blockchain') return <svg viewBox="0 0 24 24" width="20" height="20"><path {...stroke} d="M12 3l9 4.5-9 4.5-9-4.5z"/><path {...stroke} d="M3 12l9 4.5 9-4.5"/><path {...stroke} d="M3 16.5l9 4.5 9-4.5"/></svg>;
  return <svg viewBox="0 0 24 24" width="20" height="20"><rect {...stroke} x="5" y="3" width="14" height="18" rx="2"/><circle {...stroke} cx="12" cy="10" r="2.5"/><path {...stroke} d="M8 17h8"/></svg>;
}

function SecurityGlyph({ name }: { name: string }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'shield') return <svg viewBox="0 0 24 24" width="22" height="22"><path {...stroke} d="M12 3l8 3v6c0 4.4-3.4 8.4-8 9-4.6-.6-8-4.6-8-9V6z"/><path {...stroke} d="M9 12l2.2 2.2L15 10"/></svg>;
  if (name === 'key') return <svg viewBox="0 0 24 24" width="22" height="22"><circle {...stroke} cx="8" cy="15" r="4"/><path {...stroke} d="M11 12l9-9 3 3-3 3 2 2-2 2-2-2-3 3"/></svg>;
  if (name === 'alert') return <svg viewBox="0 0 24 24" width="22" height="22"><path {...stroke} d="M12 3l10 18H2z"/><path {...stroke} d="M12 10v5M12 18v.5"/></svg>;
  return <svg viewBox="0 0 24 24" width="22" height="22"><rect {...stroke} x="5" y="11" width="14" height="10" rx="2"/><path {...stroke} d="M8 11V7a4 4 0 118 0v4"/></svg>;
}

function TaskGlyph({ name }: { name: string }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'wrench') return <svg viewBox="0 0 24 24" width="22" height="22"><path {...stroke} d="M14 3a5 5 0 015 5l-.5 1.5L20 11l-2 2-1.5-1.5L15 12a5 5 0 01-5-5L3 14l4 4 7-7z"/></svg>;
  if (name === 'flask') return <svg viewBox="0 0 24 24" width="22" height="22"><path {...stroke} d="M9 3h6v5l5 11a2 2 0 01-2 3H6a2 2 0 01-2-3L9 8z"/><path {...stroke} d="M7 14h10"/></svg>;
  if (name === 'edit') return <svg viewBox="0 0 24 24" width="22" height="22"><path {...stroke} d="M12 20h9"/><path {...stroke} d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4z"/></svg>;
  return <svg viewBox="0 0 24 24" width="22" height="22"><path {...stroke} d="M7 20l-3-3 3-3"/><path {...stroke} d="M4 17h9a5 5 0 005-5"/><path {...stroke} d="M17 4l3 3-3 3"/><path {...stroke} d="M20 7h-9a5 5 0 00-5 5"/></svg>;
}
