import { useState } from 'react';
import { useGetAuditTrail } from '/src/hooks/useAudit';
import { User, Clock, History } from 'lucide-react';
import Pagination from '/src/components/Pagination';

/**
 * Human-Friendly Audit Trail Page
 * Presents system activity as a readable 'Activity Feed' for non-technical users.
 */
const AuditTrailPage = () => {
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const { data: trails, isLoading } = useGetAuditTrail(limit, offset);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
               ' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Loading activities...</p>
            </div>
        );
    }

    const logs = trails?.results || [];
    const count = trails?.count || 0;

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 bg-stone-50/50 min-h-full">
            {/* Header */}
            <div className="border-b border-stone-200 pb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Activity Log</p>
                <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter">Recent System Activity</h1>
                <p className="text-stone-500 text-sm mt-2 font-medium">A simple history of actions performed in the system.</p>
            </div>

            {/* Activity Feed */}
            <div className="bg-white border border-stone-200">
                {logs.length > 0 ? (
                    <div className="divide-y divide-stone-100">
                        {logs.map((trail) => (
                            <div key={trail.id} className="p-6 hover:bg-stone-50 transition-colors flex gap-4">
                                {/* User Icon */}
                                <div className="shrink-0 w-10 h-10 flex items-center justify-center bg-stone-100 text-stone-600">
                                    <User size={20} />
                                </div>
                                
                                {/* Activity Details */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-stone-900">
                                        {trail.who_performed_name || 'A system user'}
                                    </p>
                                    <p className="text-sm text-stone-600 mt-1">
                                        {trail.what_performed}
                                    </p>
                                    <div className="flex items-center gap-2 mt-3 text-[10px] font-black uppercase tracking-widest text-stone-400">
                                        <Clock size={12} />
                                        {formatDate(trail.when_performed)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 flex flex-col items-center text-stone-300">
                        <History size={40} />
                        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-stone-400">No activity logged yet.</p>
                    </div>
                )}
                
                {/* Pagination Footer */}
                {count > limit && (
                    <div className="border-t border-stone-100 bg-stone-50/50">
                        <Pagination count={count} limit={limit} offset={offset} onPageChange={setOffset} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditTrailPage;
