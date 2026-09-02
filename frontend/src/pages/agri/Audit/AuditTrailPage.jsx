import React, { useState, useMemo } from 'react';
import { useGetAuditTrail } from '../../../hooks/useAudit';
import { 
    History, 
    Search, 
    Filter, 
    Clock, 
    User, 
    CheckCircle2, 
    FileText, 
    AlertTriangle, 
    SlidersHorizontal, 
    MapPin, 
    Shield, 
    RefreshCw, 
    RotateCcw, 
    Calendar,
    ChevronRight,
    Eye,
    Activity,
    Users,
    Layers
} from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import AuditDetailModal from '../../../components/ui/AuditDetailModal';
import { formatDate, formatRelativeTime } from '../../../lib/utils';

/**
 * Categorizes an activity string into an operational module
 */
const getCategoryInfo = (whatPerformed = '') => {
    const text = whatPerformed.toLowerCase();
    
    if (text.includes('release') || text.includes('approved') || text.includes('issued') || text.includes('confirmed')) {
        return {
            id: 'releases',
            label: 'Permits & Releases',
            bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            dot: 'bg-emerald-500',
            icon: CheckCircle2
        };
    }
    if (text.includes('submit') || text.includes('applied') || text.includes('application') || text.includes('requested')) {
        return {
            id: 'submissions',
            label: 'Submissions & Requests',
            bg: 'bg-blue-50 text-blue-800 border-blue-200',
            dot: 'bg-blue-500',
            icon: FileText
        };
    }
    if (text.includes('reject') || text.includes('flag') || text.includes('denied') || text.includes('cancelled') || text.includes('failed')) {
        return {
            id: 'rejections',
            label: 'Rejections & Flags',
            bg: 'bg-rose-50 text-rose-800 border-rose-200',
            dot: 'bg-rose-500',
            icon: AlertTriangle
        };
    }
    if (text.includes('override') || text.includes('manual') || text.includes('ocr') || text.includes('updated') || text.includes('modified')) {
        return {
            id: 'overrides',
            label: 'Reviews & Overrides',
            bg: 'bg-amber-50 text-amber-800 border-amber-200',
            dot: 'bg-amber-500',
            icon: SlidersHorizontal
        };
    }
    if (text.includes('survey') || text.includes('hog') || text.includes('census') || text.includes('barangay') || text.includes('pig')) {
        return {
            id: 'census',
            label: 'Census & Geospatial',
            bg: 'bg-purple-50 text-purple-800 border-purple-200',
            dot: 'bg-purple-500',
            icon: MapPin
        };
    }
    if (text.includes('user') || text.includes('account') || text.includes('login') || text.includes('password') || text.includes('role')) {
        return {
            id: 'admin',
            label: 'User & System Admin',
            bg: 'bg-stone-100 text-stone-800 border-stone-200',
            dot: 'bg-stone-500',
            icon: Shield
        };
    }
    
    return {
        id: 'general',
        label: 'General Event',
        bg: 'bg-stone-50 text-stone-700 border-stone-200',
        dot: 'bg-stone-400',
        icon: Activity
    };
};

/**
 * Highlights alphanumeric references (e.g. LP-2026-X9921)
 */
const formatActivityText = (text = '') => {
    const parts = text.split(/(LP-\d{4}-[A-Z0-9]+)/g);
    return parts.map((part, index) => {
        if (/^LP-\d{4}-[A-Z0-9]+$/.test(part)) {
            return (
                <span 
                    key={index} 
                    className="font-mono font-bold bg-stone-100 text-stone-900 px-1.5 py-0.5 border border-stone-200 text-[11px] rounded-none inline-block mx-0.5"
                >
                    {part}
                </span>
            );
        }
        return part;
    });
};

const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};



/**
 * Agriculture Audit Trail Activity Hub
 * Redesigned for high-signal visibility, chronological timeline inspection, and interactive filtering.
 */
