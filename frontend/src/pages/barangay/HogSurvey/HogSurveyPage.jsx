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
    Info
} from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import ConfirmationModal from '../../../components/ui/ConfirmationModal';
import useAuthStore from '../../../store/authStore';

const parseValidationError = (err, fallback = "Action failed.") => {
    if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'object') {
            if (data.detail) return data.detail;
            const fieldErrors = Object.entries(data)
                .map(([field, errors]) => {
                    const fieldLabel = field.replace('_', ' ');
                    const errorMsg = Array.isArray(errors) ? errors[0] : errors;
                    return `${fieldLabel}: ${errorMsg}`;
                })
                .join(' | ');
            if (fieldErrors) return fieldErrors;
        } else if (typeof data === 'string') {
            return data;
        }
    }
    return err.message || fallback;
};

const HogSurveyPage = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    
    // Modal & Form state
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [editingSurvey, setEditingSurvey] = useState(null);
    const [confirmDeleteSurvey, setConfirmDeleteSurvey] = useState(null);

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

    // Mutation: Create manual survey
    const createMutation = useMutation({
        mutationFn: async (surveyData) => {
            const total_pigs = Object.values(surveyData)
                .filter((v, i) => Object.keys(surveyData)[i] !== 'survey_date')
                .reduce((acc, curr) => acc + parseInt(curr || 0), 0);

            const payload = {
                ...surveyData,
                barangay: user.barangay,
                total_pigs
            };
            const res = await api.post('/hog-survey/', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Hog survey entry created successfully.");
            queryClient.invalidateQueries({ queryKey: ['barangay-hog-surveys'] });
            queryClient.invalidateQueries({ queryKey: ['barangay-density-data'] });
            queryClient.invalidateQueries({ queryKey: ['barangay-surveys-recent'] });
            setIsFormModalOpen(false);
        },
        onError: (err) => {
            console.error(err);
            toast.error(parseValidationError(err, "Could not submit survey."));
        }
    });

    // Mutation: Update survey
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const total_pigs = Object.values(data)
                .filter((v, i) => Object.keys(data)[i] !== 'survey_date')
                .reduce((acc, curr) => acc + parseInt(curr || 0), 0);

            const payload = {
                ...data,
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
        const headers = "barangay,survey_date,inahin,barako,fattener,grower,starter,bulaw,total_pigs\n";
        const sampleRow = `${user.barangay_name},${new Date().toISOString().split('T')[0]},10,2,25,15,30,8,90\n`;
        const blob = new Blob([headers + sampleRow], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${user.barangay_name.replace(/\s+/g, '_')}_hog_survey_template.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
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
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{user?.barangay_name} Statistics</p>
                    <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter leading-none">Hog Surveys</h1>
                    <p className="text-sm text-stone-500 font-medium">Record and update swine surveys for your assigned barangay</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setIsCsvModalOpen(true)}
                        className="flex-1 sm:flex-initial bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 px-6 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2"
                    >
                        <UploadCloud size={16} /> Upload CSV
                    </button>
                    <button
                        onClick={() => setIsFormModalOpen(true)}
                        className="flex-1 sm:flex-initial bg-stone-900 hover:bg-stone-800 text-white px-6 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Add Hog Survey
                    </button>
                </div>
            </div>

            {/* Surveys Table */}
            <div className="border border-stone-200 bg-white">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-500">
                            <tr>
                                <th className="px-6 py-5">Survey Date</th>
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
                                    <td colSpan="9">
                                        <div className="flex flex-col items-center justify-center py-24 bg-stone-50/30">
                                            <Activity size={48} className="text-stone-200 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">No hog surveys found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                surveys.map((survey) => (
                                    <tr key={survey.id} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-6 py-5 font-mono font-bold flex items-center gap-2">
                                            <Calendar size={14} className="text-stone-400" />
                                            {survey.survey_date}
                                        </td>
                                        <td className="px-6 py-5 text-center">{survey.inahin}</td>
                                        <td className="px-6 py-5 text-center">{survey.barako}</td>
                                        <td className="px-6 py-5 text-center">{survey.fattener}</td>
                                        <td className="px-6 py-5 text-center">{survey.grower}</td>
                                        <td className="px-6 py-5 text-center">{survey.starter}</td>
                                        <td className="px-6 py-5 text-center">{survey.bulaw}</td>
                                        <td className="px-6 py-5 text-center font-black text-green-700 bg-green-50/30">{survey.total_pigs}</td>
                                        <td className="px-6 py-5 text-right pr-8">
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

            {/* Create Survey Modal */}
            {isFormModalOpen && (
                <SurveyFormModal 
                    onClose={() => setIsFormModalOpen(false)}
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
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            survey_date: survey?.survey_date || new Date().toISOString().split('T')[0],
            inahin: survey?.inahin || 0,
            barako: survey?.barako || 0,
            fattener: survey?.fattener || 0,
            grower: survey?.grower || 0,
            starter: survey?.starter || 0,
            bulaw: survey?.bulaw || 0,
        }
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-xl border border-stone-200 shadow-2xl rounded-none overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <Activity size={18} className="text-stone-700" />
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest">
                            {isEdit ? "Update Hog Survey Entry" : "New Hog Survey Entry"}
                        </h3>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="flex gap-4 justify-end pt-6 border-t border-stone-100 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-6 py-3 border border-stone-200 hover:bg-stone-50 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-green-700 hover:bg-green-600 disabled:bg-stone-100 text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Saving Survey...
                                </>
                            ) : (
                                <>
                                    <Check size={14} /> {isEdit ? "Save Survey" : "Submit Survey"}
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
