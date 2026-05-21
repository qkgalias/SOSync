import { brandAssets } from "../brandAssets";

export function BrandLockup({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className={["brand-lockup", compact ? "brand-lockup--compact" : "", inverse ? "brand-lockup--inverse" : ""]
      .filter(Boolean)
      .join(" ")}
    >
      <img alt="SOSync" className="brand-lockup__mark" src={brandAssets.mark} />
      <div>
        <img alt="SOSync" className="brand-lockup__wordmark" src={brandAssets.wordmark} />
        {!compact ? <span>Disaster Awareness & Evacuation System</span> : null}
      </div>
    </div>
  );
}
