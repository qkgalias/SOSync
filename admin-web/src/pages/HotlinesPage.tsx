import { FormEvent, useEffect, useMemo, useState } from "react";

import { callAdminFunction } from "../firebase";
import { EmptyState, Field, Modal } from "../components/Ui";
import { getAdminActionErrorMessage } from "../errors";
import type { Hotline, HotlineDraft } from "../types";
import { formatCityArea, resolveHotlineCityArea } from "./hotlineHelpers";

const PAGE_SIZE = 7;

type HotlineStatusFilter = "active" | "all" | "disabled";

const emptyHotline: HotlineDraft = {
  cityArea: "",
  description: "",
  disabled: false,
  name: "",
  phone: "",
  region: "PH",
};

function PhoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.08 5.18 2 2 0 0 1 5.06 3h3a2 2 0 0 1 2 1.72c.12.89.32 1.76.59 2.6a2 2 0 0 1-.45 2.11L9 10.63a16 16 0 0 0 4.37 4.37l1.2-1.2a2 2 0 0 1 2.11-.45c.84.27 1.71.47 2.6.59A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function StatIcon({ type }: { type: "active" | "cities" | "disabled" | "total" }) {
  if (type === "active") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M20 6 9 17l-5-5" />
        <path d="M21 12a9 9 0 1 1-4.7-7.9" />
      </svg>
    );
  }
  if (type === "disabled") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 7h10v10H7z" />
        <path d="m4 20 16-16" />
      </svg>
    );
  }
  if (type === "cities") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }
  return <PhoneIcon />;
}

function statusMatches(hotline: Hotline, statusFilter: HotlineStatusFilter) {
  if (statusFilter === "active") {
    return !hotline.disabled;
  }
  if (statusFilter === "disabled") {
    return Boolean(hotline.disabled);
  }
  return true;
}

