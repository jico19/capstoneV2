import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Plus, UploadCloud, Users, ChevronDown, Table2 } from 'lucide-react';
import ConfirmationModal from '../../../components/ui/ConfirmationModal';
import useAuthStore from '../../../store/authStore';
import { parseValidationError, downloadBlob } from '../../../lib/utils';
import BatchSurveyEncoder from './BatchSurveyEncoder';
import SurveyListTable from './SurveyListTable';
import SurveyFormModal from './SurveyFormModal';
import CsvUploadModal from './CsvUploadModal';
import DataTable from '../../../components/ui/DataTable';
import { useBatchSurvey, invalidateSurveyQueries, PIG_CATEGORIES } from './useBatchSurvey';


const HogSurveyPage = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);

    // Filter state for the survey list
    const [filterFarmer, setFilterFarmer]     = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo]     = useState('');

    // Farmer roster panel state
    const [rosterOpen, setRosterOpen] = useState(false);
    
    // Modal & Form state
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingSurvey, setEditingSurvey] = useState(null);
    const [confirmDeleteSurvey, setConfirmDeleteSurvey] = useState(null);

    // Rapid Multi-Row Batch Encoder state
    const [showEncoder, setShowEncoder] = useState(false);
    const {
        batchDate,
        setBatchDate,
        batchRows,
        handleRowChange,
        handleAddRow,
        handleRemoveRow,
        handleClearRows,
    } = useBatchSurvey();

    // CSV upload state
    const [csvFile, setCsvFile] = useState(null);
    const [csvErrors, setCsvErrors] = useState([]);

    // Query for all hog surveys in their assigned barangay
    const { data, isLoading, isError } = useQuery({
        queryKey: ['barangay-hog-surveys', limit, offset, filterFarmer, filterDateFrom, filterDateTo],
        queryFn: async () => {
            const res = await api.get('/hog-survey/', {
                params: {
                    limit, offset,
                    ...(filterFarmer   && { farmer_name: filterFarmer }),
                    ...(filterDateFrom && { date_from: filterDateFrom }),
                    ...(filterDateTo   && { date_to: filterDateTo }),
                }
            });
            return res.data;
        }
    });

    // Query for the distinct farmer roster
    const { data: roster = [] } = useQuery({
        queryKey: ['farmer-roster'],
        queryFn: async () => (await api.get('/hog-survey/farmer_roster/')).data,
        staleTime: 60_000,
    });

    const activeCount   = roster.filter(f => f.is_active).length;
    const inactiveCount = roster.filter(f => !f.is_active).length;

    // Mutation: Batch Create rapid multi-row surveys
    const batchMutation = useMutation({
        mutationFn: async ({ surveys }) => {
            const res = await api.post('/hog-survey/batch_create/', { surveys });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data?.message || "Batch surveys saved successfully!");
            invalidateSurveyQueries(queryClient);
            // Reset grid with fresh rows
            handleClearRows();
        },
        onError: (err) => {
            console.error(err);
            toast.error(parseValidationError(err, "Could not save batch surveys."));
        }
    });

    // Mutation: Create a single survey record
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/hog-survey/', { ...data, barangay: user.barangay });
            return res.data;
        },
        onSuccess: () => {
            toast.success("Hog survey record added.");
            invalidateSurveyQueries(queryClient);
            setIsCreateModalOpen(false);
        },
        onError: (err) => {
            console.error(err);
            toast.error(parseValidationError(err, "Could not add survey record."));
        }
    });

    // Mutation: Update survey
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const total_pigs = PIG_CATEGORIES.reduce(
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
            invalidateSurveyQueries(queryClient);
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
            invalidateSurveyQueries(queryClient);
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
            invalidateSurveyQueries(queryClient);
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

    const rosterColumns = [
        {
            header: 'Farmer Name',
            accessor: 'farmer_name',
            className: 'font-bold text-stone-800',
        },
        {
            header: 'Contact',
            accessor: 'contact_number',
            render: (f) => <span className="font-mono text-stone-500">{f.contact_number || '—'}</span>,
        },
        {
            header: 'Last Survey',
            accessor: 'last_survey_date',
            render: (f) => <span className="font-mono text-stone-600">{f.last_survey_date || '—'}</span>,
        },
        {
            header: 'Records',
            accessor: 'survey_count',
            align: 'center',
            render: (f) => <span className="font-mono font-bold">{f.survey_count}</span>,
        },
        {
            header: 'Status',
            accessor: 'is_active',
            render: (f) => (
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                    f.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'
                }`}>
                    {f.is_active ? 'Active' : 'Inactive'}
                </span>
            ),
        },
    ];

    const renderMobileRoster = (items) => (
        <div className="divide-y divide-stone-100 p-2">
            {items.map((f, i) => (
                <div
                    key={f.farmer_name || i}
                    onClick={() => { setFilterFarmer(f.farmer_name); setOffset(0); }}
                    className="p-3 bg-white hover:bg-green-50/50 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                    <div className="space-y-0.5 min-w-0">
                        <span className="text-xs font-bold text-stone-900 block truncate">{f.farmer_name}</span>
                        <span className="text-[11px] font-mono text-stone-500 block">{f.contact_number || 'No contact'}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                            f.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'
                        }`}>
                            {f.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">{f.survey_count} surveys</span>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 bg-stone-50 min-h-screen font-sans">
            {/* Header & Quick Actions */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200 inline-block">
                        Brgy. {user?.barangay_name} Portal
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-stone-900 uppercase tracking-tight">
                        Hog Surveys
                    </h1>
                    <p className="text-xs text-stone-500 font-medium">
                        Swine population monitoring & household census for African Swine Fever prevention
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={() => setIsCsvModalOpen(true)}
                        className="h-11 px-4 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-wider rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
                    >
                        <UploadCloud size={15} /> Upload CSV
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowEncoder(prev => !prev)}
                        className={`h-11 px-4 text-xs font-bold uppercase tracking-wider rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial border ${
                            showEncoder
                                ? 'bg-stone-900 text-white border-stone-900'
                                : 'bg-white border-stone-300 hover:bg-stone-50 text-stone-700'
                        }`}
                    >
                        <Table2 size={15} /> {showEncoder ? 'Hide Batch Form' : 'Batch Entry'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-11 px-5 bg-green-700 hover:bg-green-600 active:scale-[0.98] text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        <Plus size={16} /> Add Survey
                    </button>
                </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-stone-200 rounded-xl p-3 sm:p-4 shadow-xs">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-0.5">
                        Total Surveys
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-stone-900 font-mono">
                        {count}
                    </span>
                </div>
                <div className="bg-white border border-stone-200 rounded-xl p-3 sm:p-4 shadow-xs">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-0.5">
                        Active Farmers
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-green-700 font-mono">
                        {activeCount}
                    </span>
                </div>
                <div className="bg-white border border-stone-200 rounded-xl p-3 sm:p-4 shadow-xs">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-0.5">
                        Due for Survey
                    </span>
                    <span className="text-lg sm:text-2xl font-black text-amber-700 font-mono">
                        {inactiveCount}
                    </span>
                </div>
            </div>

            {/* Batch Survey Entry Form */}
            {showEncoder && (
                <BatchSurveyEncoder
                    batchRows={batchRows}
                    batchDate={batchDate}
                    barangayId={user.barangay}
                    onBatchDateChange={setBatchDate}
                    onRowChange={handleRowChange}
                    onAddRow={handleAddRow}
                    onRemoveRow={handleRemoveRow}
                    onClearRows={handleClearRows}
                    onSubmit={(surveys) => batchMutation.mutate({ surveys })}
                    isPending={batchMutation.isPending}
                    onClose={() => setShowEncoder(false)}
                />
            )}

            {/* Farmer Roster Panel */}
            <div className="border border-stone-200 bg-white rounded-xl shadow-xs overflow-hidden">
                {/* Summary bar — always visible */}
                <button
                    onClick={() => setRosterOpen(p => !p)}
                    className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 hover:bg-stone-50 transition-colors"
                >
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Users size={16} className="text-stone-400 shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider text-stone-800">
                            Registered Farmer Roster
                        </span>
                        <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-md">
                            {activeCount} Active
                        </span>
                        <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">
                            {inactiveCount} Inactive
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-stone-400 hidden sm:inline">
                            {rosterOpen ? 'Collapse Roster' : 'View Farmer List'}
                        </span>
                        <ChevronDown size={16} className={`text-stone-400 transition-transform ${rosterOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {/* Expanded roster table / mobile cards */}
                {rosterOpen && (
                    <div className="border-t border-stone-100">
                        <DataTable
                            columns={rosterColumns}
                            data={roster}
                            keyField={(f, i) => f.farmer_name || i}
                            onRowClick={(f) => { setFilterFarmer(f.farmer_name); setOffset(0); }}
                            minWidth="700px"
                            className="border-0"
                            emptyState={{
                                icon: Users,
                                title: 'No registered farmers',
                                description: 'No farmer survey records available for this barangay.',
                            }}
                            mobileRenderer={renderMobileRoster}
                        />
                    </div>
                )}
            </div>

            {/* Surveys Table */}
            <SurveyListTable
                surveys={surveys}
                count={count}
                limit={limit}
                offset={offset}
                onOffsetChange={setOffset}
                onEdit={setEditingSurvey}
                onDelete={setConfirmDeleteSurvey}
                filterFarmer={filterFarmer}
                filterDateFrom={filterDateFrom}
                filterDateTo={filterDateTo}
                onFilterChange={(field, value) => {
                    if (field === 'farmer_name') setFilterFarmer(value);
                    if (field === 'date_from')   setFilterDateFrom(value);
                    if (field === 'date_to')     setFilterDateTo(value);
                    setOffset(0);
                }}
                onClearFilters={() => {
                    setFilterFarmer('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setOffset(0);
                }}
                onFilterByFarmer={(name) => {
                    setFilterFarmer(name);
                    setOffset(0);
                }}
            />

            {/* Add Survey Modal */}
            {isCreateModalOpen && (
                <SurveyFormModal
                    survey={null}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isSubmitting={createMutation.isPending}
                />
            )}

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