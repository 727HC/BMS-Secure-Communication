import { Fragment } from 'react';
import { Sparkline } from '../components/ui';

const KPI_ACCENTS = {
  blue: '#1769e0',
  green: '#10b981',
  amber: '#f59e0b',
  purple: '#8b5cf6',
} as const;

const KPI_CARDS = [
  { label: '총 등록 배터리', value: '256', delta: '전체 100%', series: [220, 224, 230, 236, 241, 248, 256], accent: KPI_ACCENTS.blue, tone: 'blue', icon: 'battery' },
  { label: '정상 상태', value: '242', delta: '94.5%', series: [208, 214, 220, 226, 232, 238, 242], accent: KPI_ACCENTS.green, tone: 'green', icon: 'check' },
  { label: '알림 / 경고', value: '7', delta: '2.7%', series: [5, 6, 4, 7, 6, 8, 7], accent: KPI_ACCENTS.amber, tone: 'amber', icon: 'alert' },
  { label: '블록체인 검증 완료', value: '248', delta: '96.9%', series: [210, 218, 224, 232, 238, 244, 248], accent: KPI_ACCENTS.purple, tone: 'purple', icon: 'chain' },
] as const;

const FLEET_GAUGES = [
  { label: 'SOC (평균)', value: '78 %', tone: 'green' },
  { label: 'SOH (평균)', value: '93.2 %', tone: 'blue' },
  { label: 'Temperature (평균)', value: '31.2 ℃', tone: 'amber' },
  { label: 'Health Score', value: '87 /100', tone: 'purple' },
] as const;

const FLEET_LEGEND = [
  { label: 'Normal', tone: 'normal' },
  { label: 'Warning', tone: 'warning' },
  { label: 'Critical', tone: 'critical' },
  { label: 'No Data', tone: 'none' },
] as const;

const DATAFLOW_NODES = [
  { key: 'cmu', label: 'CMU', action: '수집', status: 'Active' },
  { key: 'bmu', label: 'BMU', action: '전송', status: 'Active' },
  { key: 'agent', label: 'Agent', action: '검증', status: 'Active' },
  { key: 'blockchain', label: 'Blockchain', action: '기록', status: 'Synced' },
  { key: 'passport', label: 'Passport', action: '발급', status: 'Verified' },
] as const;

const ALERT_ROWS = [
  { message: 'GBA 규제 준수 항목 7개 미충족', source: 'PASSPORT-BMU-DEVICE', severity: 'High', time: '10분 전' },
  { message: '차량 연결을 위한 VIN 등록 대기', source: 'SN-BENCH-001', severity: 'Medium', time: '30분 전' },
  { message: 'BMU 통신 지연 감지', source: 'PASSPORT-CALIPER-0093', severity: 'High', time: '1시간 전' },
  { message: '정비 기록 업로드 필요', source: 'MAINT-2026-04-22', severity: 'Medium', time: '2시간 전' },
  { message: '데이터 동기화 대기 중', source: 'NMC / Benchmark', severity: 'Low', time: '3시간 전' },
] as const;

const TASK_ROWS = [
  { label: 'VIN 연결 대기', value: '5', unit: '건', tone: 'blue', icon: 'folder' },
  { label: '검증 대기', value: '2', unit: '건', tone: 'amber', icon: 'user' },
  { label: '정비 필요', value: '0', unit: '건', tone: 'green', icon: 'wrench' },
  { label: '데이터 업로드 대기', value: '0', unit: '건', tone: 'purple', icon: 'upload' },
] as const;

const SECURITY_ROWS = [
  { label: 'AES Encryption', value: 'Active', tone: 'green', icon: 'lock' },
  { label: 'CMAC Integrity', value: 'Valid', tone: 'blue', icon: 'shield' },
  { label: 'Ed25519 Signature', value: 'Verified', tone: 'purple', icon: 'key' },
  { label: 'Data Integrity', value: '100%', tone: 'green', icon: 'shield' },
] as const;

