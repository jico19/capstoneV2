import { useState } from 'react';
import {
    CheckCheck,
    Inbox,
    CheckCircle2,
} from 'lucide-react';
import { useGetNotification, useGetUnreadNotificationCount } from '../../../hooks/useNotifications';
import { api } from '../../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Pagination from '../../../components/ui/Pagination';
import NotificationItem from './NotificationItem';
import useAuthStore from '../../../store/authStore';

/**
 * Universal Notification Page — FarmPass Design System 2.1
 * Clean, tactile message inbox with live unread indicators, role-aware copy,
 * skeleton shimmers, and instant mark-read actions.
 */
const NotificationPage = () => {
    const { user } = useAuthStore();
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, READ
    const [isMarkingAll, setIsMarkingAll] = useState(false);

    const { data, isLoading, isError } = useGetNotification(limit, offset, filter);
    const { data: unreadTotal = 0 } = useGetUnreadNotificationCount();
    const query = useQueryClient();

    const notifications = data?.results || [];
    const count = data?.count || 0;

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        setOffset(0);
    };

    const handleMarkSingleRead = async (id) => {
        try {
            await api.patch(`/notification/${id}/`, { is_read: true });
            query.invalidateQueries({ queryKey: ['notification'] });
        } catch {
            toast.error("Could not update message.");
        }
    };

    const markAllAsRead = async () => {
        setIsMarkingAll(true);
        try {
            await api.get('/notification/mark_all_read/');
            query.invalidateQueries({ queryKey: ['notification'] });
            toast.success("Messages Updated", {
                description: "All notifications marked as read."
            });
        } catch {
            toast.error("Action Failed", {
                description: "Could not update messages."
            });
        } finally {
            setIsMarkingAll(false);
        }
    };

    const isFarmer = user?.role === 'Farmer';

    return (
        <div className="p-4 md:p-8 space-y-6 bg-stone-50/40 min-h-full">
            {/* Header: Municipal Context & Role Awareness */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-6">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                            {isFarmer ? "Livestock Transit Updates" : "Municipal Activity Feed"}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="text-xs text-stone-500">
                            Municipality of Sariaya
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
                            {isFarmer ? "Your Messages & Alerts" : "System Notifications"}
                        </h1>
                        {unreadTotal > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-bold font-mono">
                                {unreadTotal} unread
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-stone-600 max-w-xl leading-relaxed">
                        {isFarmer
                            ? "Track real-time permit approvals, veterinary reviews, payment verifications, and checkpoint clearances."
                            : "Monitor operational alerts, livestock transit submissions, and municipal administrative notices."}
                    </p>
                </div>

                {/* Header Action: Mark All Read */}
                {unreadTotal > 0 && (
                    <button
                        type="button"
                        onClick={markAllAsRead}
                        disabled={isMarkingAll}
                        className="btn-tactile self-start sm:self-auto px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isMarkingAll ? (
                            <span className="loading loading-spinner loading-xs text-green-700"></span>
                        ) : (
                            <CheckCheck size={15} className="text-green-700" />
                        )}
                        Mark All Read
                    </button>
                )}
            </div>

            {/* Controls Bar: Segmented Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-stone-200 rounded-xl p-3 sm:px-4 shadow-xs">
                <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg border border-stone-200/80">
                    {[
                        { id: 'ALL', label: 'All Messages' },
                        { id: 'UNREAD', label: 'Unread' },
                        { id: 'READ', label: 'Read' },
                    ].map((f) => {
                        const isActive = filter === f.id;
                        return (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => handleFilterChange(f.id)}
                                className={`btn-tactile px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                    isActive
                                        ? 'bg-white text-stone-900 shadow-2xs font-bold'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                </div>

                <div className="text-xs text-stone-500 font-medium">
                    Showing <span className="font-bold text-stone-800 font-mono">{notifications.length}</span> of <span className="font-bold text-stone-800 font-mono">{count}</span> records
                </div>
            </div>

            {/* Notifications Feed */}
            {isLoading ? (
                /* Loading notifications */
                <div role="status" aria-label="Loading notifications..." className="space-y-3">
                    {[1, 2, 3, 4].map(i => <NotificationItem key={i} isLoading />)}
                </div>
            ) : isError ? (
                <div className="bg-red-50 text-red-700 border border-red-200 p-6 rounded-xl text-center text-xs font-medium space-y-2">
                    <p className="font-bold">Failed to load notifications.</p>
                    <p className="text-red-600 text-xs">Please refresh your browser or check your network connection.</p>
                </div>
            ) : notifications.length === 0 ? (
                /* Clean Empty States */
                <div className="bg-white border border-stone-200 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-400">
                        {filter === 'UNREAD' ? <CheckCircle2 size={24} className="text-green-600" /> : <Inbox size={24} />}
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-stone-800">
                            {filter === 'UNREAD' ? "You're all caught up!" : "No messages found"}
                        </h3>
                        <p className="text-xs text-stone-500 max-w-sm">
                            {filter === 'UNREAD'
                                ? "There are no unread notifications in your inbox right now."
                                : "System notices and permit updates will appear here as activity occurs."}
                        </p>
                    </div>
                    {filter !== 'ALL' && (
                        <button
                            type="button"
                            onClick={() => handleFilterChange('ALL')}
                            className="btn-tactile mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700"
                        >
                            View All Messages
                        </button>
                    )}
                </div>
            ) : (
                /* Interactive Cards Feed */
                <div className="space-y-3">
                    {notifications.map((n) => (
                        <NotificationItem
                            key={n.id}
                            notif={n}
                            onMarkRead={handleMarkSingleRead}
                        />
                    ))}
                </div>
            )}

            {/* Pagination Footer */}
            {count > limit && (
                <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs">
                    <Pagination
                        count={count}
                        limit={limit}
                        offset={offset}
                        onPageChange={setOffset}
                    />
                </div>
            )}
        </div>
    );
};

export default NotificationPage;
