import React, { useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, FileText, Loader2, Download } from 'lucide-react';
import { useUploadHogSurvey } from '../hooks/useMaps';
import { downloadBlob } from '../lib/utils';
import { toast } from 'sonner';

/**
 * Modal for uploading hog survey CSV files.
 * Props:
 *   isOpen — boolean to control modal visibility
 *   onClose — function to close the modal
 */
const HogSurveyUploadModal = ({ isOpen, onClose }) => {
    const [file, setFile] = useState(null);
    const { mutate: upload, isPending, isSuccess, isError, error, data, reset } = useUploadHogSurvey();

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile);
        } else {
            toast.error('Please select a valid CSV file.');
        }
    };

    const handleUpload = () => {
        if (file) {
            upload(file);
        }
    };

    const handleClose = () => {
        setFile(null);
        reset();
        onClose();
    };

    const handleDownloadTemplate = () => {
        const headers = "barangay,survey_date,farmer_name,contact_number,inahin,barako,fattener,grower,starter,bulaw,total_pigs\n";
        const sampleRow = `Balubal,${new Date().toISOString().split('T')[0]},Juan Dela Cruz,09123456789,10,2,25,15,30,8,90\n`;
        const blob = new Blob([headers + sampleRow], { type: 'text/csv' });
        downloadBlob(blob, 'sariaya_hog_survey_template.csv');
    };

    const errorDetails = error?.response?.data?.errors || [];
    const mainErrorMessage = error?.response?.data?.error || error?.response?.data?.message || 'Something went wrong. Please check your CSV format.';

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-stone-900/50">
            <div className="bg-white w-full max-w-md border border-stone-200 rounded-xl overflow-hidden shadow-xl">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-200 bg-stone-50/50">
                    <div className="flex items-center gap-3">
                        <Upload size={18} className="text-green-700" />
                        <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest">Upload Hog Survey</h3>
                    </div>
                    <button onClick={handleClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    {!isSuccess ? (
                        <>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-stone-600">
                                        Select a CSV file containing hog survey records.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleDownloadTemplate}
                                        className="text-[10px] font-black uppercase text-green-700 hover:underline tracking-widest flex items-center gap-1 cursor-pointer shrink-0"
                                    >
                                        <Download size={11} /> Template
                                    </button>
                                </div>
                                
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="csv-upload"
                                        disabled={isPending}
                                    />
                                    <label
                                        htmlFor="csv-upload"
                                        className={`flex flex-col items-center justify-center border-2 border-dashed p-8 cursor-pointer transition-all
                                            ${file ? 'border-green-500 bg-green-50' : 'border-stone-200 hover:border-stone-300 bg-stone-50'}
                                            ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {file ? (
                                            <>
                                                <FileText size={32} className="text-green-600 mb-2" />
                                                <span className="text-xs font-black text-stone-800 uppercase tracking-wider text-center break-all">
                                                    {file.name}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={32} className="text-stone-300 mb-2" />
                                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                                    Click to select file
                                                </span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {isError && (
                                <div className="bg-red-50 border border-red-100 p-4 space-y-2">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Upload Failed</p>
                                            <p className="text-xs font-medium text-red-600">
                                                {mainErrorMessage}
                                            </p>
                                        </div>
                                    </div>
                                    {errorDetails.length > 0 && (
                                        <div className="max-h-32 overflow-y-auto pl-7 pt-1 space-y-1 border-t border-red-200/40">
                                            {errorDetails.map((err, i) => (
                                                <p key={i} className="text-[10px] text-red-600 font-mono">• {err}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || isPending}
                                    className={`w-full py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2
                                        ${!file || isPending 
                                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                                            : 'bg-green-700 hover:bg-green-600 text-white'
                                        }
                                    `}
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        'Upload Now'
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-green-50 flex items-center justify-center border border-green-100">
                                <CheckCircle2 size={32} className="text-green-600" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-lg font-black text-stone-800 uppercase tracking-tight">Upload Successful</h4>
                                <p className="text-sm font-medium text-stone-500">
                                    {data?.message || 'The data has been imported successfully.'}
                                </p>
                            </div>
                            
                            {data?.errors?.length > 0 && (
                                <div className="w-full text-left bg-amber-50 border border-amber-100 p-4 mt-4 overflow-y-auto max-h-40">
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Some rows were skipped:</p>
                                    <ul className="space-y-1">
                                        {data.errors.map((err, i) => (
                                            <li key={i} className="text-[10px] font-medium text-amber-600">• {err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={handleClose}
                                className="w-full mt-6 py-3 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-2xs"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                {!isSuccess && (
                    <div className="px-6 py-4 bg-stone-50 border-t border-stone-200">
                        <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider leading-relaxed">
                            Tip: Your CSV should have columns for barangay, survey_date, and pig counts.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HogSurveyUploadModal;
