import React, { useState, useEffect } from 'react';
import { 
    Sparkles, 
    RefreshCw, 
    AlertCircle, 
    TrendingUp, 
    CheckCircle2, 
    X, 
    Copy, 
    Check, 
    ArrowRight,
    SlidersHorizontal,
    Layers
} from 'lucide-react';
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
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
};

const SmartInsights = ({ 
    role = null, 
    title = 'Smart AI Insights',
    showButton = true,
    showFab = true,
    className = '' 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'trends' | 'actions'
    const [copied, setCopied] = useState(false);

    const { data, isLoading, isError, refetch } = useGetDashboardInsights(role);
    const refreshMutation = useRefreshDashboardInsights(role);

    const isRefreshing = refreshMutation.isPending;
    const { summary, trends = [], actions = [], generated_at } = data || {};

    const hasAttentionItems = trends.some(t => t.severity === 'warning' || t.severity === 'critical');
    const totalItems = trends.length + actions.length;

    // Handle ESC key to close drawer & lock body scroll
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleCopy = () => {
        if (!summary) return;
        const textToCopy = `[FarmPass Intelligence - ${title}]\nGenerated: ${new Date(generated_at).toLocaleString()}\n\nExecutive Summary:\n${summary}\n\nKey Trends:\n${trends.map(t => `- [${t.severity.toUpperCase()}] ${t.text}`).join('\n')}\n\nRecommended Actions:\n${actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
        
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            {/* Header Trigger Button (When mounted in dashboard toolbars) */}
            {showButton && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-[11px] font-black uppercase tracking-wider transition-all duration-150 rounded-none shadow-xs group cursor-pointer ${className}`}
                    title="Open AI Operations Insights Drawer"
                >
                    <Sparkles size={14} className="text-emerald-700 group-hover:rotate-12 transition-transform duration-200" />
                    <span>AI Insights</span>
                    {totalItems > 0 && (
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.2 text-[9px] font-black rounded-none ${
                            hasAttentionItems ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-200/80 text-emerald-900'
                        }`}>
                            {totalItems}
                        </span>
                    )}
                </button>
            )}

            {/* Floating Action Button (FAB on Bottom-Right) */}
            {showFab && !isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-30 flex items-center gap-2.5 px-4 py-3 bg-stone-900 hover:bg-emerald-900 text-white shadow-xl hover:shadow-2xl border border-stone-700 hover:border-emerald-500 transition-all duration-200 rounded-none group cursor-pointer animate-fade-in"
                    title="View Automated System Insights"
                >
                    <div className="relative">
                        <Sparkles size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        {hasAttentionItems && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                        )}
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">
                        Insights
                    </span>
                    {totalItems > 0 && (
                        <span className="bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-none">
                            {totalItems}
                        </span>
                    )}
                </button>
            )}

            {/* Slide-Over Drawer & Backdrop Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity duration-300"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Drawer Panel */}
                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-xl bg-white border-l border-stone-200 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
                            
                            {/* Drawer Header */}
                            <div className="p-6 bg-stone-50/80 border-b border-stone-200 flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-800">
                                            <Sparkles size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-xs font-black uppercase tracking-widest text-stone-900">
                                                    {title}
                                                </h2>
                                                <span className="px-1.5 py-0.5 bg-emerald-700 text-white text-[8px] font-black uppercase tracking-wider">
                                                    AI Engine
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-stone-500 font-medium mt-0.5">
                                                Updated {formatTimeAgo(generated_at)} • Automated Trend Analysis
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {/* Copy button */}
                                        <button
                                            onClick={handleCopy}
                                            disabled={!summary}
                                            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors rounded-none disabled:opacity-30 cursor-pointer"
                                            title="Copy Insights Summary"
                                        >
                                            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                                        </button>

                                        {/* Close button */}
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors rounded-none cursor-pointer"
                                            title="Close Drawer (Esc)"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Refresh action row */}
                                <div className="flex items-center justify-between pt-2 border-t border-stone-200/60">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                        Periodic Activity & Swine Movement
                                    </span>
                                    <button
                                        onClick={() => refreshMutation.mutate()}
                                        disabled={isRefreshing}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-[10px] font-black uppercase tracking-wider transition-colors rounded-none disabled:opacity-50 cursor-pointer"
                                        title="Recalculate live insights from latest database records"
                                    >
                                        <RefreshCw size={11} className={isRefreshing ? 'animate-spin text-emerald-700' : ''} />
                                        <span>{isRefreshing ? 'Recalculating...' : 'Refresh Insights'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex items-center border-b border-stone-200 bg-white px-6">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`py-3 px-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                                        activeTab === 'all'
                                            ? 'border-emerald-700 text-emerald-900'
                                            : 'border-transparent text-stone-400 hover:text-stone-700'
                                    }`}
                                >
                                    Overview ({totalItems})
                                </button>
                                <button
                                    onClick={() => setActiveTab('trends')}
                                    className={`py-3 px-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                                        activeTab === 'trends'
                                            ? 'border-emerald-700 text-emerald-900'
                                            : 'border-transparent text-stone-400 hover:text-stone-700'
                                    }`}
                                >
                                    Trends & Shifts ({trends.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('actions')}
                                    className={`py-3 px-3 text-[10px] font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                                        activeTab === 'actions'
                                            ? 'border-emerald-700 text-emerald-900'
                                            : 'border-transparent text-stone-400 hover:text-stone-700'
                                    }`}
                                >
                                    Action Items ({actions.length})
                                </button>
                            </div>

                            {/* Scrollable Content Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50/30">
                                {isLoading ? (
                                    <div className="space-y-4 animate-pulse">
                                        <div className="h-20 bg-stone-100 rounded-none" />
                                        <div className="h-28 bg-stone-100 rounded-none" />
                                        <div className="h-28 bg-stone-100 rounded-none" />
                                    </div>
                                ) : isError ? (
                                    <div className="bg-rose-50 border border-rose-200 p-5 text-rose-900 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle size={18} className="text-rose-600 shrink-0" />
                                            <p className="text-xs font-black uppercase tracking-widest">Insights Engine Offline</p>
                                        </div>
                                        <p className="text-xs text-rose-700">
                                            Unable to calculate live analytical insights. Dashboard operations remain functional.
                                        </p>
                                        <button
                                            onClick={() => refetch()}
                                            className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 text-xs font-bold uppercase tracking-wider hover:bg-rose-50"
                                        >
                                            Retry Connection
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Executive Summary Card */}
                                        {summary && (activeTab === 'all' || activeTab === 'trends') && (
                                            <div className="bg-white border-l-4 border-emerald-700 border-stone-200 border-t border-r border-b p-4 space-y-2 shadow-xs">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-950">
                                                        Executive Briefing
                                                    </p>
                                                    <span className="text-[9px] font-bold text-stone-400 uppercase">
                                                        High Priority
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-normal">
                                                    {summary}
                                                </p>
                                            </div>
                                        )}

                                        {/* Trends Section */}
                                        {(activeTab === 'all' || activeTab === 'trends') && (
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                                                    <TrendingUp size={13} className="text-stone-700" />
                                                    Key Trends & Observed Patterns
                                                </p>

                                                {trends.length > 0 ? (
                                                    <div className="space-y-2.5">
                                                        {trends.map((item, index) => {
                                                            const badge = getSeverityBadge(item.severity);
                                                            return (
                                                                <div 
                                                                    key={index}
                                                                    className="bg-white border border-stone-200 p-3.5 space-y-2 hover:border-stone-300 transition-colors shadow-xs"
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider ${badge.bg}`}>
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                                            {badge.label}
                                                                        </span>
                                                                        <span className="text-[9px] text-stone-400 font-bold uppercase">
                                                                            Signal #{index + 1}
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
                                                    <p className="text-xs text-stone-500 italic p-4 bg-white border border-stone-200">
                                                        No significant trend anomalies detected in current period.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Recommended Action Items */}
                                        {(activeTab === 'all' || activeTab === 'actions') && (
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                                                    <CheckCircle2 size={13} className="text-emerald-700" />
                                                    Recommended Directives
                                                </p>

                                                {actions.length > 0 ? (
                                                    <div className="space-y-2.5">
                                                        {actions.map((actionText, index) => (
                                                            <div 
                                                                key={index}
                                                                className="bg-emerald-50/40 border border-emerald-200/80 p-3.5 flex items-start gap-3 shadow-xs"
                                                            >
                                                                <div className="w-5 h-5 rounded-none bg-emerald-800 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                                                    {index + 1}
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                                                                        {actionText}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-stone-500 italic p-4 bg-white border border-stone-200">
                                                        All queues and surveillance parameters are currently within normal thresholds.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Drawer Footer */}
                            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-500 font-medium">
                                <span>FarmPass Analytical Intelligence</span>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="px-3 py-1.5 bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider hover:bg-stone-800 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SmartInsights;

