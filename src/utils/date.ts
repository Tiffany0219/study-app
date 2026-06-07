/**
 * Safely parse a date value (especially strings returned from SQLite/database) into a local Date object.
 * SQLite's DEFAULT CURRENT_TIMESTAMP returns UTC time formatted as "YYYY-MM-DD HH:MM:SS" (without timezone).
 * This helper appends "Z" or converts it to ISO format so that the browser parses it as UTC,
 * which then correctly shifts it to the local system timezone.
 */
export const parseDatabaseDate = (dateVal: string | number | Date | undefined | null): Date => {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal === 'number') return new Date(dateVal);

  const dateStr = String(dateVal);
  
  // If it's already an ISO string with Z or timezone offset (e.g. +08:00 or -05:00)
  if (dateStr.includes('Z') || /[-+]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }

  let formatted = dateStr.trim();
  
  // SQLite format: "YYYY-MM-DD HH:MM:SS" -> replace space with 'T'
  if (formatted.includes(' ')) {
    formatted = formatted.replace(' ', 'T');
  }

  // If it contains 'T' (e.g., "YYYY-MM-DDTHH:MM:SS") but has no timezone suffix, append 'Z' to treat as UTC
  if (formatted.includes('T') && !formatted.endsWith('Z')) {
    formatted += 'Z';
  }

  const parsed = new Date(formatted);
  if (isNaN(parsed.getTime())) {
    // Fallback if formatting tricks broke it
    return new Date(dateStr);
  }
  return parsed;
};
