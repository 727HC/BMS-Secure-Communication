import { ChevronRightIcon } from './Glyphs';
import { AUDIT_REQUIRED_LABEL, type DashboardRoute, type LedgerRowViewModel } from './lib';

interface Props {
  ledgerRows: LedgerRowViewModel[];
  ledgerFallback: string | null;
  canReadAudit: boolean;
  onNavigate: (route: DashboardRoute) => void;
}

export default function LedgerCard({ ledgerRows, ledgerFallback, canReadAudit, onNavigate }: Props) {
  return (
    <article className="vk-card">
      <div className="vk-card__head">
        <div>
          <h2 className="vk-card__title">블록체인 원장</h2>
          <p className="vk-card__sub">최근 커밋 트랜잭션</p>
        </div>
        <button
          type="button"
          className="vk-linkbtn vk-linkbtn--chevron"
          disabled={!canReadAudit}
          title={canReadAudit ? '감사 로그로 이동' : AUDIT_REQUIRED_LABEL}
          aria-label={canReadAudit ? 'Blockchain Ledger 전체 보기' : AUDIT_REQUIRED_LABEL}
          onClick={canReadAudit ? () => onNavigate('/audit-log') : undefined}
        >
          <span>{canReadAudit ? '전체 보기' : AUDIT_REQUIRED_LABEL}</span>
          <ChevronRightIcon />
        </button>
      </div>
      <table className="vk-ledger">
        <thead>
          <tr>
            <th>Tx Hash</th>
            <th>Block / Target</th>
            <th>Organization</th>
            <th>Event Type</th>
            <th>Timestamp</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {ledgerFallback ? (
            <tr>
              <td colSpan={6} className="vk-ledger__time" style={{ padding: '18px 6px', textAlign: 'center' }}>{ledgerFallback}</td>
            </tr>
          ) : ledgerRows.map((r) => (
            <tr key={r.key}>
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
  );
}
