export function expirationLabel(value, today = new Date()) {
    if (!value) return 'Expiration unknown';
    const expiry = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(expiry.getTime())) return 'Expiration unknown';
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((Date.UTC(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    return days < 0 ? 'Expired' : days <= 30 ? (days === 0 ? 'Expires today' : `Expires soon (${days} days)`) : `Expires ${value.slice(0, 10)}`;
}
