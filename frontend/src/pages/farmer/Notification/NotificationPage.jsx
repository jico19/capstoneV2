import { useState } from 'react';
import {
    Bell, CheckCircle2, AlertTriangle, Info,
    CheckCheck, ChevronRight, Inbox
} from 'lucide-react';
import { useGetNotification } from '/src/hooks/useNotifications';
import { api } from '/src/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Pagination from '/src/components/Pagination';

/**
 * Notification Page
 * Redesigned for Farmer-Friendly simplicity and high-signal minimalism.
 */
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
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const { data, isLoading, isError } = useGetNotification(limit, offset)
    const query = useQueryClient()

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Opening your messages...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-8">
                <div className="bg-red-50 text-red-600 border border-red-100 p-8 rounded-none flex items-center justify-center text-center font-black uppercase tracking-widest text-xs">
                    Failed to load messages. Please refresh.
                </div>
            </div>
        );
    }
    
    const notifications = data?.results || [];
    const count = data?.count || 0;

    const markAllAsRead = async () => {
        try {
            await api.get('/notification/mark_all_read/')
            query.invalidateQueries({ queryKey: ['notification']})
            toast.success("Messages Updated", {
                description: "All your messages have been marked as read."
            })
        } catch (error) {
            console.error(error)
            toast.error("Action Failed", {
                description: "Could not update messages."
            })
        }
    };

    const getIconInfo = (type) => {
        switch (type) {
            case 'SUCCESS': return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' };
            case 'WARNING': return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' };
            case 'INFO':
            default: return { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' };
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length

    return (
        <div className="flex-1 p-4 md:p-8 space-y-8 bg-white min-h-full font-sans">

            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 pb-6 md:pb-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Communication Center</p>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Your Messages
                        {unreadCount > 0 && (
                            <span className="bg-green-600 text-white text-[10px] px-3 py-1 font-black uppercase tracking-widest leading-none">
                                {unreadCount} NEW
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">Stay updated on your permit statuses and office news.</p>
                </div>

                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="w-full md:w-auto bg-gray-900 hover:bg-black text-white px-6 py-3 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex justify-center items-center gap-2"
                    >
                        <CheckCheck size={16} strokeWidth={3} /> Clear All Notifications
                    </button>
                )}
            </div>

            {/* 2. Notification List */}
            <div className="bg-white border border-gray-100 rounded-none overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-gray-50/50">
                        <Inbox size={48} className="text-gray-300 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Inbox is empty</p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-gray-100">
                            {notifications.map((notif) => {
                                const { icon: Icon, color, bg } = getIconInfo(notif.type);

                                return (
                                    <div
                                        key={notif.id}
                                        className={`p-6 flex gap-6 cursor-pointer transition-colors relative group
                                            ${notif.is_read ? 'bg-white hover:bg-gray-50' : 'bg-green-50/20 hover:bg-green-50/40 border-l-4 border-green-600 pl-5'}`}
                                    >
                                        {/* Status Icon */}
                                        <div className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-none border border-gray-100 bg-white ${color}`}>
                                            <Icon size={24} strokeWidth={2.5} />
                                        </div>

                                        {/* Message Content */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex justify-between items-start gap-4">
                                                <h3 className={`text-sm font-black uppercase tracking-tight truncate ${notif.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                                                    {notif.title}
                                                </h3>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap pt-1">
                                                    {getRelativeTime(notif.sent_at)}
                                                </span>
                                            </div>
                                            <p className={`text-sm leading-relaxed ${notif.is_read ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
                                                {notif.message}
                                            </p>
                                        </div>

                                        {/* Action Indicator */}
                                        <div className="shrink-0 flex items-center pl-2">
                                            <ChevronRight size={18} className={`transition-transform group-hover:translate-x-1 ${notif.is_read ? 'text-gray-200' : 'text-green-600'}`} strokeWidth={3} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <Pagination 
                            count={count} 
                            limit={limit} 
                            offset={offset} 
                            onPageChange={setOffset} 
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default NotificationPage;