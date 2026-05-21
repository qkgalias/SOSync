import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Field, Modal, StatusBadge } from "../components/Ui";
import { GoogleMapPanel } from "../components/GoogleMapPanel";
import { LocationPickerMap } from "../components/LocationPickerMap";
import { getAdminActionErrorMessage } from "../errors";
import { callAdminFunction } from "../firebase";
import type { EvacuationCenter, EvacuationCenterDraft } from "../types";

const emptyCenter: EvacuationCenterDraft = {
  address: "",
  capacity: 0,
  city: "",
  contact: "",
  disabled: false,
  islandGroup: "",
  latitude: 0,
  longitude: 0,
  name: "",
  province: "",
  region: "PH",
  serviceRadiusKm: 2,
};

const pageSize = 7;
type IslandFilter = "all" | "luzon" | "mindanao" | "visayas";

const islandOptions: Array<{ label: string; value: IslandFilter }> = [
  { label: "All Islands", value: "all" },
  { label: "Luzon", value: "luzon" },
  { label: "Visayas", value: "visayas" },
  { label: "Mindanao", value: "mindanao" },
];

const formatCenterArea = (center: EvacuationCenter) =>
  [center.city, center.province, center.region].filter(Boolean).join(", ") || center.address;

const formatCoordinate = (value: number, positive: string, negative: string) =>
  `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positive : negative}`;

const normalizeIslandGroup = (value?: string): IslandFilter | "" => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "luzon" || normalized === "visayas" || normalized === "mindanao") {
    return normalized;
  }
  return "";
};

