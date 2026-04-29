import { useNavigate } from 'react-router-dom';
import SpecRow from '../ui/SpecRow';
import { formatDate } from './helpers';
import { scaleSOC, scaleTemp } from '../../lib/helpers';
import type { BmuRecord } from './types';

interface Props {
  bmuRecords: BmuRecord[];
  passportId?: string;
}

export default function DataTab({ bmuRecords, passportId }: Props) {
  const navigate = useNavigate();
  const latestBmu = bmuRecords.length > 0
    ? bmuRecords.reduce((a, b) => ((a.timestamp || '') > (b.timestamp || '') ? a : b))
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="sn-detail-section-head">
        <h2 className="sn-detail-section-title">진단 데이터 / 텔레메트리 로그</h2>
      </div>

      {latestBmu && (
        <div className="sn-detail-dossier">
          <div className="sn-detail-dossier-head">
            <h3 className="sn-detail-dossier-title">최근 수집 정보</h3>
          </div>
          <div className="sn-detail-spec-sheet">
            <div className="sn-detail-spec-row">
              <SpecRow k="수집 시각" v={formatDate(latestBmu.timestamp)} />
              <SpecRow k="SOC" v={`${scaleSOC(latestBmu.soc)}%`} />
            </div>
            <div className="sn-detail-spec-row">
              <SpecRow k="전압" v={latestBmu.voltage != null ? `${latestBmu.voltage}V` : '-'} />
              <SpecRow k="온도" v={`${scaleTemp(latestBmu.temperature)}°C`} />
            </div>
            <div className="sn-detail-spec-row">
              <SpecRow k="전류" v={latestBmu.current != null ? `${latestBmu.current}A` : '-'} />
              <SpecRow k="방전 사이클" v={latestBmu.dischargeCycles ?? '-'} />
            </div>
          </div>
        </div>
      )}

      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">BMU 원장 ({bmuRecords.length}건)</h3>
          <button
            onClick={() => navigate(passportId ? `/bmu-data?id=${encodeURIComponent(passportId)}` : '/bmu-data')}
            className="sn-btn-sm-secondary"
          >
            BMU 페이지 열기
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="sn-table">
            <thead>
              <tr>
                <th>시간</th>
                <th style={{ textAlign: 'right' }}>SOC</th>
                <th style={{ textAlign: 'right' }}>전압</th>
                <th style={{ textAlign: 'right' }}>전류</th>
                <th style={{ textAlign: 'right' }}>온도</th>
              </tr>
            </thead>
            <tbody>
              {bmuRecords.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-3)' }}>기록 없음</td></tr>
              ) : (
                bmuRecords.slice(0, 20).map((r, idx) => (
                  <tr key={r.recordId || idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)' }}>{formatDate(r.timestamp)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{scaleSOC(r.soc)}%</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{r.voltage ?? '-'}V</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{r.current ?? '-'}A</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{scaleTemp(r.temperature)}°C</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
