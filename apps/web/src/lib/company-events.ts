export const DRIVER_ASSIGNMENT_CHANGED_EVENT = 'company-driver-assignment-changed';

export function emitDriverAssignmentChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DRIVER_ASSIGNMENT_CHANGED_EVENT));
}
