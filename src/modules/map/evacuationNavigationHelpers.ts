/** Purpose: Keep navigation-rate-limit copy deterministic and easy to test. */
export const formatNavigationRetryAfter = (retryAfterSeconds?: number) => {
  if (!retryAfterSeconds || retryAfterSeconds <= 0) {
    return "Too many navigation attempts. Try again shortly.";
  }

  const minutes = Math.floor(retryAfterSeconds / 60);
  const seconds = retryAfterSeconds % 60;

  if (minutes > 0) {
    return `Too many navigation attempts. Try again in ${minutes} min ${seconds} sec.`;
  }

  return `Too many navigation attempts. Try again in ${seconds} sec.`;
};

export const formatNavigationDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) {
    return "—";
  }

  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
};

export const formatNavigationDistance = (meters?: number | null) => {
  if (!meters || meters <= 0) {
    return "—";
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const kilometers = meters / 1000;
  return `${kilometers >= 10 ? kilometers.toFixed(0) : kilometers.toFixed(1)} km`;
};

export const formatNavigationArrivalTime = (seconds?: number | null, now = new Date()) => {
  if (!seconds || seconds <= 0) {
    return "";
  }

  const arrivalDate = new Date(now.getTime() + seconds * 1000);
  return arrivalDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};
