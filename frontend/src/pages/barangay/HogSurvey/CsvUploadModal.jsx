import { X, Info, AlertCircle, UploadCloud } from 'lucide-react';

/**
 * CSV Batch Import Modal for Hog Surveys
 */
const CsvUploadModal = ({ file, onFileChange, errors, onClose, isPending, onSubmit, onDownloadTemplate, barangayName }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg border border-stone-200 shadow-2xl rounded-none overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50">
                    <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest">
                        Upload Survey CSV
                    </h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="bg-stone-50 border border-stone-200 p-4 space-y-2 text-stone-600 text-xs">
                        <p className="font-bold flex items-center gap-1.5"><Info size={14} className="text-green-700" /> CSV Upload Guidelines:</p>
                        <ul className="list-disc pl-4 space-y-1 font-medium text-stone-500">
                            <li>CSV must contain a header row.</li>
                            <li>Required columns: <code className="font-mono bg-stone-100 px-1">barangay, survey_date, inahin, barako, fattener, grower, starter, bulaw, total_pigs</code></li>
                            <li>Optional columns: <code className="font-mono bg-stone-100 px-1">farmer_name, contact_number</code></li>
                            <li>Format: Date must be in <code className="font-mono bg-stone-100 px-1">YYYY-MM-DD</code> format.</li>
                            <li>For safety, you can only import records containing barangay name exactly matching: <span className="font-black text-green-700 uppercase">"{barangayName}"</span></li>
                        </ul>
                        <button
                            type="button"
                            onClick={onDownloadTemplate}
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
                            onChange={(e) => onFileChange(e.target.files[0])}
                            className="w-full text-xs font-semibold border border-stone-200 p-3"
                        />
                    </div>

                    {errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200/50 p-4 max-h-[150px] overflow-y-auto space-y-1">
                            <p className="text-[10px] font-black text-red-700 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12} /> Import Errors:</p>
                            {errors.map((err, i) => (
                                <p key={i} className="text-[10px] text-red-600 font-mono">{err}</p>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-4 justify-end pt-4 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPending}
                            className="px-6 py-3 border border-stone-200 text-[10px] font-black uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !file}
                            className="bg-green-700 hover:bg-green-600 disabled:bg-stone-100 text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isPending ? (
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
    );
};

export default CsvUploadModal;