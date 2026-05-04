import type { DetailTab } from './PassportDetailTabRouter';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'identity', label: '개요' },
  { key: 'compliance', label: '규제·소재' },
  { key: 'traceability', label: '운영 이력' },
  { key: 'data', label: '진단 데이터' },
  { key: 'trust', label: '증빙' },
];

interface Props {
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}

export default function PassportDetailTabNav({ activeTab, onTabChange }: Props) {
  return (
    <div className="sn-detail-index">
      <div className="sn-detail-index-track">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`sn-detail-index-tab${activeTab === t.key ? ' active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
