import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Field, Modal, StatusBadge } from "../components/Ui";
import { GoogleMapPanel } from "../components/GoogleMapPanel";
import { LocationPickerMap } from "../components/LocationPickerMap";
import { getAdminActionErrorMessage } from "../errors";
import { callAdminFunction } from "../firebase";
import type { EvacuationCenter, EvacuationCenterDraft } from "../types";
import {
  formatEvacuationCenterArea,
  isValidEvacuationCenterContact,
  getPhilippineRegionByCode,
  limitEvacuationCenterContactInput,
  EVACUATION_CENTER_PAGE_SIZE,
  PHILIPPINE_COUNTRY_CODE,
  PHILIPPINE_REGIONS,
  sanitizeEvacuationCenterDraft,
} from "./evacuationCenterHelpers";

const emptyCenter: EvacuationCenterDraft = {
  address: "",
  capacity: 0,
  city: "",
  contact: "",
  countryCode: PHILIPPINE_COUNTRY_CODE,
  disabled: false,
  islandGroup: "",
  latitude: 0,
  longitude: 0,
  name: "",
  region: "",
  regionCode: "",
  serviceRadiusKm: 2,
};

const pageSize = EVACUATION_CENTER_PAGE_SIZE;
type IslandFilter = "all" | "luzon" | "mindanao" | "visayas";

