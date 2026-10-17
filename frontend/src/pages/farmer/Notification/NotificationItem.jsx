import { getRelativeTime, getIconInfo, getSectionInfo } from './notifcationHelper';
import { Check } from 'lucide-react';

/**
 * NotificationItem Component
 * Tactile notification card with type indicators, section tags, and interactive mark-read action.
 */
const NotificationItem = ({ notif, onMarkRead }) => {
    const { icon: Icon, color, bg, border } = getIconInfo(notif.type);
    const sectionInfo = getSectionInfo(notif.section);

    const isUnread = !notif.is_read;

    return (
        <div
            className={`group rounded-xl border p-4 sm:p-5 flex items-start gap-3.5 sm:gap-4 transition-all duration-150 ${
                isUnread
                    ? 'bg-white border-green-200 shadow-xs ring-1 ring-green-700/10'
                    : 'bg-white/80 border-stone-200 hover:border-stone-300'
            }`}
        >
            {/* Type Icon Container */}
            <div className={`shrink-0 w-10 h-10 rounded-lg border ${border} ${bg} ${color} flex items-center justify-center`}>
                <Icon size={18} strokeWidth={2.2} />
            </div>

            {/* Notification Body */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Section Chip */}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${sectionInfo.chipStyle}`}>
                            {sectionInfo.label}
                        </span>

                        {/* Title */}
                        <h3 className={`text-xs font-bold tracking-tight truncate ${isUnread ? 'text-stone-900' : 'text-stone-700'}`}>
                            {notif.title}
                        </h3>

                        {/* Unread Ping Dot */}
                        {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-green-600 shrink-0" title="Unread message" />
                        )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[11px] font-mono text-stone-500 shrink-0">
                        {getRelativeTime(notif.sent_at)}
                    </span>
                </div>

                {/* Message Prose */}
                <p className={`text-xs leading-relaxed ${isUnread ? 'text-stone-700' : 'text-stone-500'}`}>
                    {notif.message}
                </p>
            </div>

            {/* Quick Actions */}
            {isUnread && onMarkRead && (
                <button
                    type="button"
                    onClick={() => onMarkRead(notif.id)}
                    title="Mark as read"
                    aria-label="Mark message as read"
                    className="btn-tactile shrink-0 p-1.5 rounded-lg text-stone-400 hover:text-green-700 hover:bg-green-50 transition-colors"
                >
                    <Check size={16} />
                </button>
            )}
        </div>
    );
};

export default NotificationItem;