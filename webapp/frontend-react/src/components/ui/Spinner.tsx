interface SpinnerProps {
  size?: number;
  minHeight?: string;
}

export default function Spinner({ size = 28, minHeight = '40vh' }: SpinnerProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight }}>
      <div
        style={{
          width: size,
          height: size,
          border: '2px solid rgba(0, 0, 0, 0.06)',
          borderTopColor: 'var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}
