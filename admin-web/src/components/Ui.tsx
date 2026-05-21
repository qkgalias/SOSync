import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={["card", className].filter(Boolean).join(" ")}>{children}</section>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty-state">{message}</div>;
}

export function Field({
  children,
  error,
  helper,
  label,
}: {
  children: ReactNode;
  error?: string;
  helper?: string;
  label: string;
}) {
  return (
    <label className={["field", error ? "field--invalid" : ""].filter(Boolean).join(" ")}>
      <span>{label}</span>
      {children}
      {helper && !error ? <small className="field-helper">{helper}</small> : null}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

export function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal-card" role="dialog">
        <header className="modal-card__header">
          <h3>{title}</h3>
          <button className="icon-button" onClick={onClose} type="button">
            x
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function StatusBadge({ tone = "neutral", value }: { tone?: "danger" | "neutral" | "success" | "warning"; value: string }) {
  return <span className={`status-badge status-badge--${tone}`}>{value}</span>;
}

export function StatCard({
  detail,
  label,
  tone = "neutral",
  value,
}: {
  detail?: string;
  label: string;
  tone?: "danger" | "neutral" | "success" | "warning";
  value: number | string;
}) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__icon" aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}
