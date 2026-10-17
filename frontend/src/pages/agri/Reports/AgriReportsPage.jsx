import { downloadBlob } from '../../../lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import {
    BarChart3,
    Download,
    FileText,
    PieChart,
    ShieldCheck,
    Calendar,
    Loader2,
    AlertCircle,
    FileEdit,
} from 'lucide-react';
import { toast } from 'sonner';
import ReportDrafterModal from './ReportDrafterModal';

/**
 * Agri Reports Page — Municipal Authority Hub (Option A: Executive Studio)
 * Generates and downloads official LGU PDF memorandums and CSV audits for chosen periods.
 * Designed to adhere strictly to FarmPass Design System 2.1 & antislop guidelines.
 */
const AgriReportsPage = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [selectedReportForDraft, setSelectedReportForDraft] = useState(null);
    const [loadingKey, setLoadingKey] = useState(null);

    // Date Presets for quick selection
    const applyPreset = (preset) => {
        const now = new Date();
        const end = now.toISOString().split('T')[0];
        let start = end;

        if (preset === 'today') {
            start = end;
        } else if (preset === '7days') {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            start = d.toISOString().split('T')[0];
        } else if (preset === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            start = firstDay.toISOString().split('T')[0];
        } else if (preset === '30days') {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            start = d.toISOString().split('T')[0];
        }

        setStartDate(start);
        setEndDate(end);
    };

    const downloadFile = async (url, filename, loadKey) => {
        if (startDate > endDate) {
            toast.error("Invalid Reporting Period", { description: "Start date cannot be after end date." });
            return;
        }

        setLoadingKey(loadKey);
        try {
            const { data } = await api.get(url, {
                params: { start_date: startDate, end_date: endDate },
                responseType: 'blob',
            });

            downloadBlob(data, filename);
            toast.success("Download Complete", { description: filename });
        } catch {
            toast.error("Download Failed", { description: "Unable to generate file. Please try again." });
        } finally {
            setLoadingKey(null);
        }
    };

    const dateTag = startDate === endDate
        ? startDate
        : `${startDate}_to_${endDate}`;

    // Canonical municipal reports definitions with statutory authority metadata
    const reports = useMemo(() => [
        {
            id: 'permit-issuance',
            reportType: 'permit_issuance',
            category: 'Statutory Registry',
            authority: 'RA 7160 Sec. 482 / DA-BAI AO No. 05',
            signatory: 'Municipal Agriculturist',
            title: 'Permit Issuance Summary',
            description: 'Executive Memorandum detailing all approved livestock transport permits, registered volumes, consignees, and transit routes.',
            icon: FileText,
            iconColor: 'text-green-700 bg-green-50 border-green-200',
            hasCsv: true,
            pdfEndpoint: '/report/permit-issuance/pdf/',
            csvEndpoint: '/report/permit-issuance/csv/',
            pdfFilename: `LGU_MEMORANDUM_PERMIT_ISSUANCE_${dateTag}.pdf`,
            csvFilename: `PERMIT_ISSUANCE_${dateTag}.csv`,
        },
        {
            id: 'barangay-distribution',
            reportType: 'barangay_distribution',
            category: 'Biosecurity Surveillance',
            authority: 'National ASF Biosecurity Zoning / DA Circular',
            signatory: 'Provincial Veterinarian (OPV)',
            title: 'Barangay Volume Distribution',
            description: 'Spatial density audit showing livestock origin barangays, production clusters, and biosecurity zoning compliance.',
            icon: PieChart,
            iconColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            hasCsv: false,
            pdfEndpoint: '/report/barangay-distribution/pdf/',
            pdfFilename: `LGU_MEMORANDUM_BARANGAY_DISTRIBUTION_${dateTag}.pdf`,
        },
        {
            id: 'inspector-logs',
            reportType: 'inspector_logs',
            category: 'Law Enforcement',
            authority: 'Sariaya Checkpoint Enforcement Ordinance',
            signatory: 'Chief Quarantine Inspector',
            title: 'Field Inspection Audit',
            description: 'Checkpoint enforcement synthesis tracking field officer mobile QR verifications, scan timestamps, and transit compliance.',
            icon: ShieldCheck,
            iconColor: 'text-amber-800 bg-amber-50 border-amber-200',
            hasCsv: false,
            pdfEndpoint: '/report/inspector-logs/pdf/',
            pdfFilename: `LGU_MEMORANDUM_INSPECTOR_LOGS_${dateTag}.pdf`,
        },
        {
            id: 'revenue-collection',
            reportType: 'revenue_collection',
            category: 'Treasury & Audit',
            authority: 'Sariaya Municipal Revenue Code / COA Standards',
            signatory: 'Municipal Treasurer & MAO',
            title: 'Revenue & Collection Report',
            description: 'Municipal regulatory collection ledger detailing permit regulatory fees, PayMongo settlements, and MTO remittances.',
            icon: BarChart3,
            iconColor: 'text-stone-700 bg-stone-100 border-stone-200',
            hasCsv: false,
            pdfEndpoint: '/report/revenue-collection/pdf/',
            pdfFilename: `LGU_MEMORANDUM_COLLECTION_REPORT_${dateTag}.pdf`,
        },
    ], [dateTag]);

    const [searchParams] = useSearchParams();

    // Auto-open modal and sync dates when redirected from other modules (e.g. Payments page)
    useEffect(() => {
        const targetReportId = searchParams.get('report');
        const paramStart = searchParams.get('startDate');
        const paramEnd = searchParams.get('endDate');

        if (paramStart) setStartDate(paramStart);
        if (paramEnd) setEndDate(paramEnd);

        if (targetReportId) {
            const matched = reports.find(
                (r) => r.id === targetReportId || r.reportType === targetReportId
            );
            if (matched) {
                setSelectedReportForDraft(matched);
            }
        }
    }, [searchParams, reports]);

    return (
        <div className="p-4 md:p-8 space-y-8 bg-stone-50/40 min-h-full">
            {/* Header: Grounded Municipal Context */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 pb-6">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                            Republic of the Philippines
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="text-xs font-medium text-stone-500">
                            Municipality of Sariaya
                        </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-stone-800 tracking-tight">
                        Municipal Reports & Audits
                    </h1>
                    <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
                        Compile verified municipal records into official LGU Memorandums under RA 7160.
                        Open the Executive Drafting Studio to customize transmittal routing, observations, and attestation chains with live A4 preview.
                    </p>
                </div>
            </div>

            {/* Reporting Period Filter Bar */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-stone-700">
                        <Calendar size={18} className="text-green-700 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                            Reporting Scope & Period Filter
                        </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-stone-500 mr-1 hidden sm:inline">Presets:</span>
                        <button
                            type="button"
                            onClick={() => applyPreset('today')}
                            className="btn-tactile px-2.5 py-1 text-xs font-medium rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset('7days')}
                            className="btn-tactile px-2.5 py-1 text-xs font-medium rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors"
                        >
                            Past 7 Days
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset('month')}
                            className="btn-tactile px-2.5 py-1 text-xs font-medium rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors"
                        >
                            Month to Date
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset('30days')}
                            className="btn-tactile px-2.5 py-1 text-xs font-medium rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors"
                        >
                            Past 30 Days
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-stone-100 items-end">
                    <div className="space-y-1">
                        <label htmlFor="report-start-date" className="block text-xs font-semibold text-stone-600">
                            Period Start Date
                        </label>
                        <input
                            id="report-start-date"
                            type="date"
                            value={startDate}
                            max={endDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="report-end-date" className="block text-xs font-semibold text-stone-600">
                            Period End Date
                        </label>
                        <input
                            id="report-end-date"
                            type="date"
                            value={endDate}
                            min={startDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
                        />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-3 h-10 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs">
                        <span className="text-stone-500 font-medium">Active Ledger Range:</span>
                        <span className="font-semibold text-stone-800 font-mono">
                            {startDate === endDate ? startDate : `${startDate} → ${endDate}`}
                        </span>
                    </div>
                </div>

                {startDate > endDate && (
                    <div className="flex items-center gap-2 text-red-600 text-xs font-medium pt-1">
                        <AlertCircle size={15} />
                        Start date cannot be after end date.
                    </div>
                )}
            </div>

            {/* Reports Grid (Dossier Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reports.map((report) => {
                    const isPdfLoading = loadingKey === `${report.id}-pdf`;
                    const isCsvLoading = loadingKey === `${report.id}-csv`;
                    const isPeriodInvalid = startDate > endDate;

                    return (
                        <div
                            key={report.id}
                            className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between hover:border-stone-300 transition-colors"
                        >
                            {/* Card Content */}
                            <div className="p-6 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className={`p-3 rounded-lg border ${report.iconColor} shrink-0`}>
                                        <report.icon size={22} />
                                    </div>
                                    <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                                        {report.category}
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                                        {report.title}
                                    </h2>
                                    <p className="text-xs text-stone-600 leading-relaxed">
                                        {report.description}
                                    </p>
                                </div>

                                {/* Statutory Authority & Signatory Metadata */}
                                <div className="pt-3 border-t border-stone-100 space-y-1 text-[11px] text-stone-500">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="font-semibold text-stone-600">Legal Authority:</span>
                                        <span className="font-mono text-stone-700 truncate">{report.authority}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="font-semibold text-stone-600">Signatory:</span>
                                        <span className="text-stone-700 truncate">{report.signatory}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Actions: Clean Hierarchy */}
                            <div className="p-4 bg-stone-50/70 border-t border-stone-200 space-y-2.5">
                                {/* Primary Action: Open Drafting Studio */}
                                <button
                                    type="button"
                                    disabled={isPeriodInvalid}
                                    onClick={() => setSelectedReportForDraft(report)}
                                    className="btn-tactile w-full py-2.5 px-4 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <FileEdit size={15} />
                                    Open Executive Drafting Studio
                                </button>

                                {/* Secondary Quick Downloads */}
                                <div className={`grid ${report.hasCsv ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                    {report.hasCsv && (
                                        <button
                                            id={`export-csv-${report.id}`}
                                            disabled={isCsvLoading || isPeriodInvalid}
                                            onClick={() => downloadFile(report.csvEndpoint, report.csvFilename, `${report.id}-csv`)}
                                            className="btn-tactile py-2 px-3 text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                                        >
                                            {isCsvLoading ? (
                                                <><Loader2 size={13} className="animate-spin text-stone-600" /> Generating CSV...</>
                                            ) : (
                                                <><Download size={13} className="text-stone-500" /> Raw CSV</>
                                            )}
                                        </button>
                                    )}

                                    <button
                                        id={`export-pdf-${report.id}`}
                                        disabled={isPdfLoading || isPeriodInvalid}
                                        onClick={() => downloadFile(report.pdfEndpoint, report.pdfFilename, `${report.id}-pdf`)}
                                        className="btn-tactile py-2 px-3 text-xs font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                                    >
                                        {isPdfLoading ? (
                                            <><Loader2 size={13} className="animate-spin text-stone-600" /> Generating PDF...</>
                                        ) : (
                                            <><Download size={13} className="text-stone-500" /> Quick PDF</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Official Report Drafter Modal */}
            <ReportDrafterModal
                isOpen={!!selectedReportForDraft}
                onClose={() => setSelectedReportForDraft(null)}
                report={selectedReportForDraft}
                startDate={startDate}
                endDate={endDate}
            />
        </div>
    );
};

export default AgriReportsPage;
