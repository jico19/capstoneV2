import React from 'react';
import { 
    BarChart3, 
    Download, 
    FileText, 
    PieChart, 
    TrendingUp, 
    Calendar,
    ArrowRight,
    Search
} from 'lucide-react';

/**
 * Agri Reports Page
 * Centralized interface for municipal reporting and data export.
 * Adheres to Design.MD: Stone neutrals, flat UI, square edges.
 */
const AgriReportsPage = () => {
    // Mock report types for the prototype UI
    const reports = [
        {
            id: 'permit-issuance',
            title: 'Permit Issuance Summary',
            description: 'Comprehensive list of all issued permits including destination and animal counts.',
            lastGenerated: 'Today, 10:45 AM',
            icon: FileText
        },
        {
            id: 'revenue-collection',
            title: 'Revenue & Fees Report',
            description: 'Financial breakdown of all collected permit fees and payment gateway transactions.',
            lastGenerated: 'Yesterday, 4:20 PM',
            icon: BarChart3
        },
        {
            id: 'barangay-distribution',
            title: 'Barangay Volume Distribution',
            description: 'Analysis of livestock movement origin points across all municipal barangays.',
            lastGenerated: 'May 02, 2026',
            icon: PieChart
        },
        {
            id: 'inspector-logs',
            title: 'Field Inspection Audit',
            description: 'Detailed log of QR code scans and field checkpoints recorded by inspectors.',
            lastGenerated: 'May 01, 2026',
            icon: TrendingUp
        }
    ];

    const handleExport = (reportId, format) => {
        console.log(`Exporting ${reportId} as ${format}`);
        // Implementation for actual export would go here
    };

    return (
        <div className="p-4 md:p-8 space-y-10 bg-stone-50/50 min-h-full">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-stone-200 pb-8 gap-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Data & Analytics</p>
                    <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter">Municipal Reports</h1>
                </div>
                
                <div className="flex items-center gap-3 bg-white border border-stone-200 px-4 py-3 rounded-none w-full md:w-auto">
                    <Calendar size={16} className="text-stone-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">Reporting Period: May 2026</span>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reports.map((report) => (
                    <div key={report.id} className="bg-white border border-stone-200 rounded-none overflow-hidden flex flex-col group">
                        <div className="p-8 space-y-4 flex-1">
                            <div className="flex items-start justify-between">
                                <div className="p-4 bg-stone-50 border border-stone-100 text-stone-400 group-hover:text-green-700 group-hover:border-green-100 group-hover:bg-green-50 transition-colors duration-200">
                                    <report.icon size={24} />
                                </div>
                                <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em]">
                                    Report ID: {report.id.toUpperCase()}
                                </span>
                            </div>
                            
                            <div className="space-y-2">
                                <h2 className="text-xl font-black text-stone-800 uppercase tracking-tight">
                                    {report.title}
                                </h2>
                                <p className="text-xs text-stone-500 font-medium leading-relaxed">
                                    {report.description}
                                </p>
                            </div>

                            <div className="pt-4 flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Last Generated:</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">{report.lastGenerated}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 border-t border-stone-100">
                            <button 
                                onClick={() => handleExport(report.id, 'CSV')}
                                className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-stone-600 hover:bg-stone-50 flex items-center justify-center gap-2 border-r border-stone-100 transition-colors"
                            >
                                <Download size={14} /> Export CSV
                            </button>
                            <button 
                                onClick={() => handleExport(report.id, 'PDF')}
                                className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-green-700 hover:bg-green-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                <FileText size={14} /> Export PDF
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Advanced Search/Filter Section */}
            <div className="bg-white border border-stone-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1">
                    <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight">Need a custom dataset?</h3>
                    <p className="text-xs text-stone-500 font-medium">Use the advanced filter to generate specific date-range reports.</p>
                </div>
                <button className="w-full md:w-auto bg-stone-800 hover:bg-stone-700 text-white px-8 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-3">
                    <Search size={16} /> Open Advanced Filter <ArrowRight size={16} />
                </button>
            </div>

            {/* Compliance Footer */}
            <div className="flex items-center justify-center gap-2 pt-10 border-t border-stone-100 opacity-30">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">
                    Official Municipal Record System • SARIAYA, QUEZON
                </p>
            </div>
        </div>
    );
};

export default AgriReportsPage;
