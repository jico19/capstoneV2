import React from 'react';
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useGetDashboardInsights, useRefreshDashboardInsights } from '../../hooks/useDashboard';

const getSeverityBadge = (severity) => {
    switch (severity) {
        case 'positive':
            return {
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                label: 'Positive Trend',
                dot: 'bg-emerald-500'
            };
        case 'warning':
            return {
                bg: 'bg-amber-50 text-amber-800 border-amber-200',
                label: 'Attention Needed',
                dot: 'bg-amber-500'
            };
        case 'critical':
            return {
                bg: 'bg-rose-50 text-rose-800 border-rose-200',
                label: 'Action Required',
                dot: 'bg-rose-500'
            };
        default:
            return {
                bg: 'bg-stone-50 text-stone-700 border-stone-200',
                label: 'Observation',
                dot: 'bg-stone-400'
            };
    }
};

const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
};

const SmartInsights = ({ role = null, title = 'Smart AI Insights' }) => {
    const { data, isLoading, isError, refetch } = useGetDashboardInsights(role);
    const refreshMutation = useRefreshDashboardInsights(role);

    const isRefreshing = refreshMutation.isPending;

    if (isLoading) {
        return (
            <div className="bg-white border border-stone-200 rounded-none p-6 space-y-4 animate-pulse">
                <div className="flex justify-between items-center pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-stone-200 rounded-none" />
                        <div className="h-4 w-40 bg-stone-200 rounded-none" />
                    </div>
                    <div className="h-4 w-20 bg-stone-200 rounded-none" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 w-full bg-stone-100 rounded-none" />
                    <div className="h-3 w-4/5 bg-stone-100 rounded-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="h-16 bg-stone-50 border border-stone-100 rounded-none" />
                    <div className="h-16 bg-stone-50 border border-stone-100 rounded-none" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-rose-50/60 border border-rose-200 rounded-none p-4 text-rose-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <AlertCircle size={18} className="text-rose-600 shrink-0" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">AI Intelligence Offline</p>
                        <p className="text-xs text-rose-700 mt-0.5">Unable to sync AI trend insights. System metrics remain fully operational.</p>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-3 py-1.5 bg-white border border-rose-200 text-rose-800 text-xs font-bold uppercase tracking-wider hover:bg-rose-50 transition-colors rounded-none"
                >
                    Retry
                </button>
            </div>
        );
    }

    const { summary, trends = [], actions = [], generated_at } = data || {};

    return (
        <div className="bg-white border border-stone-200 rounded-none p-6 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-4">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs font-black uppercase tracking-widest text-stone-900">
                                {title}
                            </h2>
                            <span className="inline-flex items-center px-1.5 py-0.5 bg-stone-100 border border-stone-200 text-[9px] font-bold uppercase tracking-wider text-stone-600 rounded-none">
                                Automated Analysis
                            </span>
                        </div>
                        <p className="text-[10px] text-stone-400 font-medium">
                            Calculated {formatTimeAgo(generated_at)} based on period-over-period operational activity
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => refreshMutation.mutate()}
                    disabled={isRefreshing}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-black uppercase tracking-wider transition-colors duration-150 rounded-none disabled:opacity-50 cursor-pointer"
                    title="Recalculate live insights"
                >
                    <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-emerald-700' : ''} />
                    <span>{isRefreshing ? 'Analyzing...' : 'Refresh Insights'}</span>
                </button>
            </div>

            {/* At a Glance Executive Summary */}
            {summary && (
                <div className="bg-stone-50/60 border-l-4 border-emerald-700 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-900 mb-1">
                        Executive Summary
                    </p>
                    <p className="text-sm text-stone-800 leading-relaxed font-normal">
                        {summary}
                    </p>
                </div>
            )}

            {/* Grid for Trends and Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
                {/* Key Trends & Anomalies */}
                <div className="lg:col-span-7 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                        <TrendingUp size={13} className="text-stone-600" />
                        Key Trends & Period-over-Period Shifts
                    </p>
                    {trends.length > 0 ? (
                        <div className="space-y-2.5">
                            {trends.map((item, index) => {
                                const badge = getSeverityBadge(item.severity);
                                return (
                                    <div 
                                        key={index}
                                        className="bg-white border border-stone-200 p-3.5 flex flex-col gap-2 rounded-none hover:border-stone-300 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider rounded-none ${badge.bg}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                {badge.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-stone-800 leading-relaxed">
                                            {item.text}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-stone-500 italic p-3 bg-stone-50 border border-stone-100">
                            No notable anomalies or metric swings detected in this period.
                        </p>
                    )}
                </div>

                {/* Recommended Actions */}
                <div className="lg:col-span-5 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-700" />
                        Recommended Action Items
                    </p>
                    {actions.length > 0 ? (
                        <div className="space-y-2.5">
                            {actions.map((actionText, index) => (
                                <div 
                                    key={index}
                                    className="bg-emerald-50/30 border border-emerald-200/70 p-3.5 flex items-start gap-3 rounded-none"
                                >
                                    <div className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                        {index + 1}
                                    </div>
                                    <p className="text-xs text-stone-800 leading-relaxed">
                                        {actionText}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-stone-500 italic p-3 bg-stone-50 border border-stone-100">
                            All workflows are operating on schedule. No urgent actions pending.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartInsights;
