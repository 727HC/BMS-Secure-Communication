import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import DataTab from './DataTab';
import type { BmuRecord } from './types';

function NavSpy({ onChange }: { onChange: (path: string) => void }) {
  const loc = useLocation();
  onChange(`${loc.pathname}${loc.search}`);
  return null;
}

function renderWithRouter(ui: React.ReactNode) {
  const seen: string[] = [];
  const utils = render(
    <MemoryRouter initialEntries={['/passport-detail/P1']}>
      <Routes>
        <Route path="*" element={<>{ui}<NavSpy onChange={(p) => seen.push(p)} /></>} />
      </Routes>
    </MemoryRouter>,
  );
  return { ...utils, lastPath: () => seen[seen.length - 1] };
}

describe('DataTab', () => {
  it('hides 최근 수집 정보 dossier when no BMU records', () => {
    const { queryByText } = renderWithRouter(<DataTab bmuRecords={[]} passportId="P1" />);
    expect(queryByText('최근 수집 정보')).toBeNull();
  });

  it('renders SOC % from latest record (≤100 passthrough)', () => {
    const records: BmuRecord[] = [{ recordId: 'R1', soc: 80, voltage: 3.7, current: 5, temperature: 25, timestamp: '2026-05-04T00:00:00Z' } as unknown as BmuRecord];
    const { getAllByText } = renderWithRouter(<DataTab bmuRecords={records} passportId="P1" />);
    // SOC appears in dossier + table
    expect(getAllByText('80%').length).toBeGreaterThanOrEqual(2);
  });

  it('renders 0 records empty caption in table when no records', () => {
    const { getByText } = renderWithRouter(<DataTab bmuRecords={[]} passportId="P1" />);
    expect(getByText('기록 없음')).not.toBeNull();
    expect(getByText('BMU 원장 (0건)')).not.toBeNull();
  });

  it('renders up to 20 rows even if records.length > 20', () => {
    const records: BmuRecord[] = Array.from({ length: 25 }, (_, i) => ({
      recordId: `R${i}`,
      soc: 50,
      voltage: 3.7,
      current: 5,
      temperature: 25,
      timestamp: `2026-05-04T0${i}:00:00Z`,
    } as unknown as BmuRecord));
    const { container, getByText } = renderWithRouter(<DataTab bmuRecords={records} passportId="P1" />);
    expect(getByText('BMU 원장 (25건)')).not.toBeNull();
    expect(container.querySelectorAll('tbody tr').length).toBe(20);
  });

  it('navigates to /bmu-data?id=ID when button clicked with passportId', () => {
    const records: BmuRecord[] = [{ recordId: 'R1', soc: 80, voltage: 3.7, current: 5, temperature: 25, timestamp: '2026-05-04T00:00:00Z' } as unknown as BmuRecord];
    const { getByText, lastPath } = renderWithRouter(<DataTab bmuRecords={records} passportId="P1" />);
    fireEvent.click(getByText('BMU 페이지 열기'));
    expect(lastPath()).toBe('/bmu-data?id=P1');
  });

  it('navigates to /bmu-data without query when passportId omitted', () => {
    const { getByText, lastPath } = renderWithRouter(<DataTab bmuRecords={[]} />);
    fireEvent.click(getByText('BMU 페이지 열기'));
    expect(lastPath()).toBe('/bmu-data');
  });

  it('shows dash for missing voltage/current/dischargeCycles in dossier', () => {
    const records: BmuRecord[] = [{ recordId: 'R1', soc: 80, voltage: null, current: null, temperature: 25, timestamp: '2026-05-04T00:00:00Z' } as unknown as BmuRecord];
    const { getAllByText } = renderWithRouter(<DataTab bmuRecords={records} passportId="P1" />);
    // dischargeCycles missing → '-' SpecRow value; voltage/current → '-' too
    expect(getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });

  it('uses latest BMU by timestamp string max', () => {
    const records: BmuRecord[] = [
      { recordId: 'a', soc: 60, voltage: 3.6, current: 4, temperature: 25, timestamp: '2026-04-01T00:00:00Z' } as unknown as BmuRecord,
      { recordId: 'b', soc: 90, voltage: 3.8, current: 6, temperature: 30, timestamp: '2026-05-01T00:00:00Z' } as unknown as BmuRecord,
    ];
    const { getAllByText } = renderWithRouter(<DataTab bmuRecords={records} passportId="P1" />);
    // Latest SOC=90, dossier shows 90% (also in table once)
    expect(getAllByText('90%').length).toBeGreaterThanOrEqual(2);
  });
});
