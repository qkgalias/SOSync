/** Purpose: Prepare app data for Firestore by stripping unsupported undefined values. */
const sanitizeFirestoreValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeFirestoreValue(entry))
      .filter((entry) => entry !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) => {
        if (entry === undefined) {
          return [];
        }

        const sanitized = sanitizeFirestoreValue(entry);
        return sanitized === undefined ? [] : [[key, sanitized]];
      }),
    );
  }

  return value;
};

export const sanitizeForFirestore = <T>(value: T) => sanitizeFirestoreValue(value) as T;
