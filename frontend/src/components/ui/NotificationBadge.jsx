
function NotificationBadge({ count = 0 }) {
    if (count <= 0) return null;

    return (
        <div className="absolute -top-1.5 -right-1.5 bg-green-700 text-white rounded-none w-4 h-4 flex items-center justify-center text-[8px] font-black z-10 border border-white">
            {count > 99 ? '99+' : count}
        </div>
    );
}

export default NotificationBadge;
