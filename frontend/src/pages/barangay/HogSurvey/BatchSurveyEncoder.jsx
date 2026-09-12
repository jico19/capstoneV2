import { Table, X, Plus, Check, Trash2, RotateCcw } from 'lucide-react';

/**
 * Rapid Multi-Row Batch Survey Entry Spreadsheet Grid
 */
const BatchSurveyEncoder = ({
    batchRows,
    batchDate,
    onBatchDateChange,
    onRowChange,
    onAddRow,
    onRemoveRow,
    onClearRows,
    onSubmit,
    onLastCellKeyDown,
    getRowTotal,
    validBatchRows,
    batchTotalPigs,
    isPending,
    onClose
}) => {
    return (
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
                            onChange={(e) => onBatchDateChange(e.target.value)}
                            className="bg-transparent text-stone-800 font-mono text-xs font-bold focus:outline-none cursor-pointer"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
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
                                            onChange={(e) => onRowChange(idx, 'farmer_name', e.target.value)}
                                            onKeyDown={(e) => {
                                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                    e.preventDefault();
                                                    onSubmit();
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
                                            onChange={(e) => onRowChange(idx, 'contact_number', e.target.value)}
                                            onKeyDown={(e) => {
                                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                    e.preventDefault();
                                                    onSubmit();
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
                                                onChange={(e) => onRowChange(idx, cat, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                        e.preventDefault();
                                                        onSubmit();
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
                                            onChange={(e) => onRowChange(idx, 'bulaw', e.target.value)}
                                            onKeyDown={(e) => onLastCellKeyDown(e, idx)}
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
                                            onClick={() => onRemoveRow(idx)}
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
                        onClick={onAddRow}
                        className="bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 px-3 py-2 text-xs font-semibold rounded-none transition-colors flex items-center gap-1.5"
                    >
                        <Plus size={13} /> Add Row
                    </button>
                    <button
                        type="button"
                        onClick={onClearRows}
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
                        onClick={onSubmit}
                        disabled={isPending || validBatchRows.length === 0}
                        className="bg-green-700 hover:bg-green-600 disabled:bg-stone-200 disabled:text-stone-400 text-white px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
                    >
                        {isPending ? (
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
    );
};

export default BatchSurveyEncoder;