const islandOptions: Array<{ label: string; value: IslandFilter }> = [
  { label: "All Islands", value: "all" },
  { label: "Luzon", value: "luzon" },
  { label: "Visayas", value: "visayas" },
  { label: "Mindanao", value: "mindanao" },
];

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
  notificationTargetId,
  onConsumeNotificationTarget,
  onRefresh,
}: {
  centers: EvacuationCenter[];
  notificationTargetId: string;
  onConsumeNotificationTarget: (unavailableMessage?: string) => void;
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
  const [pendingDeleteCenter, setPendingDeleteCenter] = useState<EvacuationCenter | null>(null);
  const [isDeletingCenter, setIsDeletingCenter] = useState(false);
  const [toggleError, setToggleError] = useState("");
  const [deleteError, setDeleteError] = useState("");
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

  useEffect(() => {
    if (!notificationTargetId) return;
    const center = centers.find((item) => item.centerId === notificationTargetId);
    if (!center) {
      onConsumeNotificationTarget("This evacuation center is no longer available.");
      return;
    }
    setFilter("all");
    setIslandFilter("all");
    setSelectedCenterId(center.centerId);
    setFieldErrors({});
    setFormError("");
    setDraft(center);
    onConsumeNotificationTarget();
  }, [centers, notificationTargetId, onConsumeNotificationTarget]);

  const validateDraft = (nextDraft: EvacuationCenterDraft) => {
    const errors: Partial<Record<keyof EvacuationCenterDraft, string>> = {};
    const normalizedName = nextDraft.name.trim().replace(/\s+/g, " ");
    const normalizedAddress = nextDraft.address.trim().replace(/\s+/g, " ");
    const normalizedCity = nextDraft.city?.trim().replace(/\s+/g, " ") ?? "";
    if (normalizedName.length < 2 || normalizedName.length > 160) {
      errors.name = "Name must be 2 to 160 characters.";
    }
    if (normalizedAddress.length < 5 || normalizedAddress.length > 300) {
      errors.address = "Address must be 5 to 300 characters.";
    }
    if (!isValidEvacuationCenterContact(nextDraft.contact)) {
      errors.contact = "Enter a valid contact number with 7 to 11 digits.";
    }
    if (!normalizedCity || normalizedCity.length > 120) {
      errors.city = "Enter the city or municipality.";
    }
    if (!getPhilippineRegionByCode(nextDraft.regionCode)) {
      errors.regionCode = "Select an official Philippine region.";
    }
    if (!Number.isFinite(nextDraft.latitude) || nextDraft.latitude < 4 || nextDraft.latitude > 22.5) {
      errors.latitude = "Latitude must be within the Philippines (4 to 22.5).";
    }
    if (!Number.isFinite(nextDraft.longitude) || nextDraft.longitude < 114 || nextDraft.longitude > 128) {
      errors.longitude = "Longitude must be within the Philippines (114 to 128).";
    }
    if (!Number.isInteger(nextDraft.capacity) || nextDraft.capacity < 0 || nextDraft.capacity > 1_000_000) {
      errors.capacity = "Capacity must be a whole number from 0 to 1,000,000.";
    }
    if (nextDraft.serviceRadiusKm === undefined || !Number.isFinite(nextDraft.serviceRadiusKm) || nextDraft.serviceRadiusKm < 0.1 || nextDraft.serviceRadiusKm > 75) {
      errors.serviceRadiusKm = "Service radius must be between 0.1 and 75 km.";
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
    const sanitizedDraft = sanitizeEvacuationCenterDraft(draft);
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

  const confirmDeleteCenter = async () => {
    if (!pendingDeleteCenter) {
      return;
    }
    setDeleteError("");
    setIsDeletingCenter(true);
    try {
      await callAdminFunction<{ centerId: string }, { success: true }>("deleteEvacuationCenter", {
        centerId: pendingDeleteCenter.centerId,
      });
      setPendingDeleteCenter(null);
      if (draft?.centerId === pendingDeleteCenter.centerId) {
        setDraft(null);
      }
      await onRefresh();
    } catch (nextError) {
      setDeleteError(getAdminActionErrorMessage(nextError, "Unable to remove this evacuation center. Try again."));
    } finally {
      setIsDeletingCenter(false);
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
                    <small>{formatEvacuationCenterArea(center)}</small>
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
                <dd>{formatEvacuationCenterArea(selectedCenter)}</dd>
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
                  region: draft.region,
                  regionCode: draft.regionCode,
                  islandGroup: draft.islandGroup,
                }}
              />
            </div>
            <Field className="center-field--half" error={fieldErrors.name} label="Name">
              <input aria-invalid={Boolean(fieldErrors.name)} onChange={(event) => setDraft({ ...draft, name: event.target.value })} value={draft.name} />
            </Field>
            <Field className="center-field--half" error={fieldErrors.contact} label="Contact">
              <input
                aria-invalid={Boolean(fieldErrors.contact)}
                inputMode="tel"
                onChange={(event) => setDraft({ ...draft, contact: limitEvacuationCenterContactInput(event.target.value) })}
                value={draft.contact}
              />
            </Field>
            <Field className="center-field--address" error={fieldErrors.address} label="Address">
              <textarea aria-invalid={Boolean(fieldErrors.address)} onChange={(event) => setDraft({ ...draft, address: event.target.value })} value={draft.address} />
            </Field>
            <Field className="center-field--capacity" error={fieldErrors.capacity} label="Capacity">
              <input aria-invalid={Boolean(fieldErrors.capacity)} min="0" onChange={(event) => setDraft({ ...draft, capacity: Number(event.target.value) })} type="number" value={draft.capacity} />
            </Field>
            <Field className="center-field--latitude" error={fieldErrors.latitude} label="Latitude">
              <input aria-invalid={Boolean(fieldErrors.latitude)} max="90" min="-90" onChange={(event) => setDraft({ ...draft, latitude: Number(event.target.value) })} step="any" type="number" value={draft.latitude} />
            </Field>
            <Field className="center-field--longitude" error={fieldErrors.longitude} label="Longitude">
              <input aria-invalid={Boolean(fieldErrors.longitude)} max="180" min="-180" onChange={(event) => setDraft({ ...draft, longitude: Number(event.target.value) })} step="any" type="number" value={draft.longitude} />
            </Field>
            <Field className="center-field--city" error={fieldErrors.city} label="City / Municipality">
              <input aria-invalid={Boolean(fieldErrors.city)} onChange={(event) => setDraft({ ...draft, city: event.target.value })} value={draft.city} />
            </Field>
            <details className="form-disclosure modal-actions--wide" open={Boolean(fieldErrors.serviceRadiusKm || fieldErrors.regionCode)}>
              <summary>Additional details</summary>
              <div className="form-disclosure__grid">
                <Field label="Country">
                  <input disabled value="Philippines" />
                </Field>
                <Field error={fieldErrors.regionCode} label="Region">
                  <select
                    aria-invalid={Boolean(fieldErrors.regionCode)}
                    onChange={(event) => {
                      const region = getPhilippineRegionByCode(event.target.value);
                      setDraft({
                        ...draft,
                        islandGroup: region?.islandGroup ?? "",
                        region: region?.name ?? "",
                        regionCode: region?.code ?? "",
                      });
                    }}
                    value={draft.regionCode ?? ""}
                  >
                    <option value="">Select a region</option>
                    {PHILIPPINE_REGIONS.map((region) => (
                      <option key={region.code} value={region.code}>{region.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Island group">
                  <input disabled value={draft.islandGroup || "Select a region first"} />
                </Field>
                <Field error={fieldErrors.serviceRadiusKm} label="Service radius km">
                  <input
                    aria-invalid={Boolean(fieldErrors.serviceRadiusKm)}
                    min="0.1"
                    max="75"
                    onChange={(event) => setDraft({ ...draft, serviceRadiusKm: Number(event.target.value) })}
                    step="any"
                    type="number"
                    value={draft.serviceRadiusKm}
                  />
                </Field>
              </div>
            </details>
            <div className="modal-actions modal-actions--wide">
              {draft.centerId ? (
                <button
                  className="danger-outline-button"
                  disabled={isSaving}
                  onClick={() => {
                    setDeleteError("");
                    setPendingDeleteCenter({ ...draft, centerId: draft.centerId } as EvacuationCenter);
                  }}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
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
      {pendingDeleteCenter ? (
        <Modal
          onClose={() => {
            if (!isDeletingCenter) {
              setPendingDeleteCenter(null);
              setDeleteError("");
            }
          }}
          title="Remove center?"
        >
          <div className="confirmation-modal">
            <p>
              {pendingDeleteCenter.name} will be permanently removed from the admin evacuation center list. This cannot be undone.
            </p>
            {deleteError ? <p className="inline-form-error">{deleteError}</p> : null}
            <div className="modal-actions">
              <button className="danger-outline-button" disabled={isDeletingCenter} onClick={() => void confirmDeleteCenter()} type="button">
                {isDeletingCenter ? "Removing..." : "Remove center"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
