/** Purpose: Shared emergency hotline contracts used by tabs, SOS, and safety settings. */
export type EmergencyHotline = {
  hotlineId: string;
  name: string;
  phone: string;
  region: string;
  description?: string;
};