function normalize(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

export function HotlinesPage({
  hotlines,
  notificationTargetId,
  onConsumeNotificationTarget,
  onRefresh,
}: {
  hotlines: Hotline[];
  notificationTargetId: string;
  onConsumeNotificationTarget: (unavailableMessage?: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<HotlineDraft | null>(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof HotlineDraft, string>>>({});
  const [actionError, setActionError] = useState("");
  const [busyHotlineId, setBusyHotlineId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<HotlineStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pendingToggle, setPendingToggle] = useState<Hotline | null>(null);
  const [pendingDeleteHotline, setPendingDeleteHotline] = useState<Hotline | null>(null);
  const [isDeletingHotline, setIsDeletingHotline] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const activeHotlines = hotlines.filter((hotline) => !hotline.disabled);
  const disabledHotlines = hotlines.filter((hotline) => hotline.disabled);
  const areasCovered = new Set(hotlines.map((hotline) => normalize(resolveHotlineCityArea(hotline))).filter(Boolean)).size;

  const filteredHotlines = useMemo(() => {
    const search = normalize(query);
    return hotlines.filter((hotline) => {
      if (!statusMatches(hotline, statusFilter)) {
        return false;
      }
      if (!search) {
        return true;
      }
      const status = hotline.disabled ? "disabled" : "active";
      return [
        hotline.name,
        hotline.phone,
        resolveHotlineCityArea(hotline),
        hotline.region,
        hotline.description,
        status,
      ].some((value) => normalize(value).includes(search));
    });
  }, [hotlines, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredHotlines.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visibleHotlines = filteredHotlines.slice(pageStart, pageStart + PAGE_SIZE);
  const showingStart = filteredHotlines.length ? pageStart + 1 : 0;
  const showingEnd = Math.min(pageStart + visibleHotlines.length, filteredHotlines.length);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const openDraft = (nextDraft: HotlineDraft) => {
    setActionError("");
    setFieldErrors({});
    setFormError("");
    setDraft({
      ...nextDraft,
      cityArea: resolveHotlineCityArea(nextDraft) || "",
      region: "PH",
    });
  };

  useEffect(() => {
    if (!notificationTargetId) return;
    const hotline = hotlines.find((item) => item.hotlineId === notificationTargetId);
    if (!hotline) {
      onConsumeNotificationTarget("This hotline is no longer available.");
      return;
    }
    setActionError("");
    setFieldErrors({});
    setFormError("");
    setDraft({ ...hotline, cityArea: resolveHotlineCityArea(hotline), region: "PH" });
    onConsumeNotificationTarget();
  }, [hotlines, notificationTargetId, onConsumeNotificationTarget]);

  const validateDraft = (nextDraft: HotlineDraft) => {
    const errors: Partial<Record<keyof HotlineDraft, string>> = {};
    if (!nextDraft.name.trim()) {
      errors.name = "Enter a hotline name.";
    }
    if (!nextDraft.phone.trim()) {
      errors.phone = "Enter a phone number.";
    }
    if (!nextDraft.cityArea?.trim()) {
      errors.cityArea = "Enter the city or area covered.";
    }
    return errors;
  };

  const sanitizeDraft = (nextDraft: HotlineDraft): HotlineDraft => ({
    ...nextDraft,
    cityArea: formatCityArea(nextDraft.cityArea ?? ""),
    description: nextDraft.description?.trim() ?? "",
    disabled: Boolean(nextDraft.disabled),
    name: nextDraft.name.trim(),
    phone: nextDraft.phone.trim(),
    region: "PH",
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) {
      return;
    }
    setFormError("");
    const nextFieldErrors = validateDraft(draft);
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      return;
    }
    const sanitizedDraft = sanitizeDraft(draft);
    setIsSaving(true);
    try {
      const result = await callAdminFunction<typeof sanitizedDraft, { hotlineId: string }>("upsertHotline", sanitizedDraft);
      setDraft(null);
      await onRefresh();
    } catch (nextError) {
      setFormError(getAdminActionErrorMessage(nextError, "Unable to save this hotline. Review the form and try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleHotlineStatus = async (hotline: Hotline) => {
    setActionError("");
    setBusyHotlineId(hotline.hotlineId);
    try {
      const nextDraft = sanitizeDraft({
        ...hotline,
        disabled: !hotline.disabled,
      });
      await callAdminFunction<typeof nextDraft, { hotlineId: string }>("upsertHotline", nextDraft);
      setPendingToggle(null);
      await onRefresh();
    } catch (nextError) {
      setActionError(
        getAdminActionErrorMessage(
          nextError,
          `Unable to ${hotline.disabled ? "enable" : "disable"} this hotline. Try again.`,
        ),
      );
    } finally {
      setBusyHotlineId("");
    }
  };

  const confirmDeleteHotline = async () => {
    if (!pendingDeleteHotline) {
      return;
    }
    setFormError("");
    setDeleteError("");
    setIsDeletingHotline(true);
    try {
      await callAdminFunction<{ hotlineId: string }, { success: true }>("deleteHotline", {
        hotlineId: pendingDeleteHotline.hotlineId,
      });
      setPendingDeleteHotline(null);
      if (draft?.hotlineId === pendingDeleteHotline.hotlineId) {
        setDraft(null);
      }
      await onRefresh();
    } catch (nextError) {
      setDeleteError(getAdminActionErrorMessage(nextError, "Unable to remove this hotline. Try again."));
    } finally {
      setIsDeletingHotline(false);
    }
  };

  return (
    <div className="hotlines-page">
      <section className="hotline-stats-row" aria-label="Hotline metrics">
        <article className="hotline-stat-card hotline-stat-card--danger">
          <span className="hotline-stat-card__icon">
            <StatIcon type="total" />
          </span>
          <div>
            <span>Total Hotlines</span>
            <strong>{hotlines.length}</strong>
          </div>
        </article>
        <article className="hotline-stat-card hotline-stat-card--success">
          <span className="hotline-stat-card__icon">
            <StatIcon type="active" />
          </span>
          <div>
            <span>Active</span>
            <strong>{activeHotlines.length}</strong>
          </div>
        </article>
        <article className="hotline-stat-card hotline-stat-card--neutral">
          <span className="hotline-stat-card__icon">
            <StatIcon type="disabled" />
          </span>
          <div>
            <span>Disabled</span>
            <strong>{disabledHotlines.length}</strong>
          </div>
        </article>
        <article className="hotline-stat-card hotline-stat-card--neutral">
          <span className="hotline-stat-card__icon">
            <StatIcon type="cities" />
          </span>
          <div>
            <span>Areas Covered</span>
            <strong>{areasCovered}</strong>
          </div>
        </article>
        <button className="primary-button hotline-add-button" onClick={() => openDraft(emptyHotline)} type="button">
          <span aria-hidden="true">+</span>
          Add Hotline
        </button>
      </section>

      <section className="hotlines-table-card">
        <div className="hotlines-toolbar">
          <label className="hotline-search">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="sr-only">Search hotlines</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search hotlines..."
              type="search"
              value={query}
            />
          </label>
          <label className="hotline-filter">
            <span className="hotline-filter__control">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M3 5h18l-7 8v5l-4 2v-7L3 5Z" />
            </svg>
            <span className="sr-only">Filter hotlines</span>
            <select onChange={(event) => setStatusFilter(event.target.value as HotlineStatusFilter)} value={statusFilter}>
              <option value="all">Filter: All</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
            </span>
          </label>
        </div>

        {actionError ? <p className="inline-form-error">{actionError}</p> : null}

        {visibleHotlines.length ? (
          <div className="hotline-table-wrap">
            <table className="hotline-table">
              <thead>
                <tr>
                  <th>Hotline name</th>
                  <th>Phone number</th>
                  <th>City / Area</th>
                  <th>Status</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleHotlines.map((hotline) => (
                  <tr key={hotline.hotlineId}>
                    <td>
                      <strong>{hotline.name}</strong>
                    </td>
                    <td>
                      <span className="phone-cell">
                        <PhoneIcon />
                        {hotline.phone}
                      </span>
                    </td>
                    <td>{resolveHotlineCityArea(hotline) || "PH"}</td>
                    <td>
                      <span className={`hotline-status-text hotline-status-text--${hotline.disabled ? "disabled" : "active"}`}>
                        {hotline.disabled ? "Disabled" : "Active"}
                      </span>
                    </td>
                    <td>{hotline.description || "No description provided."}</td>
                    <td>
                      <div className="hotline-actions">
                        <button onClick={() => openDraft(hotline)} type="button">
                          Edit
                        </button>
                        <button
                          className="danger-outline-button"
                          disabled={busyHotlineId === hotline.hotlineId}
                          onClick={() => setPendingToggle(hotline)}
                          type="button"
                        >
                          {hotline.disabled ? "Enable" : "Disable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message={hotlines.length ? "No hotlines match this view." : "No hotlines loaded yet."} />
        )}

        <footer className="hotlines-pagination">
          <span>
            Showing {showingStart} to {showingEnd} of {filteredHotlines.length} hotlines
          </span>
          <div>
            <button disabled={safePage <= 1} onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))} type="button">
              ‹
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button
                className={pageNumber === safePage ? "active" : ""}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              disabled={safePage >= pageCount}
              onClick={() => setPage((currentPage) => Math.min(pageCount, currentPage + 1))}
              type="button"
            >
              ›
            </button>
          </div>
        </footer>
      </section>

      {draft ? (
        <Modal onClose={() => setDraft(null)} title={draft.hotlineId ? "Edit hotline" : "Add hotline"}>
          <form className="modal-form" onSubmit={submit}>
            {formError ? <p className="inline-form-error">{formError}</p> : null}
            <Field error={fieldErrors.name} label="Name">
              <input
                aria-invalid={Boolean(fieldErrors.name)}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                value={draft.name}
              />
            </Field>
            <Field error={fieldErrors.phone} helper="Use the public contact format shown in the mobile app." label="Phone">
              <input
                aria-invalid={Boolean(fieldErrors.phone)}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                value={draft.phone}
              />
            </Field>
            <Field error={fieldErrors.cityArea} label="City / Area">
              <input
                aria-invalid={Boolean(fieldErrors.cityArea)}
                onChange={(event) => setDraft({ ...draft, cityArea: event.target.value })}
                value={draft.cityArea ?? ""}
              />
            </Field>
            <Field label="Description">
              <textarea onChange={(event) => setDraft({ ...draft, description: event.target.value })} value={draft.description} />
            </Field>
            <div className="modal-actions">
              {draft.hotlineId ? (
                <button
                  className="danger-outline-button"
                  disabled={isSaving}
                  onClick={() => {
                    setDeleteError("");
                    setPendingDeleteHotline({ ...draft, hotlineId: draft.hotlineId } as Hotline);
                  }}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
              <button className="primary-button" disabled={isSaving} type="submit">
                {isSaving ? "Saving..." : "Save hotline"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {pendingToggle ? (
        <Modal onClose={() => setPendingToggle(null)} title={`${pendingToggle.disabled ? "Enable" : "Disable"} hotline?`}>
          <div className="confirmation-modal">
            <p>
              {pendingToggle.disabled
                ? `${pendingToggle.name} will become visible again in the admin hotline list.`
                : `${pendingToggle.name} will be marked disabled and hidden from active hotline counts.`}
            </p>
            <div className="modal-actions">
              <button className="primary-button" disabled={busyHotlineId === pendingToggle.hotlineId} onClick={() => void toggleHotlineStatus(pendingToggle)} type="button">
                {busyHotlineId === pendingToggle.hotlineId
                  ? "Saving..."
                  : pendingToggle.disabled
                    ? "Enable Hotline"
                    : "Disable Hotline"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
      {pendingDeleteHotline ? (
        <Modal
          onClose={() => {
            if (!isDeletingHotline) {
              setPendingDeleteHotline(null);
              setDeleteError("");
            }
          }}
          title="Remove hotline?"
        >
          <div className="confirmation-modal">
            <p>
              {pendingDeleteHotline.name} will be permanently removed from the admin hotline list. This cannot be undone.
            </p>
            {deleteError ? <p className="inline-form-error">{deleteError}</p> : null}
            <div className="modal-actions">
              <button
                className="danger-outline-button"
                disabled={isDeletingHotline}
                onClick={() => void confirmDeleteHotline()}
                type="button"
              >
                {isDeletingHotline ? "Removing..." : "Remove hotline"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
