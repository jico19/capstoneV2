
function NotificationBadge({ count = 0, dotOnly = false, className = "" }) {
    if (count <= 0) return null;

    if (dotOnly) {
        return (
            <span
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white z-10 ${className}`}
                title={`${count} new update${count > 1 ? 's' : ''}`}
            />
        );
    }

    return (
        <div className={`absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-none min-w-4 h-4 px-0.5 flex items-center justify-center text-[8px] font-black z-10 border border-white ${className}`}>
            {count > 99 ? '99+' : count}
        </div>
    );
}

export default NotificationBadge;
