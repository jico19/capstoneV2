import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Plus, X, UploadCloud } from 'lucide-react';
import ConfirmationModal from '../../../components/ui/ConfirmationModal';
import useAuthStore from '../../../store/authStore';
import { parseValidationError, downloadBlob } from '../../../lib/utils';
import BatchSurveyEncoder from './BatchSurveyEncoder';
import SurveyListTable from './SurveyListTable';
import SurveyFormModal from './SurveyFormModal';
import CsvUploadModal from './CsvUploadModal';


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
    const { data, isLoading, isError } = useQuery({
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
        } catch {
            // Error surfaced via deleteMutation.onError toast.
        }
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
                <BatchSurveyEncoder
                    batchRows={batchRows}
                    batchDate={batchDate}
                    onBatchDateChange={setBatchDate}
                    onRowChange={handleRowChange}
                    onAddRow={handleAddRow}
                    onRemoveRow={handleRemoveRow}
                    onClearRows={handleClearRows}
                    onSubmit={handleBatchSubmit}
                    onLastCellKeyDown={handleLastCellKeyDown}
                    getRowTotal={getRowTotal}
                    validBatchRows={validBatchRows}
                    batchTotalPigs={batchTotalPigs}
                    isPending={batchMutation.isPending}
                    onClose={() => setShowEncoder(false)}
                />
            )}

            {/* Surveys Table */}
            <SurveyListTable
                surveys={surveys}
                count={count}
                limit={limit}
                offset={offset}
                onOffsetChange={setOffset}
                onEdit={setEditingSurvey}
                onDelete={setConfirmDeleteSurvey}
            />

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
                <CsvUploadModal
                    file={csvFile}
                    onFileChange={setCsvFile}
                    errors={csvErrors}
                    onClose={() => {
                        setCsvFile(null);
                        setCsvErrors([]);
                        setIsCsvModalOpen(false);
                    }}
                    isPending={csvMutation.isPending}
                    onSubmit={handleCsvUploadSubmit}
                    onDownloadTemplate={handleDownloadTemplate}
                    barangayName={user.barangay_name}
                />
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

export default HogSurveyPage;