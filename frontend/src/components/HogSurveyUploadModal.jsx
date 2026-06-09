import React, { useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { useUploadHogSurvey } from '../hooks/useMaps';

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
            alert('Please select a valid CSV file.');
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

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md border border-stone-200 shadow-2xl rounded-none overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50">
                    <div className="flex items-center gap-3">
                        <Upload size={18} className="text-green-600" />
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
                                <p className="text-sm font-medium text-stone-600">
                                    Select a CSV file containing historical hog population data.
                                </p>
                                
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
                                <div className="bg-red-50 border border-red-100 p-4 flex items-start gap-3">
                                    <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Upload Failed</p>
                                        <p className="text-xs font-medium text-red-600">
                                            {error?.response?.data?.error || 'Something went wrong. Please check your CSV format.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || isPending}
                                    className={`w-full py-3 text-xs font-black uppercase tracking-widest rounded-none transition-all flex items-center justify-center gap-2
                                        ${!file || isPending 
                                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                                            : 'bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-700/10'
                                        }
                                    `}
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        'Start Upload'
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
                                className="w-full mt-6 py-3 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 text-[10px] font-black uppercase tracking-widest rounded-none"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                {!isSuccess && (
                    <div className="px-6 py-4 bg-stone-50 border-t border-stone-100">
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
