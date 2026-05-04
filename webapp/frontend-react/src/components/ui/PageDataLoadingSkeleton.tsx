import { SkeletonCard, SkeletonTable } from './Skeleton';

interface Props {
  dataPage: string;
  summaryCount: number;
  summaryGridStyle: React.CSSProperties;
  tableRows: number;
  tableCols: number;
}

export default function PageDataLoadingSkeleton({
  dataPage,
  summaryCount,
  summaryGridStyle,
  tableRows,
  tableCols,
}: Props) {
  return (
    <div data-page={dataPage} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={summaryGridStyle}>
        {Array.from({ length: summaryCount }).map((_, i) => (
          <SkeletonCard key={i} lines={2} showTitle />
        ))}
      </div>
      <SkeletonTable rows={tableRows} cols={tableCols} />
    </div>
  );
}
