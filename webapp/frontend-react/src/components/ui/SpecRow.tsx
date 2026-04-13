interface SpecRowProps {
  k: string;
  v: string | number | undefined | null;
  mono?: boolean;
}

export default function SpecRow({ k, v, mono = false }: SpecRowProps) {
  return (
    <div className="sn-detail-spec-pair">
      <span className="sn-detail-spec-key">{k}</span>
      <span className={mono ? 'sn-detail-spec-value-mono' : 'sn-detail-spec-value'}>{v ?? '-'}</span>
    </div>
  );
}