const AuditTrailPage = () => {
    const [limit] = useState(15);
    const [offset, setOffset] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDateFilter, setSelectedDateFilter] = useState('all');
    const [selectedLog, setSelectedLog] = useState(null);

    const { data: trails, isLoading, isFetching, refetch } = useGetAuditTrail(limit, offset);

    const rawLogs = useMemo(() => trails?.results || [], [trails]);
    const totalCount = trails?.count || 0;

    // Filter logs client-side by search keyword, category, and date range
    const filteredLogs = useMemo(() => {
        return rawLogs.filter((log) => {
            // Search Query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchActor = (log.who_performed_name || '').toLowerCase().includes(query);
                const matchWhat = (log.what_performed || '').toLowerCase().includes(query);
                const matchId = String(log.id).includes(query);
                if (!matchActor && !matchWhat && !matchId) return false;
            }

            // Category Filter
            const cat = getCategoryInfo(log.what_performed);
            if (selectedCategory !== 'all' && cat.id !== selectedCategory) {
                return false;
            }

            // Date Preset Filter
            if (selectedDateFilter !== 'all' && log.when_performed) {
                const logDate = new Date(log.when_performed);
                const now = new Date();
                if (selectedDateFilter === 'today') {
                    if (logDate.toDateString() !== now.toDateString()) return false;
                } else if (selectedDateFilter === '7days') {
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(now.getDate() - 7);
                    if (logDate < sevenDaysAgo) return false;
                } else if (selectedDateFilter === 'month') {
                    if (logDate.getMonth() !== now.getMonth() || logDate.getFullYear() !== now.getFullYear()) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [rawLogs, searchQuery, selectedCategory, selectedDateFilter]);

    // Top KPI calculations
    const stats = useMemo(() => {
        const todayCount = rawLogs.filter(l => {
            if (!l.when_performed) return false;
            return new Date(l.when_performed).toDateString() === new Date().toDateString();
        }).length;

        const uniqueActors = new Set(rawLogs.map(l => l.who_performed_name || 'System')).size;

        // Top Category
        const catFreq = {};
        rawLogs.forEach(l => {
            const cat = getCategoryInfo(l.what_performed);
            catFreq[cat.label] = (catFreq[cat.label] || 0) + 1;
        });
        const topCat = Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Permits';

        return {
            total: totalCount,
            today: todayCount,
            actors: uniqueActors,
            topCategory: topCat
        };
    }, [rawLogs, totalCount]);

    const categories = [
        { id: 'all', label: 'All Activities' },
        { id: 'releases', label: 'Permits & Releases' },
        { id: 'submissions', label: 'Submissions' },
        { id: 'overrides', label: 'Manual Overrides' },
        { id: 'rejections', label: 'Rejections & Flags' },
        { id: 'census', label: 'Hog Census' },
        { id: 'admin', label: 'User Admin' },
    ];

    const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all' || selectedDateFilter !== 'all';

    const handleResetFilters = () => {
        setSearchQuery('');
        setSelectedCategory('all');
        setSelectedDateFilter('all');
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-white min-h-screen">
                {/* Header Skeleton */}
                <div className="animate-pulse space-y-3 pb-6 border-b border-stone-200">
                    <div className="h-4 w-32 bg-stone-200" />
                    <div className="h-8 w-64 bg-stone-200" />
                </div>
                {/* KPI Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-stone-50 border border-stone-200 p-4 space-y-2">
                            <div className="h-3 w-20 bg-stone-200" />
                            <div className="h-6 w-12 bg-stone-200" />
                        </div>
                    ))}
                </div>
                {/* Feed Skeleton */}
                <div className="space-y-4 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-28 bg-white border border-stone-200 p-6 space-y-3" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-stone-50/40 min-h-screen font-sans">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-stone-200 pb-6 gap-4 bg-white p-6 border">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                        Compliance & Operations Log
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black text-stone-800 uppercase tracking-tighter mt-1 flex items-center gap-3">
                        <History size={26} className="text-emerald-700 shrink-0" />
                        System Activity Trail
                    </h1>
                    <p className="text-stone-500 text-xs mt-1.5 font-medium">
                        Chronological record of user submissions, operational verifications, and regulatory actions.
                    </p>
                </div>
                
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-black uppercase tracking-wider transition-colors rounded-none disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCw size={14} className={isFetching ? 'animate-spin text-emerald-700' : ''} />
                    <span>{isFetching ? 'Syncing...' : 'Sync Activities'}</span>
                </button>
            </div>

            {/* Audit Statistics KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-stone-200 p-5 rounded-none flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            Total Records
                        </p>
                        <p className="text-2xl font-black text-stone-900 mt-1">
                            {stats.total.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">Lifetime system traces</p>
                    </div>
                    <div className="p-3 bg-stone-50 border border-stone-200 text-stone-600">
                        <History size={20} />
                    </div>
                </div>

                <div className="bg-white border border-stone-200 p-5 rounded-none flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            Logged Today
                        </p>
                        <p className="text-2xl font-black text-emerald-700 mt-1">
                            {stats.today.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">Current 24h activity</p>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700">
                        <Activity size={20} />
                    </div>
                </div>

                <div className="bg-white border border-stone-200 p-5 rounded-none flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            Active Actors
                        </p>
                        <p className="text-2xl font-black text-stone-900 mt-1">
                            {stats.actors}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">Distinct user origins</p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700">
                        <Users size={20} />
                    </div>
                </div>

                <div className="bg-white border border-stone-200 p-5 rounded-none flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            Primary Activity
                        </p>
                        <p className="text-base font-black text-stone-900 mt-1 truncate max-w-[150px]" title={stats.topCategory}>
                            {stats.topCategory}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">Most frequent category</p>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 text-purple-700">
                        <Layers size={20} />
                    </div>
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-white border border-stone-200 p-5 space-y-4 rounded-none">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            placeholder="Search by actor name, user ID, or keyword (e.g., LP-2026, approved)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-emerald-700 focus:bg-white transition-colors rounded-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Date Preset Dropdown */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-stone-50 border border-stone-200 text-stone-600 text-xs font-medium">
                            <Calendar size={14} className="text-stone-400" />
                            <select
                                value={selectedDateFilter}
                                onChange={(e) => setSelectedDateFilter(e.target.value)}
                                className="bg-transparent text-xs font-bold text-stone-800 focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Dates</option>
                                <option value="today">Today Only</option>
                                <option value="7days">Last 7 Days</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>

                        {/* Reset Filters Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 text-[10px] font-black uppercase tracking-wider transition-colors rounded-none cursor-pointer"
                            >
                                <RotateCcw size={12} />
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-stone-100 pb-1">
                    {categories.map((cat) => {
                        const isActive = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 rounded-none border ${
                                    isActive
                                        ? 'bg-stone-900 text-white border-stone-900'
                                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                                }`}
                            >
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Timeline Activity Feed */}
            <div className="bg-white border border-stone-200 rounded-none overflow-hidden">
                {filteredLogs.length > 0 ? (
                    <div className="divide-y divide-stone-100">
                        {filteredLogs.map((log) => {
                            const cat = getCategoryInfo(log.what_performed);
                            const IconComp = cat.icon;

                            return (
                                <div 
                                    key={log.id} 
                                    onClick={() => setSelectedLog(log)}
                                    className="p-5 md:p-6 hover:bg-stone-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer group"
                                >
                                    {/* Left: Time and Node */}
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        {/* Node Icon */}
                                        <div className={`shrink-0 w-10 h-10 flex items-center justify-center border rounded-none group-hover:scale-105 transition-transform ${cat.bg}`}>
                                            <IconComp size={18} />
                                        </div>

                                        {/* Content Block */}
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider rounded-none ${cat.bg}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                                                    {cat.label}
                                                </span>
                                                <span className="text-xs font-black text-stone-900 uppercase tracking-tight">
                                                    {log.who_performed_name || 'System User'}
                                                </span>
                                                <span className="text-[10px] text-stone-400 font-mono">
                                                    (ID: {log.who_performed || 'SYS'})
                                                </span>
                                            </div>

                                            {/* Formatted Description with highlighted IDs */}
                                            <p className="text-xs text-stone-700 leading-relaxed font-medium">
                                                {formatActivityText(log.what_performed)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Timestamp & Action */}
                                    <div className="flex items-center gap-4 shrink-0 self-end md:self-center border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto justify-between md:justify-end">
                                        <div className="text-left md:text-right space-y-0.5">
                                            <div className="flex items-center md:justify-end gap-1 text-[11px] font-bold text-stone-800">
                                                <Clock size={11} className="text-stone-400" />
                                                <span>{formatTime(log.when_performed)}</span>
                                            </div>
                                            <p className="text-[10px] text-stone-400 font-medium">
                                                {formatDate(log.when_performed)} - {formatRelativeTime(log.when_performed)}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            className="p-1.5 text-stone-400 group-hover:text-stone-800 group-hover:bg-stone-200/60 transition-colors border border-transparent group-hover:border-stone-300 rounded-none"
                                            title="Inspect Event"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-24 px-4 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-14 h-14 bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-400">
                            <History size={28} />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-stone-800">
                            No matching activity traces found
                        </p>
                        <p className="text-xs text-stone-400 max-w-sm">
                            {hasActiveFilters 
                                ? "No audit records matched your active filters. Try broadening your search or resetting filters." 
                                : "No activity has been recorded in the system yet."}
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="mt-2 px-4 py-2 bg-stone-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-stone-800 transition-colors rounded-none cursor-pointer"
                            >
                                Reset Search Filters
                            </button>
                        )}
                    </div>
                )}

                {/* Pagination Footer */}
                {totalCount > limit && (
                    <div className="border-t border-stone-200 bg-stone-50/50 p-4">
                        <Pagination 
                            count={totalCount} 
                            limit={limit} 
                            offset={offset} 
                            onPageChange={setOffset} 
                        />
                    </div>
                )}
            </div>

            {/* Inspection Modal */}
            <AuditDetailModal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                log={selectedLog}
                categoryInfo={selectedLog ? getCategoryInfo(selectedLog.what_performed) : null}
            />
        </div>
    );
};

export default AuditTrailPage;
