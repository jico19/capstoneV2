import { useState } from 'react';
import {
    CheckCircle2, AlertTriangle, Info,
    CheckCheck, Inbox, ChevronRight
} from 'lucide-react';
import { useGetNotification } from '/src/hooks/useNotifications';
import { api } from '/src/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Pagination from '/src/components/Pagination';
import NotificationItem from './NotificationItem';


/**
 * Notification Page
 * Redesigned for Farmer-Friendly simplicity and high-signal minimalism.
 */


const NotificationPage = () => {
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, READ
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

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'UNREAD') return !n.is_read;
        if (filter === 'READ') return n.is_read;
        return true;
    });

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

    return (
        <div className="flex-1 bg-white min-h-full">
            {/* Header */}
            <header className="p-6 border-b border-stone-100 space-y-4">
                <h1 className="text-xl font-black text-stone-900 uppercase tracking-tighter">Messages</h1>
                
                {/* Filters */}
                <div className="flex gap-2">
                    {['ALL', 'UNREAD', 'READ'].map(f => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest border transition-colors ${
                                filter === f ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-400 border-stone-200'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            {/* List */}
            <div className="divide-y divide-stone-100">
                {filteredNotifications.length === 0 ? (
                    <div className="py-20 flex flex-col items-center text-stone-300">
                        <Inbox size={40} />
                        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Nothing here</p>
                    </div>
                ) : (
                    filteredNotifications.map(n => <NotificationItem key={n.id} notif={n} />)
                )}
            </div>

            {/* Pagination Footer */}
            {count > limit && (
                <div className="border-t border-stone-100 bg-stone-50/50">
                    <Pagination count={count} limit={limit} offset={offset} onPageChange={setOffset} />
                </div>
            )}

            {/* Footer Actions */}
            {notifications.some(n => !n.is_read) && (
                <div className="p-4 border-t border-stone-100">
                    <button onClick={markAllAsRead} className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        <CheckCheck size={14} /> Mark All Read
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationPage;