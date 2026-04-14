import {
    Bell, CheckCircle2, AlertTriangle, Info,
    CheckCheck, CreditCard, ChevronRight
} from 'lucide-react';
import { useGetNotification } from '/src/hooks/useNotifications';
import { api } from '/src/lib/api';
import { useQueryClient } from '@tanstack/react-query';


// Helper function to format time (e.g., "2 hours ago")
const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const NotificationPage = () => {
    const { data: notification, isLoading, isError } = useGetNotification()
    const query = useQueryClient()

    if (isLoading) return <div className="p-10 text-center font-bold opacity-50">Loading Your Notification...</div>;
    if (isError) return <div className="p-10 text-error font-bold">Failed to load data.</div>;
    
    // Mark all as read
    const markAllAsRead = async () => {
        // TODO: Call backend to mark all as read

        const res = await api.get('/notification/mark_all_read/')
        query.invalidateQueries({ queryKey: ['notification']})

    };

    // Contextual Icons and Colors based on Type
    const getIconInfo = (type) => {
        switch (type) {
            case 'SUCCESS': return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' };
            case 'WARNING': return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' };
            case 'INFO':
            default: return { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100' };
        }
    };

    const unreadCount = notification.filter(n => !n.is_read).length

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    {unreadCount} New
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Stay updated on your permit statuses.</p>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="btn btn-sm btn-ghost text-slate-500 hover:text-blue-600 gap-2 font-medium"
                    >
                        <CheckCheck size={16} /> Mark all as read
                    </button>
                )}
            </div>

            {/* Notification List Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                {notification.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Bell size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium text-slate-500">You're all caught up!</p>
                        <p className="text-xs mt-1">No new notifications right now.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {notification.map((notif) => {
                            const { icon: Icon, color, bg } = getIconInfo(notif.type);

                            return (
                                <div
                                    key={notif.id}
                                    className={`p-4 md:p-5 flex gap-4 cursor-pointer transition-all duration-200
                                        ${notif.is_read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/30 hover:bg-blue-50/50'}`}
                                >
                                    {/* Icon */}
                                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-1 ${bg} ${color}`}>
                                        <Icon size={20} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <h3 className={`text-sm font-bold truncate ${notif.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap shrink-0 mt-0.5">
                                                {getRelativeTime(notif.sent_at)}
                                            </span>
                                        </div>
                                        <p className={`text-sm leading-relaxed ${notif.is_read ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                                            {notif.message}
                                        </p>
                                    </div>

                                    {/* Unread Dot & Arrow */}
                                    <div className="shrink-0 flex flex-col items-end justify-center gap-2 pl-2">
                                        {!notif.is_read && (
                                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                        )}
                                        {notif.action_link && (
                                            <ChevronRight size={16} className="text-slate-300" />
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

        </div>
    );
};

export default NotificationPage;