export function EvacuationCentersPage({
  centers,
  onRefresh,
}: {
  centers: EvacuationCenter[];
  onRefresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<EvacuationCenterDraft | null>(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EvacuationCenterDraft, string>>>({});
  const [filter, setFilter] = useState<"all" | "available" | "disabled">("all");
  const [islandFilter, setIslandFilter] = useState<IslandFilter>("all");
  const [isLegendVisible, setIsLegendVisible] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [mapResetToken, setMapResetToken] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingDisabled, setIsTogglingDisabled] = useState(false);
  const [page, setPage] = useState(1);
  const [pendingDisabledCenter, setPendingDisabledCenter] = useState<EvacuationCenter | null>(null);
  const [toggleError, setToggleError] = useState("");
  const [selectedCenterId, setSelectedCenterId] = useState<string>(() => centers[0]?.centerId ?? "");

  const availableCenters = useMemo(() => centers.filter((center) => !center.disabled), [centers]);
  const disabledCenters = useMemo(() => centers.filter((center) => center.disabled), [centers]);
  const islandCounts = useMemo(
    () =>
      islandOptions.reduce<Record<IslandFilter, number>>(
        (counts, option) => ({
          ...counts,
          [option.value]:
            option.value === "all"
              ? centers.length
              : centers.filter((center) => normalizeIslandGroup(center.islandGroup) === option.value).length,
        }),
        { all: centers.length, luzon: 0, mindanao: 0, visayas: 0 },
      ),
    [centers],
  );
  const islandScopedCenters = useMemo(
    () =>
      islandFilter === "all"
        ? centers
        : centers.filter((center) => normalizeIslandGroup(center.islandGroup) === islandFilter),
    [centers, islandFilter],
  );
  const visibleCenters = useMemo(() => {
    if (filter === "available") {
      return islandScopedCenters.filter((center) => !center.disabled);
    }
    if (filter === "disabled") {
      return islandScopedCenters.filter((center) => center.disabled);
    }
    return islandScopedCenters;
  }, [filter, islandScopedCenters]);
  const totalPages = Math.max(1, Math.ceil(visibleCenters.length / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const pageCenters = visibleCenters.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);
  const selectedCenter = visibleCenters.find((center) => center.centerId === selectedCenterId) ?? visibleCenters[0] ?? null;
  const selectedCenterNumber = selectedCenter ? Math.max(1, visibleCenters.findIndex((center) => center.centerId === selectedCenter.centerId) + 1) : 1;
  const isEmptyDisabledView = filter === "disabled" && visibleCenters.length === 0;
  const mapCenters = visibleCenters;
  const mapEmptyMessage = isEmptyDisabledView
    ? {
        body: "The map remains visible for geographic context.",
        title: "No disabled safety hubs",
      }
    : {
        body: "Try another island group or status filter.",
        title: "No centers in this view",
      };

  useEffect(() => {
    if (!visibleCenters.length) {
      setSelectedCenterId("");
      return;
    }
    if (!visibleCenters.some((center) => center.centerId === selectedCenterId)) {
      setSelectedCenterId(visibleCenters[0].centerId);
    }
  }, [selectedCenterId, visibleCenters]);

  const selectFilter = (nextFilter: "all" | "available" | "disabled") => {
    setFilter(nextFilter);
    setPage(1);
  };

  const selectIslandFilter = (nextFilter: IslandFilter) => {
    setIslandFilter(nextFilter);
    setPage(1);
  };

  const selectCenter = useCallback((centerId: string) => {
    setSelectedCenterId(centerId);
  }, []);

  const openDraft = (nextDraft: EvacuationCenterDraft) => {
    setFieldErrors({});
    setFormError("");
    setDraft(nextDraft);
  };

  const validateDraft = (nextDraft: EvacuationCenterDraft) => {
    const errors: Partial<Record<keyof EvacuationCenterDraft, string>> = {};
    if (!nextDraft.name.trim()) {
      errors.name = "Enter an evacuation center name.";
    }
    if (!nextDraft.address.trim()) {
      errors.address = "Enter the center address.";
    }
    if (!nextDraft.contact.trim()) {
      errors.contact = "Enter a contact number or contact office.";
    }
    if (!nextDraft.city?.trim()) {
      errors.city = "Enter the city or municipality.";
    }
    if (!Number.isFinite(nextDraft.latitude) || nextDraft.latitude < -90 || nextDraft.latitude > 90) {
      errors.latitude = "Latitude must be between -90 and 90.";
    }
    if (!Number.isFinite(nextDraft.longitude) || nextDraft.longitude < -180 || nextDraft.longitude > 180) {
      errors.longitude = "Longitude must be between -180 and 180.";
    }
    if (!Number.isFinite(nextDraft.capacity) || nextDraft.capacity < 0) {
      errors.capacity = "Capacity must be 0 or higher.";
    }
    if (nextDraft.serviceRadiusKm !== undefined && (!Number.isFinite(nextDraft.serviceRadiusKm) || nextDraft.serviceRadiusKm <= 0)) {
      errors.serviceRadiusKm = "Service radius must be greater than 0.";
    }
    return errors;
  };

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
    const sanitizedDraft: EvacuationCenterDraft = {
      ...draft,
      address: draft.address.trim(),
      city: draft.city?.trim() ?? "",
      contact: draft.contact.trim(),
      islandGroup: draft.islandGroup?.trim() ?? "",
      name: draft.name.trim(),
      province: draft.province?.trim() ?? "",
      region: draft.region?.trim() || "PH",
    };
    setIsSaving(true);
    try {
      await callAdminFunction<typeof sanitizedDraft, { centerId: string }>("upsertEvacuationCenter", sanitizedDraft);
      setDraft(null);
      await onRefresh();
    } catch (nextError) {
      setFormError(getAdminActionErrorMessage(nextError, "Unable to save this evacuation center. Review the form and try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraftLocation = useCallback((nextValue: Partial<EvacuationCenterDraft>) => {
    setDraft((currentDraft) => (currentDraft ? { ...currentDraft, ...nextValue } : currentDraft));
  }, []);

  const confirmDisabledToggle = async () => {
    if (!pendingDisabledCenter) {
      return;
    }
    setToggleError("");
    setIsTogglingDisabled(true);
    const nextDraft: EvacuationCenterDraft = {
      ...pendingDisabledCenter,
      disabled: !pendingDisabledCenter.disabled,
      region: pendingDisabledCenter.region?.trim() || "PH",
    };
    try {
      await callAdminFunction<typeof nextDraft, { centerId: string }>("upsertEvacuationCenter", nextDraft);
      setPendingDisabledCenter(null);
      await onRefresh();
    } catch (nextError) {
      setToggleError(
        getAdminActionErrorMessage(
          nextError,
          pendingDisabledCenter.disabled
            ? "Unable to enable this evacuation center. Try again."
            : "Unable to disable this evacuation center. Try again.",
        ),
      );
    } finally {
      setIsTogglingDisabled(false);
    }
  };

  return (
    <div className="evacuation-workspace">
      <section className="evacuation-side-panel" aria-label="Evacuation center records">
        <div className="evacuation-stats">
          <div>
            <span>Total Centers</span>
            <strong>{centers.length}</strong>
          </div>
          <div>
            <span>Available</span>
            <strong className="text-success">{availableCenters.length}</strong>
          </div>
          <div>
            <span>Disabled</span>
            <strong>{disabledCenters.length}</strong>
          </div>
        </div>
        <div className="evacuation-island-filter" aria-label="Filter centers by island group">
          {islandOptions.map((option) => (
            <button
              className={islandFilter === option.value ? "map-chip active" : "map-chip"}
              key={option.value}
              onClick={() => selectIslandFilter(option.value)}
              type="button"
            >
              <span>{option.label}</span>
              <strong>{islandCounts[option.value]}</strong>
            </button>
          ))}
        </div>
        <button className="primary-button evacuation-add-button" onClick={() => openDraft(emptyCenter)} type="button">
          <span aria-hidden="true">+</span>
          Add Center
        </button>
        <div className="evacuation-list" role="list">
          {pageCenters.length ? (
            pageCenters.map((center, index) => (
              <div
                className={selectedCenter?.centerId === center.centerId ? "evacuation-list-item active" : "evacuation-list-item"}
                key={center.centerId}
                role="listitem"
              >
                <button className="evacuation-list-main" onClick={() => selectCenter(center.centerId)} type="button">
                  <span className={center.disabled ? "center-index center-index--disabled" : "center-index"}>
                    {(normalizedPage - 1) * pageSize + index + 1}
                  </span>
                  <span>
                    <strong>{center.name}</strong>
                    <small>{formatCenterArea(center)}</small>
                  </span>
                </button>
                <button
                  className={center.disabled ? "center-quick-action center-quick-action--enable" : "center-quick-action"}
                  disabled={isTogglingDisabled}
                  onClick={() => {
                    setToggleError("");
                    setPendingDisabledCenter(center);
                  }}
                  type="button"
                >
                  {center.disabled ? "Enable" : "Disable"}
                </button>
              </div>
            ))
          ) : (
            <div className="evacuation-empty">
              {isEmptyDisabledView ? "No disabled safety hubs." : "No centers match this view."}
            </div>
          )}
        </div>
        <div className="evacuation-pagination">
          <span>
            Showing {visibleCenters.length ? (normalizedPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(normalizedPage * pageSize, visibleCenters.length)} of {visibleCenters.length} centers
          </span>
          <div>
            <button disabled={normalizedPage === 1} onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))} type="button">
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 4) }, (_, index) => index + 1).map((pageNumber) => (
              <button
                className={normalizedPage === pageNumber ? "active" : ""}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              disabled={normalizedPage === totalPages}
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              type="button"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      <section className={isMapExpanded ? "evacuation-map-panel evacuation-map-panel--expanded" : "evacuation-map-panel"} aria-label="Evacuation center map">
        <div className="evacuation-map-toolbar">
          <button className="map-chip map-chip--select" onClick={() => selectFilter("all")} type="button">
            All Centers
            <svg aria-hidden="true" className="map-chip__chevron" viewBox="0 0 16 16">
              <path d="m4 6 4 4 4-4" />
            </svg>
          </button>
          <button className={filter === "available" ? "map-chip active" : "map-chip"} onClick={() => selectFilter("available")} type="button">
            <span className="legend-dot legend-dot--available" aria-hidden="true" />
            Available
          </button>
          <button className={filter === "disabled" ? "map-chip active" : "map-chip"} onClick={() => selectFilter("disabled")} type="button">
            <span className="legend-dot legend-dot--disabled" aria-hidden="true" />
            Disabled
          </button>
        </div>
        <div className="evacuation-map-tools">
          <button onClick={() => setIsLegendVisible((isVisible) => !isVisible)} type="button">Layers</button>
          <button aria-label="Reset map zoom" onClick={() => setMapResetToken((current) => current + 1)} type="button">⛶</button>
        </div>
        <GoogleMapPanel
          centers={mapCenters}
          emptyMessage={mapEmptyMessage}
          mapResetToken={mapResetToken}
          onSelectCenter={selectCenter}
          selectedCenterId={selectedCenter?.centerId}
          showDisabled
          variant="centers"
        />
        <div className={isLegendVisible ? "evacuation-legend" : "evacuation-legend evacuation-legend--hidden"}>
          <strong>Legend</strong>
          <span>
            <i className="legend-dot legend-dot--available" />
            Available
          </span>
          <span>
            <i className="legend-dot legend-dot--disabled" />
            Disabled
          </span>
        </div>
        {selectedCenter ? (
          <aside className="center-detail-card">
            <div className="center-detail-card__header">
              <span className={selectedCenter.disabled ? "center-index center-index--disabled" : "center-index"}>{selectedCenterNumber}</span>
              <div>
                <h3>{selectedCenter.name}</h3>
                <StatusBadge tone={selectedCenter.disabled ? "neutral" : "success"} value={selectedCenter.disabled ? "Disabled" : "Available"} />
              </div>
            </div>
            <dl className="center-detail-list">
              <div>
                <dt>Area</dt>
                <dd>{formatCenterArea(selectedCenter)}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{selectedCenter.address}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{selectedCenter.contact}</dd>
              </div>
              <div>
                <dt>Capacity</dt>
                <dd>{selectedCenter.capacity.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>
                  {formatCoordinate(selectedCenter.latitude, "N", "S")}, {formatCoordinate(selectedCenter.longitude, "E", "W")}
                </dd>
              </div>
            </dl>
            <div className="center-detail-actions">
              <button className="primary-button" onClick={() => openDraft(selectedCenter)} type="button">
                Edit Center
              </button>
            </div>
          </aside>
        ) : null}
      </section>

      {draft ? (
        <Modal onClose={() => setDraft(null)} title={draft.centerId ? "Edit evacuation center" : "Add evacuation center"}>
          <form className="modal-form modal-form--grid center-form-modal" onSubmit={submit}>
            {formError ? <p className="inline-form-error modal-actions--wide">{formError}</p> : null}
            <div className="modal-actions--wide">
              <LocationPickerMap
                onChange={updateDraftLocation}
                value={{
                  address: draft.address,
                  city: draft.city,
                  latitude: draft.latitude,
                  longitude: draft.longitude,
                  province: draft.province,
                  region: draft.region,
                }}
              />
            </div>
            <Field error={fieldErrors.name} label="Name">
              <input aria-invalid={Boolean(fieldErrors.name)} onChange={(event) => setDraft({ ...draft, name: event.target.value })} value={draft.name} />
            </Field>
            <Field error={fieldErrors.contact} label="Contact">
              <input aria-invalid={Boolean(fieldErrors.contact)} onChange={(event) => setDraft({ ...draft, contact: event.target.value })} value={draft.contact} />
            </Field>
            <Field error={fieldErrors.address} label="Address">
              <textarea aria-invalid={Boolean(fieldErrors.address)} onChange={(event) => setDraft({ ...draft, address: event.target.value })} value={draft.address} />
            </Field>
            <Field error={fieldErrors.capacity} label="Capacity">
              <input aria-invalid={Boolean(fieldErrors.capacity)} min="0" onChange={(event) => setDraft({ ...draft, capacity: Number(event.target.value) })} type="number" value={draft.capacity} />
            </Field>
            <Field error={fieldErrors.latitude} label="Latitude">
              <input aria-invalid={Boolean(fieldErrors.latitude)} max="90" min="-90" onChange={(event) => setDraft({ ...draft, latitude: Number(event.target.value) })} step="any" type="number" value={draft.latitude} />
            </Field>
            <Field error={fieldErrors.longitude} label="Longitude">
              <input aria-invalid={Boolean(fieldErrors.longitude)} max="180" min="-180" onChange={(event) => setDraft({ ...draft, longitude: Number(event.target.value) })} step="any" type="number" value={draft.longitude} />
            </Field>
            <Field error={fieldErrors.city} label="City / Municipality">
              <input aria-invalid={Boolean(fieldErrors.city)} onChange={(event) => setDraft({ ...draft, city: event.target.value })} value={draft.city} />
            </Field>
            <details className="form-disclosure modal-actions--wide" open={Boolean(fieldErrors.serviceRadiusKm)}>
              <summary>Additional details</summary>
              <div className="form-disclosure__grid">
                <Field label="Province">
                  <input onChange={(event) => setDraft({ ...draft, province: event.target.value })} value={draft.province} />
                </Field>
                <Field label="Region">
                  <input onChange={(event) => setDraft({ ...draft, region: event.target.value })} value={draft.region} />
                </Field>
                <Field label="Island group">
                  <select onChange={(event) => setDraft({ ...draft, islandGroup: event.target.value })} value={draft.islandGroup}>
                    <option value="">Unspecified</option>
                    <option value="Luzon">Luzon</option>
                    <option value="Visayas">Visayas</option>
                    <option value="Mindanao">Mindanao</option>
                  </select>
                </Field>
                <Field error={fieldErrors.serviceRadiusKm} label="Service radius km">
                  <input
                    aria-invalid={Boolean(fieldErrors.serviceRadiusKm)}
                    min="0.1"
                    onChange={(event) => setDraft({ ...draft, serviceRadiusKm: Number(event.target.value) })}
                    step="any"
                    type="number"
                    value={draft.serviceRadiusKm}
                  />
                </Field>
              </div>
            </details>
            <div className="modal-actions modal-actions--wide">
              <button className="primary-button" disabled={isSaving} type="submit">
                {isSaving ? "Saving..." : "Save center"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {pendingDisabledCenter ? (
        <Modal
          onClose={() => {
            if (!isTogglingDisabled) {
              setPendingDisabledCenter(null);
              setToggleError("");
            }
          }}
          title={pendingDisabledCenter.disabled ? "Enable center?" : "Disable center?"}
        >
          <div className="confirmation-modal">
            <p>
              {pendingDisabledCenter.disabled
                ? `${pendingDisabledCenter.name} will be marked available and shown again in the center list.`
                : `${pendingDisabledCenter.name} will be marked disabled and removed from the available center count.`}
            </p>
            {toggleError ? <p className="inline-form-error">{toggleError}</p> : null}
            <div className="modal-actions">
              <button className="primary-button" disabled={isTogglingDisabled} onClick={confirmDisabledToggle} type="button">
                {isTogglingDisabled ? "Saving..." : pendingDisabledCenter.disabled ? "Enable center" : "Disable center"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
