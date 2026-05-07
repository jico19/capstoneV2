import { useState } from 'react';
import { api } from '/src/lib/api';
import {
    BarChart3,
    Download,
    FileText,
    PieChart,
    TrendingUp,
    Calendar,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Agri Reports Page
 * Generates and downloads server-side PDF and CSV reports for a chosen date range.
 * Each report card shows what data it covers and two export buttons (PDF/CSV).
 * Props: none — all state and fetching is managed here.
 */
const AgriReportsPage = () => {
    // Today's date in YYYY-MM-DD format, used as default for both fields
    const todayStr = new Date().toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);

    // Track which button is currently loading: "<reportId>-<format>"
    const [loadingKey, setLoadingKey] = useState(null);
    const downloadFile = async (url, filename, loadKey) => {
        if (startDate > endDate) {
            toast.error("Invalid Period", { description: "Start date cannot be after end date." });
            return;
        }

        setLoadingKey(loadKey);
        try {
            const { data } = await api.get(url, {
                params: { start_date: startDate, end_date: endDate },
                responseType: 'blob',
            });

            const blobUrl = URL.createObjectURL(data);
            const link = document.createElement('a');
            Object.assign(link, { href: blobUrl, download: filename });
            document.body.append(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(blobUrl);

            toast.success("Download Complete", { description: filename });
        } catch (err) {
            toast.error("Download Failed", { description: "Please try again later." });
        } finally {
            setLoadingKey(null);
        }
    };

    // Build filename with the selected date range baked in
    const dateTag = startDate === endDate
        ? startDate
        : `${startDate}_to_${endDate}`;

    // Report card definitions — each maps to a backend endpoint
    const reports = [
        {
            id: 'permit-issuance',
            title: 'Permit Issuance Summary',
            description: 'Complete list of all issued permits — farmer name, origin, destination, and total head count.',
            icon: FileText,
            accentColor: 'text-green-700',
            bgColor: 'group-hover:bg-green-50 group-hover:border-green-100 group-hover:text-green-700',
            hasCsv: true,
            pdfEndpoint: '/report/permit-issuance/pdf/',
            csvEndpoint: '/report/permit-issuance/csv/',
            pdfFilename: `PERMIT_ISSUANCE_${dateTag}.pdf`,
            csvFilename: `PERMIT_ISSUANCE_${dateTag}.csv`,
        },
        {
            id: 'barangay-distribution',
            title: 'Barangay Volume Distribution',
            description: 'Livestock movement origin points: how many pigs were transported from each barangay.',
            icon: PieChart,
            accentColor: 'text-sky-700',
            bgColor: 'group-hover:bg-sky-50 group-hover:border-sky-100 group-hover:text-sky-700',
            hasCsv: false,
            pdfEndpoint: '/report/barangay-distribution/pdf/',
            pdfFilename: `BARANGAY_DISTRIBUTION_${dateTag}.pdf`,
        },
        {
            id: 'inspector-logs',
            title: 'Field Inspection Audit',
            description: 'Detailed log of all QR code scans and field checkpoints recorded by inspectors.',
            icon: TrendingUp,
            accentColor: 'text-amber-700',
            bgColor: 'group-hover:bg-amber-50 group-hover:border-amber-100 group-hover:text-amber-700',
            hasCsv: false,
            pdfEndpoint: '/report/inspector-logs/pdf/',
            pdfFilename: `INSPECTOR_LOGS_${dateTag}.pdf`,
        },
        {
            id: 'revenue-collection',
            title: 'Revenue & Fees Report',
            description: 'Financial breakdown of all collected permit fees and successful payment transactions.',
            icon: BarChart3,
            accentColor: 'text-stone-700',
            bgColor: 'group-hover:bg-stone-100 group-hover:border-stone-200 group-hover:text-stone-700',
            hasCsv: false,
            pdfEndpoint: '/payment/generate_report/',
            pdfFilename: `COLLECTION_REPORT_${dateTag}.pdf`,
        },
    ];

    return (
        <div className="p-4 md:p-10 space-y-10 bg-stone-50/50 min-h-full">

            {/* Page Header */}
            <div className="border-b border-stone-200 pb-8 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Data & Analytics</p>
                <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter">Municipal Reports</h1>
                <p className="text-sm font-medium text-stone-500 pt-1">
                    All reports are generated from live data and downloaded directly to your device.
                </p>
            </div>

            {/* Date Range Filter */}
            <div className="bg-white border border-stone-200 p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-stone-400" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">Reporting Period</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="space-y-1 flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            From
                        </label>
                        <input
                            id="report-start-date"
                            type="date"
                            value={startDate}
                            max={endDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-stone-200 bg-white px-3 py-2 text-sm font-mono font-bold text-stone-800 focus:outline-none focus:border-green-700"
                        />
                    </div>
                    <div className="space-y-1 flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            To
                        </label>
                        <input
                            id="report-end-date"
                            type="date"
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full border border-stone-200 bg-white px-3 py-2 text-sm font-mono font-bold text-stone-800 focus:outline-none focus:border-green-700"
                        />
                    </div>

                    {startDate > endDate && (
                        <div className="flex items-center gap-2 text-red-600 text-xs font-bold pt-4">
                            <AlertCircle size={14} />
                            Start date cannot be after end date.
                        </div>
                    )}
                </div>
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reports.map((report) => {
                    const isPdfLoading = loadingKey === `${report.id}-pdf`;
                    const isCsvLoading = loadingKey === `${report.id}-csv`;

                    return (
                        <div
                            key={report.id}
                            className="bg-white border border-stone-200 flex flex-col group"
                        >
                            {/* Card Body */}
                            <div className="p-8 space-y-4 flex-1">
                                <div className="flex items-start justify-between">
                                    <div className={`p-4 bg-stone-50 border border-stone-100 text-stone-400 transition-colors duration-200 ${report.bgColor}`}>
                                        <report.icon size={24} />
                                    </div>
                                    <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em]">
                                        ID: {report.id.toUpperCase()}
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
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Period:</span>
                                    <span className="text-[10px] font-mono font-black text-stone-700">
                                        {startDate === endDate ? startDate : `${startDate} → ${endDate}`}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className={`grid ${report.hasCsv ? 'grid-cols-2' : 'grid-cols-1'} border-t border-stone-100`}>
                                {/* CSV button — only for permit issuance */}
                                {report.hasCsv && (
                                    <button
                                        id={`export-csv-${report.id}`}
                                        disabled={isCsvLoading || startDate > endDate}
                                        onClick={() => downloadFile(report.csvEndpoint, report.csvFilename, `${report.id}-csv`)}
                                        className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-stone-600 hover:bg-stone-50 flex items-center justify-center gap-2 border-r border-stone-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {isCsvLoading
                                            ? <><Loader2 size={14} className="animate-spin" /> Generating...</>
                                            : <><Download size={14} /> Export CSV</>
                                        }
                                    </button>
                                )}

                                {/* PDF button — always shown */}
                                <button
                                    id={`export-pdf-${report.id}`}
                                    disabled={isPdfLoading || startDate > endDate}
                                    onClick={() => downloadFile(report.pdfEndpoint, report.pdfFilename, `${report.id}-pdf`)}
                                    className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-green-700 hover:bg-green-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isPdfLoading
                                        ? <><Loader2 size={14} className="animate-spin" /> Generating...</>
                                        : <><FileText size={14} /> Export PDF</>
                                    }
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AgriReportsPage;
