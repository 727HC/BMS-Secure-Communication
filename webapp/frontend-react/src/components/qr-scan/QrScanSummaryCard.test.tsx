import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import QrScanSummaryCard from './QrScanSummaryCard';
import type { QrPassport } from './QrScanResultPanel';

describe('QrScanSummaryCard', () => {
  it('renders 대기 중 when scanResult null', () => {
    const { getByText } = render(<QrScanSummaryCard scanResult={null} loadingPassport={false} passportData={null} scanError={null} />);
    expect(getByText('대기 중')).not.toBeNull();
    expect(getByText('대기')).not.toBeNull();
  });

  it('shows scanResult mono text when set', () => {
    const { getByText } = render(<QrScanSummaryCard scanResult="P-XYZ" loadingPassport={false} passportData={null} scanError={null} />);
    expect(getByText('P-XYZ')).not.toBeNull();
  });

  it('shows 조회 중 when loadingPassport=true', () => {
    const { getByText } = render(<QrScanSummaryCard scanResult="P1" loadingPassport={true} passportData={null} scanError={null} />);
    expect(getByText('조회 중')).not.toBeNull();
  });

  it('shows 여권 확인 when passportData present', () => {
    const passport = { passportId: 'P1' } as QrPassport;
    const { getByText } = render(<QrScanSummaryCard scanResult="P1" loadingPassport={false} passportData={passport} scanError={null} />);
    expect(getByText('여권 확인')).not.toBeNull();
  });

  it('shows 조회 실패 when scanError present and no data', () => {
    const { getByText } = render(<QrScanSummaryCard scanResult="P1" loadingPassport={false} passportData={null} scanError="Not found" />);
    expect(getByText('조회 실패')).not.toBeNull();
  });

  it('renders scan API 없음 stamp', () => {
    const { getByText } = render(<QrScanSummaryCard scanResult={null} loadingPassport={false} passportData={null} scanError={null} />);
    expect(getByText('scan API 없음')).not.toBeNull();
  });
});