const LEDGER_ROWS = [
  { tx: '0a7fb...2d4f', block: '12345678', organization: 'BenchCorp', eventType: 'Passport Issued', timestamp: '2026-04-22 14:35:22', status: 'Verified' },
  { tx: '0cb3a...8ef1', block: '12345677', organization: 'EV Manufacturer', eventType: 'VIN Linked', timestamp: '2026-04-22 14:30:15', status: 'Verified' },
  { tx: '69d1c...be01', block: '12345676', organization: 'Service Center', eventType: 'Maintenance', timestamp: '2026-04-22 14:20:05', status: 'Verified' },
  { tx: '0ed8f...7a16', block: '12345675', organization: 'Regulator', eventType: 'Compliance Check', timestamp: '2026-04-22 14:10:33', status: 'Verified' },
  { tx: 'b91f2...a9c0', block: '12345674', organization: 'BenchCorp', eventType: 'Battery Registered', timestamp: '2026-04-22 14:00:12', status: 'Verified' },
] as const;

export default function DashboardPage() {
  return (
    <div className="vk-dash">
      <header className="vk-dash__head">
        <div>
          <h1 className="vk-dash__title">Overview</h1>
          <p className="vk-dash__sub">배터리 여권 시스템의 전체 현황을 한눈에 확인하세요.</p>
        </div>
      </header>

      <div className="vk-grid vk-grid--4">
        {KPI_CARDS.map((k) => (
          <article key={k.label} className={`vk-card vk-kpi vk-kpi--${k.tone}`}>
            <div className="vk-kpi__top">
              <div className="vk-kpi__copy">
                <span className="vk-kpi__label">{k.label}</span>
                <div className="vk-kpi__value">{k.value}</div>
                <span className="vk-kpi__delta">{k.delta}</span>
              </div>
              <span className="vk-kpi__icon" aria-hidden="true">
                <KpiIcon name={k.icon} />
              </span>
            </div>
            <div className="vk-kpi__spark" aria-hidden="true">
              <Sparkline values={[...k.series]} height={32} color={k.accent} fillOpacity={0.1} animate={false} />
            </div>
          </article>
        ))}
      </div>

      <div className="vk-grid vk-grid--fleet">
        <article className="vk-card vk-fleet">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">Fleet Digital Twin</h2>
              <p className="vk-card__sub">Viewing: Fleet (All Batteries)</p>
            </div>
            <button type="button" className="vk-selectbtn">
              <span>Select Battery</span>
              <ChevronDownIcon />
            </button>
          </div>
          <div className="vk-fleet__body">
            <div className="vk-fleet__visual" aria-hidden="true">
              <img className="vk-fleet__image" src="/dashboard-fleet-chassis.png" alt="" loading="eager" decoding="async" />
              <span className="vk-fleet__expand">
                <ExpandIcon />
              </span>
            </div>
            <div className="vk-fleet__gauges">
              {FLEET_GAUGES.map((g) => (
                <FleetGauge key={g.label} label={g.label} value={g.value} tone={g.tone} />
              ))}
            </div>
          </div>
          <div className="vk-fleet__legend" aria-label="Fleet status legend">
            {FLEET_LEGEND.map((item) => (
              <span key={item.label} className={`vk-fleet__legend-item vk-fleet__legend-item--${item.tone}`}>
                {item.label}
              </span>
            ))}
          </div>
        </article>

        <article className="vk-card vk-dataflow">
          <div className="vk-card__head">
            <div>
              <div className="vk-card__titleline">
                <h2 className="vk-card__title">Data Flow</h2>
              </div>
              <p className="vk-card__sub">기준 처리 단계</p>
            </div>
            <button type="button" className="vk-linkbtn vk-linkbtn--chevron">
              <span>상세 보기</span>
              <ChevronRightIcon />
            </button>
          </div>
          <div className="vk-dataflow__nodes">
            {DATAFLOW_NODES.map((n, index) => (
              <Fragment key={n.key}>
                <div className="vk-dataflow__node">
                  <div className="vk-dataflow__badge"><NodeGlyph name={n.key} /></div>
                  <p className="vk-dataflow__label">{n.label}</p>
                  <p className="vk-dataflow__val">{n.action}</p>
                  <span className={`vk-dataflow__status vk-dataflow__status--${n.status.toLowerCase()}`}>{n.status}</span>
                </div>
                {index < DATAFLOW_NODES.length - 1 ? (
                  <span className="vk-dataflow__connector" aria-hidden="true">
                    <ConnectorArrow />
                  </span>
                ) : null}
              </Fragment>
            ))}
          </div>
        </article>
      </div>

      <div className="vk-grid vk-grid--2">
        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <div className="vk-card__titleline">
                <h2 className="vk-card__title">Alerts</h2>
                <span className="vk-card__count">7</span>
              </div>
              <p className="vk-card__sub">우선 확인 알림</p>
            </div>
            <button type="button" className="vk-linkbtn vk-linkbtn--chevron">
              <span>전체 알림 보기</span>
              <ChevronRightIcon />
            </button>
          </div>
          <ul className="vk-alerts">
            {ALERT_ROWS.map((a) => {
              const severity = a.severity.toLowerCase();
              return (
                <li key={`${a.message}-${a.time}`} className={`vk-alerts__row vk-alerts__row--${severity}`}>
                  <span className={`vk-alerts__icon vk-alerts__icon--${severity}`} aria-hidden="true">
                    <AlertGlyph severity={a.severity} />
                  </span>
                  <span className="vk-alerts__msg">{a.message}</span>
                  <span className="vk-alerts__id">{a.source}</span>
                  <span className={`vk-alerts__status vk-alerts__status--${severity}`}>{a.severity}</span>
                  <span className="vk-alerts__time">{a.time}</span>
                  <span className="vk-alerts__chevron" aria-hidden="true">
                    <ChevronRightIcon />
                  </span>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">Security Status</h2>
              <p className="vk-card__sub">플랫폼 보안 기준값</p>
            </div>
            <button type="button" className="vk-linkbtn">상세 보기</button>
          </div>
          <div className="vk-secbar" aria-label="Security Status">
            {SECURITY_ROWS.map((s) => (
              <div key={s.label} className={`vk-sec vk-sec--${s.tone}`}>
                <div className="vk-sec__icon" aria-hidden="true"><SecurityGlyph name={s.icon} /></div>
                <div className="vk-sec__copy">
                  <p className="vk-sec__label">{s.label}</p>
                  <p className="vk-sec__value">{s.value}</p>
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
              <div className="vk-card__titleline">
                <h2 className="vk-card__title">Tasks / Queue</h2>
                <span className="vk-card__count">7</span>
              </div>
              <p className="vk-card__sub">우선 처리 대기열</p>
            </div>
            <button type="button" className="vk-linkbtn vk-linkbtn--chevron">
              <span>전체 보기</span>
              <ChevronRightIcon />
            </button>
          </div>
          <div className="vk-tasks">
            {TASK_ROWS.map((t) => (
              <div key={t.label} className={`vk-task vk-task--${t.tone}`}>
                <div className="vk-task__top">
                  <div className="vk-task__icon" aria-hidden="true"><TaskGlyph name={t.icon} /></div>
                  <p className="vk-task__label">{t.label}</p>
                </div>
                <p className="vk-task__count">
                  <span className="vk-task__num">{t.value}</span>
                  <span className="vk-task__unit"> {t.unit}</span>
                </p>
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
            <button type="button" className="vk-linkbtn vk-linkbtn--chevron">
              <span>전체 보기</span>
              <ChevronRightIcon />
            </button>
          </div>
          <table className="vk-ledger">
            <thead>
              <tr>
                <th>Tx Hash</th>
                <th>Block</th>
                <th>Organization</th>
                <th>Event Type</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {LEDGER_ROWS.map((r) => (
                <tr key={r.tx}>
                  <td className="vk-ledger__hash">{r.tx}</td>
                  <td className="vk-ledger__time">{r.block}</td>
                  <td className="vk-ledger__org">{r.organization}</td>
                  <td className="vk-ledger__type">{r.eventType}</td>
                  <td className="vk-ledger__time">{r.timestamp}</td>
                  <td><span className="vk-ledger__status">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>

      <p className="vk-dash__foot">마지막 업데이트 2026-04-22 14:35:22</p>
    </div>
  );
}

function KpiIcon({ name }: { name: 'battery' | 'check' | 'alert' | 'chain' }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (name === 'battery') {
    return <svg viewBox="0 0 24 24" width="24" height="24"><rect {...stroke} x="3" y="8" width="16" height="8" rx="2"/><path {...stroke} d="M19 10.5h2v3h-2"/><path {...stroke} d="M7 12h5"/></svg>;
  }

  if (name === 'check') {
    return <svg viewBox="0 0 24 24" width="24" height="24"><circle {...stroke} cx="12" cy="12" r="9"/><path {...stroke} d="M8.5 12.5l2.3 2.3 4.9-5.4"/></svg>;
  }

  if (name === 'alert') {
    return <svg viewBox="0 0 24 24" width="24" height="24"><path {...stroke} d="M12 4l9 16H3z"/><path {...stroke} d="M12 9v5"/><path {...stroke} d="M12 17h.01"/></svg>;
  }

  return <svg viewBox="0 0 24 24" width="24" height="24"><rect {...stroke} x="4" y="4" width="6" height="6" rx="1.5"/><rect {...stroke} x="14" y="4" width="6" height="6" rx="1.5"/><rect {...stroke} x="9" y="14" width="6" height="6" rx="1.5"/><path {...stroke} d="M10 7h4M12 10v4"/></svg>;
}

function ChevronDownIcon() {
  return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ChevronRightIcon() {
  return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ExpandIcon() {
  return <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="M6.5 3.5h-3v3M11.5 3.5h3v3M14.5 11.5v3h-3M3.5 11.5v3h3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function AlertGlyph({ severity }: { severity: string }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (severity === 'Low') {
    return <svg viewBox="0 0 24 24" width="18" height="18"><circle {...stroke} cx="12" cy="12" r="9"/><path {...stroke} d="M12 11v5"/><path {...stroke} d="M12 8h.01"/></svg>;
  }

  return <svg viewBox="0 0 24 24" width="18" height="18"><path {...stroke} d="M12 4l9 16H3z"/><path {...stroke} d="M12 9v5"/><path {...stroke} d="M12 17h.01"/></svg>;
}

function ConnectorArrow() {
  return <svg viewBox="0 0 54 18" width="54" height="18" aria-hidden="true"><path d="M3 9h41" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 6" /><path d="M42 4.5L50 9l-8 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function FleetGauge({ label, value, tone }: { label: string; value: string; tone: 'green' | 'blue' | 'amber' | 'purple' }) {
  return (
    <div className={`vk-gauge vk-gauge--${tone}`}>
      <p className="vk-gauge__label">{label}</p>
      <p className="vk-gauge__value">{value}</p>
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
  return <svg viewBox="0 0 24 24" width="22" height="22"><rect {...stroke} x="5" y="11" width="14" height="10" rx="2"/><path {...stroke} d="M8 11V7a4 4 0 118 0v4"/></svg>;
}

function TaskGlyph({ name }: { name: string }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'folder') return <svg viewBox="0 0 24 24" width="24" height="24"><path {...stroke} d="M3.5 7.5h6l2 2h9v8.5a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/><path {...stroke} d="M3.5 7.5v-1a2 2 0 012-2h3.5l2 3"/></svg>;
  if (name === 'user') return <svg viewBox="0 0 24 24" width="24" height="24"><circle {...stroke} cx="12" cy="8" r="4"/><path {...stroke} d="M5 20c1.1-4 4-6 7-6s5.9 2 7 6"/></svg>;
  if (name === 'wrench') return <svg viewBox="0 0 24 24" width="22" height="22"><path {...stroke} d="M14 3a5 5 0 015 5l-.5 1.5L20 11l-2 2-1.5-1.5L15 12a5 5 0 01-5-5L3 14l4 4 7-7z"/></svg>;
  return <svg viewBox="0 0 24 24" width="24" height="24"><path {...stroke} d="M12 16V5"/><path {...stroke} d="M7.5 9.5L12 5l4.5 4.5"/><path {...stroke} d="M5 16v2.5a2 2 0 002 2h10a2 2 0 002-2V16"/></svg>;
}
