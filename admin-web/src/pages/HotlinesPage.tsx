import { FormEvent, useEffect, useMemo, useState } from "react";

import { callAdminFunction } from "../firebase";
import { EmptyState, Field, Modal } from "../components/Ui";
import { getAdminActionErrorMessage } from "../errors";
import type { Hotline, HotlineDraft } from "../types";

const PAGE_SIZE = 7;

type HotlineStatusFilter = "active" | "all" | "disabled";

const emptyHotline: HotlineDraft = {
  description: "",
  disabled: false,
  name: "",
  phone: "",
  region: "",
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

function getLegacyHotlineCity(hotline: Hotline) {
  const id = normalize(hotline.hotlineId);
  const name = normalize(hotline.name);
  if (
    id.includes("tabunok") ||
    id.includes("bfp-talisay") ||
    id.includes("pnp-talisay") ||
    id.includes("talisay-drrmo") ||
    name.includes("tabunok") ||
    name.includes("bureau of fire") ||
    name.includes("philippine national police") ||
    name.includes("drrmo")
  ) {
    return "Talisay";
  }
  if (id.includes("ndrrmc") || id === "911" || name.includes("ndrrmc") || name.includes("national emergency")) {
    return "Quezon City";
  }
  if (id.includes("red-cross") || name.includes("red cross")) {
    return "Pasig City";
  }
  return "";
}

function getHotlineCity(hotline: Hotline, manuallySavedPhIds: ReadonlySet<string>) {
  const region = hotline.region?.trim();
  if (region && normalize(region) !== "ph") {
    return region;
  }
  if (region && manuallySavedPhIds.has(hotline.hotlineId)) {
    return region;
  }
  return getLegacyHotlineCity(hotline) || region || "PH";
}

function formatCityArea(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length <= 3) {
    return trimmed;
  }
  const lettersOnly = trimmed.replace(/[^A-Za-z]/g, "");
  if (!lettersOnly || (lettersOnly.length <= 3 && trimmed === trimmed.toUpperCase())) {
    return trimmed;
  }
  if (trimmed === trimmed.toUpperCase() || trimmed === trimmed.toLowerCase()) {
    return trimmed.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }
  return trimmed;
}

export function HotlinesPage({
  hotlines,
  onRefresh,
}: {
  hotlines: Hotline[];
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
  const [manuallySavedPhIds, setManuallySavedPhIds] = useState<Set<string>>(() => new Set());

  const activeHotlines = hotlines.filter((hotline) => !hotline.disabled);
  const disabledHotlines = hotlines.filter((hotline) => hotline.disabled);
  const citiesCovered = new Set(hotlines.map((hotline) => normalize(getHotlineCity(hotline, manuallySavedPhIds))).filter(Boolean)).size;

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
        getHotlineCity(hotline, manuallySavedPhIds),
        hotline.region,
        hotline.description,
        status,
      ].some((value) => normalize(value).includes(search));
    });
  }, [hotlines, manuallySavedPhIds, query, statusFilter]);

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
    const legacyCity =
      nextDraft.hotlineId && normalize(nextDraft.region) === "ph" && !manuallySavedPhIds.has(nextDraft.hotlineId)
        ? getLegacyHotlineCity(nextDraft as Hotline)
        : "";
    setDraft({
      ...nextDraft,
      region: legacyCity || nextDraft.region,
    });
  };

  const validateDraft = (nextDraft: HotlineDraft) => {
    const errors: Partial<Record<keyof HotlineDraft, string>> = {};
    if (!nextDraft.name.trim()) {
      errors.name = "Enter a hotline name.";
    }
    if (!nextDraft.phone.trim()) {
      errors.phone = "Enter a phone number.";
    }
    if (!nextDraft.region.trim()) {
      errors.region = "Enter the city or area covered.";
    }
    return errors;
  };

  const sanitizeDraft = (nextDraft: HotlineDraft): HotlineDraft => ({
    ...nextDraft,
    description: nextDraft.description?.trim() ?? "",
    disabled: Boolean(nextDraft.disabled),
    name: nextDraft.name.trim(),
    phone: nextDraft.phone.trim(),
    region: formatCityArea(nextDraft.region),
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
      setManuallySavedPhIds((current) => {
        const nextIds = new Set(current);
        const hotlineId = draft.hotlineId || result.hotlineId;
        if (hotlineId && normalize(sanitizedDraft.region) === "ph") {
          nextIds.add(hotlineId);
        } else if (hotlineId) {
          nextIds.delete(hotlineId);
        }
        return nextIds;
      });
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
            <span>Cities Covered</span>
            <strong>{citiesCovered}</strong>
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
                  <th>City</th>
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
                    <td>{getHotlineCity(hotline, manuallySavedPhIds)}</td>
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
            <Field error={fieldErrors.region} label="City / Area">
              <input
                aria-invalid={Boolean(fieldErrors.region)}
                onChange={(event) => setDraft({ ...draft, region: event.target.value })}
                value={draft.region}
              />
            </Field>
            <Field label="Description">
              <textarea onChange={(event) => setDraft({ ...draft, description: event.target.value })} value={draft.description} />
            </Field>
            <div className="modal-actions modal-actions--end">
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
    </div>
  );
}
