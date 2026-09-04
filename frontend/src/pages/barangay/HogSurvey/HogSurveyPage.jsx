import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
    Activity,
    Plus,
    X,
    Check,
    Edit,
    Trash2,
    Calendar,
    FileText,
    UploadCloud,
    AlertCircle,
    Info,
    User,
    Phone,
    Table,
    RotateCcw
} from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import ConfirmationModal from '../../../components/ui/ConfirmationModal';
import useAuthStore from '../../../store/authStore';
import { parseValidationError, downloadBlob } from '../../../lib/utils';


const createEmptyRow = (id) => ({
    id: id || Math.random().toString(36).substring(2, 9),
    farmer_name: '',
    contact_number: '',
    inahin: '',
    barako: '',
    fattener: '',
    grower: '',
    starter: '',
    bulaw: ''
});

const HogSurveyPage = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    
    // Modal & Form state
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [editingSurvey, setEditingSurvey] = useState(null);
    const [confirmDeleteSurvey, setConfirmDeleteSurvey] = useState(null);

    // Rapid Multi-Row Batch Encoder state
    const [showEncoder, setShowEncoder] = useState(true);
    const [batchDate, setBatchDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [batchRows, setBatchRows] = useState(() => [
        createEmptyRow('row-1'),
        createEmptyRow('row-2'),
        createEmptyRow('row-3')
    ]);

    // CSV upload state
    const [csvFile, setCsvFile] = useState(null);
    const [csvErrors, setCsvErrors] = useState([]);

    // Query for all hog surveys in their assigned barangay
    const { data, isLoading, isError, isFetching } = useQuery({
        queryKey: ['barangay-hog-surveys', limit, offset],
        queryFn: async () => {
            const res = await api.get('/hog-survey/', {
                params: { limit, offset }
            });
            return res.data;
        }
    });

    const pigCategories = ['inahin', 'barako', 'fattener', 'grower', 'bulaw', 'starter'];

    const getRowTotal = (row) => {
        return (
            (parseInt(row.inahin, 10) || 0) +
            (parseInt(row.barako, 10) || 0) +
            (parseInt(row.fattener, 10) || 0) +
            (parseInt(row.grower, 10) || 0) +
            (parseInt(row.starter, 10) || 0) +
            (parseInt(row.bulaw, 10) || 0)
        );
    };

    // Mutation: Batch Create rapid multi-row surveys
    const batchMutation = useMutation({
        mutationFn: async ({ surveys }) => {
            const res = await api.post('/hog-survey/batch_create/', { surveys });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data?.message || "Batch surveys saved successfully!");
            queryClient.invalidateQueries({ queryKey: ['barangay-hog-surveys'] });
            queryClient.invalidateQueries({ queryKey: ['barangay-density-data'] });
            queryClient.invalidateQueries({ queryKey: ['barangay-surveys-recent'] });
            // Reset grid with fresh rows
            setBatchRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
        },
        onError: (err) => {
            console.error(err);
            toast.error(parseValidationError(err, "Could not save batch surveys."));
        }
    });

    const handleRowChange = (index, field, value) => {
        setBatchRows(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleAddRow = () => {
        setBatchRows(prev => [...prev, createEmptyRow()]);
    };

    const handleRemoveRow = (index) => {
        if (batchRows.length <= 1) {
            setBatchRows([createEmptyRow()]);
            return;
        }
        setBatchRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleClearRows = () => {
        setBatchRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
    };

    const validBatchRows = batchRows.filter((row) => {
        const hasFarmer = (row.farmer_name || "").trim().length > 0;
        const totalPigs = getRowTotal(row);
        return hasFarmer && totalPigs > 0;
    });

    const batchTotalPigs = validBatchRows.reduce((acc, row) => acc + getRowTotal(row), 0);

    const handleBatchSubmit = (e) => {
        if (e) e.preventDefault();
        if (!batchDate) {
            toast.error("Please select a survey collection date for this batch.");
            return;
        }

        // Find rows that have partial or complete data entered
        const touchedRows = batchRows.map((row, idx) => {
            const hasName = (row.farmer_name || "").trim().length > 0;
            const hasContact = (row.contact_number || "").trim().length > 0;
            const total = getRowTotal(row);
            const isTouched = hasName || hasContact || total > 0;
            return { row, idx, hasName, hasContact, total, isTouched };
        }).filter(r => r.isTouched);

        if (touchedRows.length === 0) {
            toast.error("Cannot save empty survey data. Please enter at least one farmer record.");
            const el = document.getElementById("farmer_name_0");
            if (el) el.focus();
            return;
        }

        // Validate each touched row
        for (const item of touchedRows) {
            const rowNumber = item.idx + 1;
            if (!item.hasName) {
                toast.error(`Row ${rowNumber}: Farmer / Owner name is required.`);
                const el = document.getElementById(`farmer_name_${item.idx}`);
                if (el) el.focus();
                return;
            }

            if (item.total <= 0) {
                toast.error(`Row ${rowNumber} (${item.row.farmer_name.trim()}): Please enter at least 1 pig count.`);
                const el = document.getElementById(`inahin_${item.idx}`);
                if (el) el.focus();
                return;
            }
        }

        const surveys = touchedRows.map(({ row }) => ({
            barangay: user.barangay,
            survey_date: batchDate,
            farmer_name: row.farmer_name.trim(),
            contact_number: (row.contact_number || "").trim(),
            inahin: parseInt(row.inahin, 10) || 0,
            barako: parseInt(row.barako, 10) || 0,
            fattener: parseInt(row.fattener, 10) || 0,
            grower: parseInt(row.grower, 10) || 0,
            starter: parseInt(row.starter, 10) || 0,
            bulaw: parseInt(row.bulaw, 10) || 0,
        }));

        batchMutation.mutate({ surveys });
    };

    const handleLastCellKeyDown = (e, index) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleBatchSubmit();
            return;
        }

        if (e.key === 'Tab' && !e.shiftKey) {
            if (index === batchRows.length - 1) {
                e.preventDefault();
                handleAddRow();
                setTimeout(() => {
                    const nextInput = document.getElementById(`farmer_name_${index + 1}`);
                    if (nextInput) nextInput.focus();
                }, 50);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (index === batchRows.length - 1) {
                handleAddRow();
                setTimeout(() => {
                    const nextInput = document.getElementById(`farmer_name_${index + 1}`);
                    if (nextInput) nextInput.focus();
                }, 50);
            } else {
                const nextInput = document.getElementById(`farmer_name_${index + 1}`);
                if (nextInput) nextInput.focus();
            }
        }
    };

    // Mutation: Update survey
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const total_pigs = pigCategories.reduce(
                (acc, cat) => acc + parseInt(data[cat] || 0, 10),
                0
            );

            const farmerName = (data.farmer_name || "").trim();
            if (!farmerName) {
                throw new Error("Farmer / Hog Owner name is required.");
            }
            if (total_pigs <= 0) {
                throw new Error("Please enter at least 1 pig across all categories.");
            }

            const payload = {
                ...data,
                farmer_name: farmerName,
                barangay: user.barangay,
                total_pigs
            };
            const res = await api.patch(`/hog-survey/${id}/`, payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Hog survey entry updated.");
            queryClient.invalidateQueries({ queryKey: ['barangay-hog-surveys'] });
            queryClient.invalidateQueries({ queryKey: ['barangay-density-data'] });
            queryClient.invalidateQueries({ queryKey: ['barangay-surveys-recent'] });
            setEditingSurvey(null);
        },
        onError: (err) => {
            console.error(err);
            toast.error(parseValidationError(err, "Could not update survey."));
        }
    });

    // Mutation: Delete survey
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await api.delete(`/hog-survey/${id}/`);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Survey entry successfully deleted.");
            queryClient.invalidateQueries({ queryKey: ['barangay-hog-surveys'] });
            queryClient.invalidateQueries({ queryKey: ['barangay-density-data'] });
            queryClient.invalidateQueries({ queryKey: ['barangay-surveys-recent'] });
            setConfirmDeleteSurvey(null);
        },
        onError: (err) => {
            console.error(err);
            toast.error(parseValidationError(err, "Could not delete survey."));
        }
    });

    // Mutation: Upload CSV
    const csvMutation = useMutation({
        mutationFn: async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/hog-survey/upload_csv/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "CSV File successfully imported.");
            if (data.errors && data.errors.length > 0) {
                setCsvErrors(data.errors);
            } else {
                setCsvFile(null);
                setCsvErrors([]);
                setIsCsvModalOpen(false);
            }
            queryClient.invalidateQueries({ queryKey: ['barangay-hog-surveys'] });
            queryClient.invalidateQueries({ queryKey: ['barangay-density-data'] });
            queryClient.invalidateQueries({ queryKey: ['barangay-surveys-recent'] });
        },
        onError: (err) => {
            console.error(err);
            const detail = parseValidationError(err, "Could not upload CSV survey file.");
            toast.error(detail);
        }
    });

    const executeDelete = async () => {
        if (!confirmDeleteSurvey) return;
        try {
            await deleteMutation.mutateAsync(confirmDeleteSurvey.id);
        } catch (error) {}
    };

    const handleCsvUploadSubmit = (e) => {
        e.preventDefault();
        if (!csvFile) {
            toast.error("Please select a CSV file first");
            return;
        }
        setCsvErrors([]);
        csvMutation.mutate(csvFile);
    };

    const handleDownloadTemplate = () => {
        const headers = "barangay,survey_date,farmer_name,contact_number,inahin,barako,fattener,grower,starter,bulaw,total_pigs\n";
        const sampleRow = `${user.barangay_name},${new Date().toISOString().split('T')[0]},Juan Dela Cruz,09123456789,10,2,25,15,30,8,90\n`;
        const blob = new Blob([headers + sampleRow], { type: 'text/csv' });
        downloadBlob(blob, `${user.barangay_name.replace(/\s+/g, '_')}_hog_survey_template.csv`);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Loading surveys...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-8">
                <div className="bg-red-50 text-red-600 border border-red-100 p-8 text-center font-black uppercase tracking-widest text-xs">
                    Failed to load survey records. Please refresh the page.
                </div>
            </div>
        );
    }

    const surveys = data?.results || [];
    const count = data?.count || 0;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-white min-h-screen font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-stone-100 pb-8 gap-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{user?.barangay_name} Records</p>
                    <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter leading-none">Hog Surveys</h1>
                    <p className="text-sm text-stone-500 font-medium">Record and update swine inventory surveys for your assigned barangay</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setIsCsvModalOpen(true)}
                        className="flex-1 sm:flex-initial bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 px-4 py-2.5 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2"
                    >
                        <UploadCloud size={14} /> Upload CSV
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowEncoder(prev => !prev)}
                        className={`flex-1 sm:flex-initial px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2 ${
                            showEncoder 
                                ? 'bg-white border border-stone-300 hover:bg-stone-50 text-stone-700' 
                                : 'bg-green-700 hover:bg-green-600 text-white'
                        }`}
                    >
                        {showEncoder ? (
                            <>
                                <X size={14} /> Close Form
                            </>
                        ) : (
                            <>
                                <Plus size={14} /> Add Survey
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Batch Survey Entry Form */}
            {showEncoder && (
                <div className="border border-stone-200 bg-white rounded-none">
                    {/* Panel Header */}
                    <div className="p-4 sm:p-5 border-b border-stone-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <h2 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-2">
                                <Table size={15} className="text-green-700" /> Batch Survey Entry
                            </h2>
                            <p className="text-xs text-stone-500">
                                Enter multiple hog owners row-by-row. Press <kbd className="bg-stone-100 px-1 py-0.5 text-stone-600 font-mono text-[10px] border border-stone-200">Tab</kbd> on the last cell to add a new row automatically.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 whitespace-nowrap">Survey Date:</label>
                                <input
                                    type="date"
                                    value={batchDate}
                                    onChange={(e) => setBatchDate(e.target.value)}
                                    className="bg-transparent text-stone-800 font-mono text-xs font-bold focus:outline-none cursor-pointer"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowEncoder(false)}
                                className="text-stone-400 hover:text-stone-600 p-1.5 transition-colors"
                                title="Close batch form"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Seamless Spreadsheet Grid */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-500">
                                <tr>
                                    <th className="px-3 py-2.5 text-center w-10 border-r border-stone-200">#</th>
                                    <th className="px-3 py-2.5 w-64 border-r border-stone-200">Farmer / Owner Name</th>
                                    <th className="px-3 py-2.5 w-44 border-r border-stone-200">Cellphone No.</th>
                                    <th className="px-2 py-2.5 text-center w-20 border-r border-stone-200">Inahin</th>
                                    <th className="px-2 py-2.5 text-center w-20 border-r border-stone-200">Barako</th>
                                    <th className="px-2 py-2.5 text-center w-20 border-r border-stone-200">Fattener</th>
                                    <th className="px-2 py-2.5 text-center w-20 border-r border-stone-200">Grower</th>
                                    <th className="px-2 py-2.5 text-center w-20 border-r border-stone-200">Starter</th>
                                    <th className="px-2 py-2.5 text-center w-20 border-r border-stone-200">Bulaw</th>
                                    <th className="px-3 py-2.5 text-center w-24 border-r border-stone-200 text-stone-700">Total</th>
                                    <th className="px-2 py-2.5 text-center w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200 text-xs">
                                {batchRows.map((row, idx) => {
                                    const rowTotal = getRowTotal(row);
                                    const isRowFilled = (row.farmer_name && row.farmer_name.trim()) || rowTotal > 0;
                                    return (
                                        <tr key={row.id} className={isRowFilled ? "bg-green-50/20 hover:bg-stone-50/80 transition-colors" : "hover:bg-stone-50/80 transition-colors"}>
                                            <td className="px-3 py-2 text-center font-mono text-stone-400 text-xs font-bold border-r border-stone-200 bg-stone-50/40">
                                                {idx + 1}
                                            </td>
                                            <td className="p-0 border-r border-stone-200">
                                                <input
                                                    id={`farmer_name_${idx}`}
                                                    type="text"
                                                    placeholder="Juan Dela Cruz"
                                                    value={row.farmer_name}
                                                    onChange={(e) => handleRowChange(idx, 'farmer_name', e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleBatchSubmit();
                                                        }
                                                    }}
                                                    className="w-full h-10 px-3 py-2 bg-transparent text-xs text-stone-800 font-medium placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-green-700 rounded-none transition-colors"
                                                />
                                            </td>
                                            <td className="p-0 border-r border-stone-200">
                                                <input
                                                    id={`contact_number_${idx}`}
                                                    type="text"
                                                    placeholder="09123456789"
                                                    value={row.contact_number}
                                                    onChange={(e) => handleRowChange(idx, 'contact_number', e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleBatchSubmit();
                                                        }
                                                    }}
                                                    className="w-full h-10 px-3 py-2 bg-transparent text-xs font-mono text-stone-800 placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-green-700 rounded-none transition-colors"
                                                />
                                            </td>
                                            {['inahin', 'barako', 'fattener', 'grower', 'starter'].map((cat) => (
                                                <td key={cat} className="p-0 border-r border-stone-200">
                                                    <input
                                                        id={`${cat}_${idx}`}
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={row[cat]}
                                                        onChange={(e) => handleRowChange(idx, cat, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleBatchSubmit();
                                                            }
                                                        }}
                                                        className="w-full h-10 px-2 py-2 text-center bg-transparent text-xs font-semibold placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-green-700 rounded-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </td>
                                            ))}
                                            <td className="p-0 border-r border-stone-200">
                                                <input
                                                    id={`bulaw_${idx}`}
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={row.bulaw}
                                                    onChange={(e) => handleRowChange(idx, 'bulaw', e.target.value)}
                                                    onKeyDown={(e) => handleLastCellKeyDown(e, idx)}
                                                    className="w-full h-10 px-2 py-2 text-center bg-transparent text-xs font-semibold placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-green-700 rounded-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center border-r border-stone-200 bg-stone-50/40">
                                                <span className={`inline-block font-mono text-xs font-bold ${rowTotal > 0 ? 'text-green-700 bg-green-50 px-2 py-0.5 border border-green-200' : 'text-stone-300'}`}>
                                                    {rowTotal}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <button
                                                    type="button"
                                                    title="Remove row"
                                                    onClick={() => handleRemoveRow(idx)}
                                                    className="text-stone-300 hover:text-red-600 transition-colors p-1"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-stone-50 border-t border-stone-200 px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={handleAddRow}
                                className="bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 px-3 py-2 text-xs font-semibold rounded-none transition-colors flex items-center gap-1.5"
                            >
                                <Plus size={13} /> Add Row
                            </button>
                            <button
                                type="button"
                                onClick={handleClearRows}
                                className="text-stone-400 hover:text-stone-600 text-xs font-semibold px-2.5 py-2 transition-colors flex items-center gap-1"
                            >
                                <RotateCcw size={12} /> Clear
                            </button>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                            <p className="text-xs text-stone-500 font-medium">
                                <span className="font-bold text-stone-800">{validBatchRows.length}</span> {validBatchRows.length === 1 ? 'record' : 'records'} ready ({batchTotalPigs} total pigs)
                            </p>

                            <button
                                type="button"
                                onClick={handleBatchSubmit}
                                disabled={batchMutation.isPending || validBatchRows.length === 0}
                                className="bg-green-700 hover:bg-green-600 disabled:bg-stone-200 disabled:text-stone-400 text-white px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
                            >
                                {batchMutation.isPending ? (
                                    <>
                                        <span className="loading loading-spinner loading-xs"></span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check size={14} /> Save Surveys {validBatchRows.length > 0 ? `(${validBatchRows.length})` : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Surveys Table */}
            <div className="border border-stone-200 bg-white">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[1050px]">
                        <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-500">
                            <tr>
                                <th className="px-6 py-5">Survey Date</th>
                                <th className="px-6 py-5">Farmer / Owner</th>
                                <th className="px-6 py-5">Contact No.</th>
                                <th className="px-6 py-5 text-center">Inahin (Sow)</th>
                                <th className="px-6 py-5 text-center">Barako (Boar)</th>
                                <th className="px-6 py-5 text-center">Fattener</th>
                                <th className="px-6 py-5 text-center">Grower</th>
                                <th className="px-6 py-5 text-center">Starter</th>
                                <th className="px-6 py-5 text-center">Bulaw</th>
                                <th className="px-6 py-5 text-center font-bold text-stone-800">Total Pigs</th>
                                <th className="px-6 py-5 text-right pr-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-xs font-semibold text-stone-700">
                            {surveys.length === 0 ? (
                                <tr>
                                    <td colSpan="11">
                                        <div className="flex flex-col items-center justify-center py-24 bg-stone-50/30">
                                            <Activity size={48} className="text-stone-200 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">No hog surveys found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                surveys.map((survey) => (
                                    <tr key={survey.id} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-6 py-5 font-mono font-bold flex items-center gap-2 whitespace-nowrap">
                                            <Calendar size={14} className="text-stone-400 shrink-0" />
                                            {survey.survey_date}
                                        </td>
                                        <td className="px-6 py-5 font-bold text-stone-800">
                                            {survey.farmer_name ? (
                                                <span className="flex items-center gap-1.5">
                                                    <User size={13} className="text-stone-400 shrink-0" />
                                                    {survey.farmer_name}
                                                </span>
                                            ) : (
                                                <span className="text-stone-300 font-normal italic">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 font-mono text-stone-600 whitespace-nowrap">
                                            {survey.contact_number ? (
                                                <span className="flex items-center gap-1.5">
                                                    <Phone size={13} className="text-stone-400 shrink-0" />
                                                    {survey.contact_number}
                                                </span>
                                            ) : (
                                                <span className="text-stone-300 font-normal italic">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center">{survey.inahin}</td>
                                        <td className="px-6 py-5 text-center">{survey.barako}</td>
                                        <td className="px-6 py-5 text-center">{survey.fattener}</td>
                                        <td className="px-6 py-5 text-center">{survey.grower}</td>
                                        <td className="px-6 py-5 text-center">{survey.starter}</td>
                                        <td className="px-6 py-5 text-center">{survey.bulaw}</td>
                                        <td className="px-6 py-5 text-center font-black text-green-700 bg-green-50/30">{survey.total_pigs}</td>
                                        <td className="px-6 py-5 text-right pr-8 whitespace-nowrap">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button
                                                    onClick={() => setEditingSurvey(survey)}
                                                    className="bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                                >
                                                    <Edit size={12} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteSurvey(survey)}
                                                    className="bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                                >
                                                    <Trash2 size={12} /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {count > limit && (
                    <Pagination 
                        count={count} 
                        limit={limit} 
                        offset={offset} 
                        onPageChange={setOffset} 
                    />
                )}
            </div>

            {/* Edit Survey Modal */}
            {editingSurvey && (
                <SurveyFormModal 
                    survey={editingSurvey}
                    onClose={() => setEditingSurvey(null)}
                    onSubmit={(data) => updateMutation.mutate({ id: editingSurvey.id, data })}
                    isSubmitting={updateMutation.isPending}
                />
            )}

            {/* CSV Import Modal */}
            {isCsvModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg border border-stone-200 shadow-2xl rounded-none overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50">
                            <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest">
                                Upload Survey CSV
                            </h3>
                            <button onClick={() => setIsCsvModalOpen(false)} className="text-stone-400 hover:text-stone-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCsvUploadSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="bg-stone-50 border border-stone-200 p-4 space-y-2 text-stone-600 text-xs">
                                <p className="font-bold flex items-center gap-1.5"><Info size={14} className="text-green-700" /> CSV Upload Guidelines:</p>
                                <ul className="list-disc pl-4 space-y-1 font-medium text-stone-500">
                                    <li>CSV must contain a header row.</li>
                                    <li>Required columns: <code className="font-mono bg-stone-100 px-1">barangay, survey_date, inahin, barako, fattener, grower, starter, bulaw, total_pigs</code></li>
                                    <li>Optional columns: <code className="font-mono bg-stone-100 px-1">farmer_name, contact_number</code></li>
                                    <li>Format: Date must be in <code className="font-mono bg-stone-100 px-1">YYYY-MM-DD</code> format.</li>
                                    <li>For safety, you can only import records containing barangay name exactly matching: <span className="font-black text-green-700 uppercase">"{user.barangay_name}"</span></li>
                                </ul>
                                <button 
                                    type="button" 
                                    onClick={handleDownloadTemplate} 
                                    className="text-[10px] font-black uppercase text-green-700 hover:underline tracking-widest mt-2 block"
                                >
                                    Download CSV Template File
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Select CSV File</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setCsvFile(e.target.files[0])}
                                    className="w-full text-xs font-semibold border border-stone-200 p-3"
                                />
                            </div>

                            {csvErrors.length > 0 && (
                                <div className="bg-red-50 border border-red-200/50 p-4 max-h-[150px] overflow-y-auto space-y-1">
                                    <p className="text-[10px] font-black text-red-700 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12} /> Import Errors:</p>
                                    {csvErrors.map((err, i) => (
                                        <p key={i} className="text-[10px] text-red-600 font-mono">{err}</p>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-4 justify-end pt-4 border-t border-stone-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCsvFile(null);
                                        setCsvErrors([]);
                                        setIsCsvModalOpen(false);
                                    }}
                                    disabled={csvMutation.isPending}
                                    className="px-6 py-3 border border-stone-200 text-[10px] font-black uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={csvMutation.isPending || !csvFile}
                                    className="bg-green-700 hover:bg-green-600 disabled:bg-stone-100 text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {csvMutation.isPending ? (
                                        <>
                                            <span className="loading loading-spinner loading-xs"></span>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud size={14} /> Import CSV
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!confirmDeleteSurvey}
                onClose={() => setConfirmDeleteSurvey(null)}
                onYes={executeDelete}
                title="Delete Survey Record?"
                message={confirmDeleteSurvey ? `Are you sure you want to permanently delete the hog survey from date ${confirmDeleteSurvey.survey_date}? This action cannot be undone.` : ""}
                yesText="Permanently Delete"
                yesVariant="danger"
                type="danger"
                isSubmitting={deleteMutation.isPending}
            />
        </div>
    );
};

/**
 * Reusable Survey Form Modal for Manual Submissions & Edits
 */
const SurveyFormModal = ({ survey, onClose, onSubmit, isSubmitting }) => {
    const isEdit = !!survey;
    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            farmer_name: survey?.farmer_name || '',
            contact_number: survey?.contact_number || '',
            survey_date: survey?.survey_date || new Date().toISOString().split('T')[0],
            inahin: survey?.inahin || 0,
            barako: survey?.barako || 0,
            fattener: survey?.fattener || 0,
            grower: survey?.grower || 0,
            starter: survey?.starter || 0,
            bulaw: survey?.bulaw || 0,
        }
    });

    const validateSurveyData = (data) => {
        const name = (data.farmer_name || '').trim();
        if (!name) {
            toast.error("Farmer / Owner name is required.");
            const el = document.getElementById('modal_farmer_name');
            if (el) el.focus();
            return false;
        }

        const total = (
            (parseInt(data.inahin, 10) || 0) +
            (parseInt(data.barako, 10) || 0) +
            (parseInt(data.fattener, 10) || 0) +
            (parseInt(data.grower, 10) || 0) +
            (parseInt(data.starter, 10) || 0) +
            (parseInt(data.bulaw, 10) || 0)
        );

        if (total <= 0) {
            toast.error("Please enter at least 1 pig count across the categories.");
            return false;
        }

        return true;
    };

    const handleFormSubmit = (data) => {
        if (!validateSurveyData(data)) return;
        onSubmit(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-xl border border-stone-200 shadow-2xl rounded-none overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <Activity size={18} className="text-stone-700" />
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest">
                            Edit Hog Survey Record
                        </h3>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Farmer / Pig Owner Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                                Farmer / Pig Owner Name <span className="text-red-600">*</span>
                            </label>
                            <div className="relative">
                                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    id="modal_farmer_name"
                                    type="text"
                                    placeholder="e.g. Juan Dela Cruz"
                                    {...register('farmer_name', {
                                        required: "Farmer / Owner name is required.",
                                        validate: (val) => (val && val.trim().length > 0) || "Farmer name cannot be blank."
                                    })}
                                    disabled={isSubmitting}
                                    className="w-full pl-9 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:font-normal placeholder:text-stone-400"
                                />
                            </div>
                            {errors.farmer_name && (
                                <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.farmer_name.message}</p>
                            )}
                        </div>

                        {/* Cellphone / Contact Number */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                                Cellphone / Contact Number
                            </label>
                            <div className="relative">
                                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    type="text"
                                    placeholder="e.g. 09123456789"
                                    {...register('contact_number')}
                                    disabled={isSubmitting}
                                    className="w-full pl-9 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:font-normal placeholder:text-stone-400"
                                />
                            </div>
                        </div>

                        {/* Survey Date */}
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Survey Collection Date</label>
                            <input
                                type="date"
                                {...register('survey_date', { required: "Survey collection date is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                            {errors.survey_date && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.survey_date.message}</p>}
                        </div>

                        {/* Inahin */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Inahin (Sow Count)</label>
                            <input
                                type="number"
                                min="0"
                                {...register('inahin', { required: "Inahin is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>

                        {/* Barako */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Barako (Boar Count)</label>
                            <input
                                type="number"
                                min="0"
                                {...register('barako', { required: "Barako is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>

                        {/* Fattener */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Fattener Count</label>
                            <input
                                type="number"
                                min="0"
                                {...register('fattener', { required: "Fattener is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>

                        {/* Grower */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Grower Count</label>
                            <input
                                type="number"
                                min="0"
                                {...register('grower', { required: "Grower is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>

                        {/* Starter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Starter Count</label>
                            <input
                                type="number"
                                min="0"
                                {...register('starter', { required: "Starter is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>

                        {/* Bulaw */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Bulaw Count</label>
                            <input
                                type="number"
                                min="0"
                                {...register('bulaw', { required: "Bulaw is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end pt-6 border-t border-stone-100 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold rounded-none transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-green-700 hover:bg-green-600 disabled:bg-stone-100 text-white px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check size={14} /> Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HogSurveyPage;
