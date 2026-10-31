import { useEffect, useState, useSyncExternalStore } from 'react';
const subscribe = (callback) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => { window.removeEventListener('online', callback); window.removeEventListener('offline', callback); };
};
export default function ConnectionNotice() {
  const [failure, setFailure] = useState('');
  useEffect(() => { const update = event => setFailure(event.detail); window.addEventListener('farmpass:connection', update); return () => window.removeEventListener('farmpass:connection', update); }, []);
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  return online && !failure ? null : <div role="status" className="sticky top-0 z-[200] border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-stone-800">{online ? failure : 'You?re offline. Check your internet connection. Changes cannot be sent until you reconnect.'}</div>;
}
