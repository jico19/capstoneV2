export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
export function connectionMessage(error) {
  if (error?.code === 'ERR_CANCELED' || error?.response) return '';
  if (isOffline()) return "You?re offline. Check your internet connection and try again.";
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return 'The request took too long. Please try again.';
  if (error?.request || error?.code === 'ERR_NETWORK') return 'Cannot reach FarmPass. Check your connection or try again shortly.';
  return '';
}
