import { useEffect, useMemo, useRef, useState } from 'react';
import { Table, X, Plus, Check, Trash2, RotateCcw } from 'lucide-react';
import { api } from '../../../lib/api';
import { PIG_CATEGORIES } from './useBatchSurvey';

/**
 * Rapid Multi-Row Batch Survey Entry Spreadsheet Grid
 */
const BatchSurveyEncoder = ({
    batchRows,
    batchDate,
    barangayId,
    onBatchDateChange,
    onRowChange,
    onAddRow,
    onRemoveRow,
    onClearRows,
    onSubmit,
    isPending,
    onClose
}) => {
    const [suggestionsByRow, setSuggestionsByRow] = useState({});
    const [openForRow, setOpenForRow] = useState(null);
    const [highlighted, setHighlighted] = useState(0);
    const [rowErrors, setRowErrors] = useState({});
    const debounceRef = useRef(null);
    const dropdownRef = useRef(null);
    const activeRowRef = useRef(null);
    const dateRef = useRef(null);
    const cellRefs = useRef({});

    const setCellRef = (key) => (el) => {
        if (el) cellRefs.current[key] = el;
    };

    const focusCell = (key) => {
        const el = cellRefs.current[key];
        if (el) {
            el.focus();
            el.scrollIntoView?.({ block: 'nearest' });
        }
    };

    const handleAdd = () => {
        setRowErrors({});
        onAddRow();
    };

    const handleClear = () => {
        setRowErrors({});
        onClearRows();
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenForRow(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => () => clearTimeout(debounceRef.current), []);

    const getRowTotal = useMemo(() => {
        return (row) => PIG_CATEGORIES.reduce((acc, cat) => acc + (parseInt(row[cat], 10) || 0), 0);
    }, []);

    const validBatchRows = useMemo(
        () =>
            batchRows.filter(
                (row) => (row.farmer_name || '').trim().length > 0 && getRowTotal(row) > 0
            ),
        [batchRows, getRowTotal]
    );

    const batchTotalPigs = useMemo(
        () => validBatchRows.reduce((acc, row) => acc + getRowTotal(row), 0),
        [validBatchRows, getRowTotal]
    );

    const handleFarmerNameChange = (idx, value) => {
        const row = batchRows[idx];
        activeRowRef.current = row.id;
        onRowChange(idx, 'farmer_name', value);
        setRowErrors((prev) => ({ ...prev, [row.id]: undefined }));
        clearTimeout(debounceRef.current);

        const query = value.trim();
        if (query.length < 2) {
            setSuggestionsByRow((prev) => ({ ...prev, [row.id]: [] }));
            setOpenForRow(null);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            try {
                const res = await api.get('/hog-survey/farmer_lookup/', { params: { q: query } });
                const data = Array.isArray(res.data) ? res.data : [];
                if (activeRowRef.current === row.id) {
                    setSuggestionsByRow((prev) => ({ ...prev, [row.id]: data }));
                    setHighlighted(0);
                    setOpenForRow(row.id);
                }
            } catch (err) {
                console.error(err);
                if (activeRowRef.current === row.id) {
                    setSuggestionsByRow((prev) => ({ ...prev, [row.id]: [] }));
                    setOpenForRow(null);
                }
            }
        }, 300);
    };

    const handleRowValueChange = (idx, field, value) => {
        const row = batchRows[idx];
        onRowChange(idx, field, value);
        setRowErrors((prev) => ({ ...prev, [row.id]: undefined }));
    };

    const selectSuggestion = (idx, s) => {
        const row = batchRows[idx];
        onRowChange(idx, 'farmer_name', s.farmer_name);
        onRowChange(idx, 'contact_number', s.contact_number || '');
        setSuggestionsByRow((prev) => ({ ...prev, [row.id]: [] }));
        setOpenForRow(null);
        focusCell(`${row.id}_inahin`);
    };

    const handleFarmerNameKeyDown = (e, idx) => {
        const row = batchRows[idx];

        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
            return;
        }

        if (openForRow !== row.id) return;

        const suggestions = suggestionsByRow[row.id] || [];

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const suggestion = suggestions[highlighted];
            if (suggestion) selectSuggestion(idx, suggestion);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpenForRow(null);
        }
    };

    const handleLastCellKeyDown = (e, idx) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
            return;
        }

        if (e.key === 'Tab' && !e.shiftKey) {
            if (idx === batchRows.length - 1) {
                e.preventDefault();
                handleAdd();
                setTimeout(() => {
                    const nextCell = cellRefs.current[`${idx + 1}_farmer_name_new`];
                    if (nextCell) nextCell.focus();
                }, 0);
            }
        }
    };

    const buildSurveyPayload = () => {
        const touchedRows = batchRows
            .map((row, idx) => {
                const hasName = (row.farmer_name || '').trim().length > 0;
                const hasContact = (row.contact_number || '').trim().length > 0;
                const total = getRowTotal(row);
                const isTouched = hasName || hasContact || total > 0;
                return { row, idx, hasName, total, isTouched };
            })
            .filter((r) => r.isTouched);

        if (touchedRows.length === 0) return [];

        return touchedRows.map(({ row }) => ({
            barangay: barangayId,
            survey_date: batchDate,
            farmer_name: row.farmer_name.trim(),
            contact_number: (row.contact_number || '').trim(),
            inahin: parseInt(row.inahin, 10) || 0,
            barako: parseInt(row.barako, 10) || 0,
            fattener: parseInt(row.fattener, 10) || 0,
            grower: parseInt(row.grower, 10) || 0,
            starter: parseInt(row.starter, 10) || 0,
            bulaw: parseInt(row.bulaw, 10) || 0,
        }));
    };

    const handleSubmit = () => {
        const errors = {};

        if (!batchDate) {
            errors.date = 'Survey collection date is required.';
            setRowErrors(errors);
            dateRef.current?.focus();
            return;
        }

        batchRows.forEach((row, idx) => {
            if ((row.farmer_name || '').trim().length > 0 || getRowTotal(row) > 0) {
                if (!(row.farmer_name || '').trim()) {
                    errors[row.id] = `Row ${idx + 1}: Farmer / owner name is required.`;
                    return;
                }
                if (getRowTotal(row) <= 0) {
                    errors[row.id] = `Row ${idx + 1} (${row.farmer_name.trim()}): Enter at least 1 pig count.`;
                }
            }
        });

        const hasErrors = Object.values(errors).some(Boolean);
        if (hasErrors) {
            setRowErrors(errors);
            const firstErrorRow = batchRows.find((row) => errors[row.id]);
            if (firstErrorRow) {
                const hasName = (firstErrorRow.farmer_name || '').trim().length > 0;
                focusCell(hasName ? `${firstErrorRow.id}_inahin` : `${firstErrorRow.id}_farmer_name`);
            }
            return;
        }

        const surveys = buildSurveyPayload();
        if (surveys.length === 0) {
            setRowErrors({ overall: 'Cannot save empty survey data. Enter at least one farmer record.' });
            focusCell(`${batchRows[0].id}_farmer_name`);
            return;
        }

        onSubmit(surveys);
        setRowErrors({});
    };

    const errorList = Object.values(rowErrors).filter(Boolean);

    return (
        <div className="border border-stone-200 bg-white rounded-xl shadow-xs overflow-hidden">
            {/* Panel Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-tight text-stone-900 flex items-center gap-2">
                        <Table size={16} className="text-green-700" /> Multi-Household Batch Entry
                    </h2>
                    <p className="text-xs text-stone-500">
                        Quickly encode multiple farmer surveys in one sitting. On desktop, press <kbd className="bg-white px-1.5 py-0.5 text-stone-700 font-mono text-[10px] border border-stone-200 rounded">Tab</kbd> in the last cell to auto-add rows.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between sm:justify-end">
                    <div className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-2xs flex-1 sm:flex-initial">
                        <label htmlFor="batch-survey-date" className="text-[10px] font-black uppercase tracking-wider text-stone-500 whitespace-nowrap">
                            Date:
                        </label>
                        <input
                            id="batch-survey-date"
                            type="date"
                            ref={dateRef}
                            value={batchDate}
                            onChange={(e) => { onBatchDateChange(e.target.value); setRowErrors((prev) => ({ ...prev, date: undefined })); }}
                            className="bg-transparent text-stone-800 font-mono text-xs font-bold focus:outline-none cursor-pointer"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                        title="Close batch form"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {rowErrors.date && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{rowErrors.date}</p>
                </div>
            )}

            {rowErrors.overall && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{rowErrors.overall}</p>
                </div>
            )}

            {/* Mobile View: Card Deck for Phones (< md) */}
            <div className="block md:hidden p-3 space-y-3 bg-stone-50">
                {batchRows.map((row, idx) => {
                    const rowTotal = getRowTotal(row);
                    const error = rowErrors[row.id];

                    return (
                        <div
                            key={row.id}
                            className={`bg-white border rounded-xl p-3.5 space-y-3 shadow-xs transition-colors ${
                                error ? 'border-red-300 ring-1 ring-red-200' : 'border-stone-200'
                            }`}
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-stone-100 text-stone-700 font-mono text-xs font-black flex items-center justify-center">
                                        #{idx + 1}
                                    </span>
                                    <span className="text-xs font-bold text-stone-800">
                                        Farmer Household
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                                        rowTotal > 0 ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-400'
                                    }`}>
                                        {rowTotal} pigs
                                    </span>
                                    <button
                                        type="button"
                                        title="Remove household"
                                        onClick={() => onRemoveRow(idx)}
                                        className="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-2">
                                <div className="relative">
                                    <label htmlFor={`mobile-farmer-${idx}`} className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-0.5">
                                        Farmer Name *
                                    </label>
                                    <input
                                        id={`mobile-farmer-${idx}`}
                                        type="text"
                                        placeholder="e.g. Maria Santos"
                                        value={row.farmer_name}
                                        onChange={(e) => handleFarmerNameChange(idx, e.target.value)}
                                        onFocus={() => { activeRowRef.current = row.id; }}
                                        className="w-full h-10 px-3 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:outline-none focus:border-green-700"
                                    />
                                    {openForRow === row.id && (suggestionsByRow[row.id] || []).length > 0 && (
                                        <div
                                            ref={dropdownRef}
                                            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-44 overflow-y-auto"
                                        >
                                            {(suggestionsByRow[row.id] || []).map((s, i) => (
                                                <button
                                                    key={`${s.farmer_name}-${i}`}
                                                    type="button"
                                                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(idx, s); }}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 border-b border-stone-100 last:border-0"
                                                >
                                                    <span className="font-bold text-stone-800 block">{s.farmer_name}</span>
                                                    <span className="text-[10px] text-stone-500 font-mono">{s.contact_number || 'No phone'}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor={`mobile-phone-${idx}`} className="text-[10px] font-black uppercase tracking-wider text-stone-500 block mb-0.5">
                                        Contact Number
                                    </label>
                                    <input
                                        id={`mobile-phone-${idx}`}
                                        type="tel"
                                        inputMode="tel"
                                        placeholder="0912 345 6789"
                                        value={row.contact_number}
                                        onChange={(e) => handleRowValueChange(idx, 'contact_number', e.target.value)}
                                        className="w-full h-10 px-3 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-800 focus:outline-none focus:border-green-700"
                                    />
                                </div>
                            </div>

                            {/* 3-column animal grid */}
                            <div className="pt-2 border-t border-stone-100">
                                <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block mb-1.5">
                                    Swine Counts
                                </span>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { key: 'inahin', label: 'Inahin' },
                                        { key: 'barako', label: 'Barako' },
                                        { key: 'starter', label: 'Starter' },
                                        { key: 'grower', label: 'Grower' },
                                        { key: 'fattener', label: 'Fattener' },
                                        { key: 'bulaw', label: 'Bulaw' },
                                    ].map(({ key, label }) => (
                                        <div key={key} className="bg-stone-50 border border-stone-200 rounded-lg p-1.5 text-center">
                                            <span className="text-[9px] font-black uppercase text-stone-500 block truncate">
                                                {label}
                                            </span>
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                min="0"
                                                placeholder="0"
                                                value={row[key]}
                                                onChange={(e) => handleRowValueChange(idx, key, e.target.value)}
                                                className="w-full h-8 text-center bg-white border border-stone-200 rounded text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-green-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none mt-1"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}

                <button
                    type="button"
                    onClick={handleAdd}
                    className="w-full h-12 bg-white border-2 border-dashed border-stone-300 hover:border-green-700 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
                >
                    <Plus size={16} className="text-green-700" /> Add Household Card
                </button>
            </div>

            {/* Desktop View: Full Spreadsheet Grid (md+) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[960px]">
                    <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-500">
                        <tr>
                            <th className="px-3 py-2.5 text-center w-10 border-r border-stone-200">#</th>
                            <th className="px-3 py-2.5 w-60 border-r border-stone-200">Farmer / Owner Name</th>
                            <th className="px-3 py-2.5 w-40 border-r border-stone-200">Cellphone No.</th>
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
                            const error = rowErrors[row.id];

                            return (
                                <tr key={row.id} className={error ? 'bg-red-50/40' : isRowFilled ? 'bg-green-50/20 hover:bg-stone-50/80 transition-colors' : 'hover:bg-stone-50/80 transition-colors'}>
                                    <td className="px-3 py-2 text-center font-mono text-stone-400 text-xs font-bold border-r border-stone-200 bg-stone-50/40">
                                        {idx + 1}
                                    </td>
                                    <td className="p-0 border-r border-stone-200 relative">
                                        <input
                                            id={`farmer_name_${idx}`}
                                            type="text"
                                            placeholder="Juan Dela Cruz"
                                            value={row.farmer_name}
                                            ref={setCellRef(`${row.id}_farmer_name`)}
                                            onChange={(e) => handleFarmerNameChange(idx, e.target.value)}
                                            onFocus={() => { activeRowRef.current = row.id; }}
                                            onKeyDown={(e) => handleFarmerNameKeyDown(e, idx)}
                                            className={`w-full h-10 px-3 py-2 bg-transparent text-xs text-stone-800 font-medium placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset transition-colors ${
                                                error ? 'ring-1 ring-inset ring-red-400' : 'focus:ring-green-700'
                                            }`}
                                        />
                                        {openForRow === row.id && (suggestionsByRow[row.id] || []).length > 0 && (
                                            <div
                                                ref={dropdownRef}
                                                className="absolute z-50 left-0 right-0 top-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                                            >
                                                {(suggestionsByRow[row.id] || []).map((s, i) => (
                                                    <button
                                                        key={`${s.farmer_name}-${i}`}
                                                        type="button"
                                                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(idx, s); }}
                                                        onMouseEnter={() => setHighlighted(i)}
                                                        className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 ${
                                                            i === highlighted ? 'bg-green-50 text-green-700' : 'hover:bg-stone-50 text-stone-700'
                                                        }`}
                                                    >
                                                        <span className="font-bold flex items-center">
                                                            {s.farmer_name}
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 ml-1 rounded ${
                                                                s.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'
                                                            }`}>
                                                                {s.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </span>
                                                        <span className="text-stone-400 text-[10px]">{s.contact_number} · Last: {s.last_survey_date}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-0 border-r border-stone-200">
                                        <input
                                            id={`contact_number_${idx}`}
                                            type="text"
                                            placeholder="09123456789"
                                            value={row.contact_number}
                                            ref={setCellRef(`${row.id}_contact_number`)}
                                            onChange={(e) => handleRowValueChange(idx, 'contact_number', e.target.value)}
                                            className="w-full h-10 px-3 py-2 bg-transparent text-xs font-mono text-stone-800 placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-green-700 transition-colors"
                                        />
                                    </td>
                                    {['inahin', 'barako', 'fattener', 'grower', 'starter', 'bulaw'].map((cat, catIdx) => (
                                        <td key={cat} className="p-0 border-r border-stone-200">
                                            <input
                                                id={`${cat}_${idx}`}
                                                type="number"
                                                inputMode="numeric"
                                                min="0"
                                                placeholder="0"
                                                value={row[cat]}
                                                ref={setCellRef(`${row.id}_${cat}`)}
                                                onChange={(e) => handleRowValueChange(idx, cat, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleSubmit();
                                                    }
                                                    if (e.key === 'Enter' && catIdx === 5) {
                                                        handleLastCellKeyDown(e, idx);
                                                    }
                                                }}
                                                className={`w-full h-10 px-2 py-2 text-center bg-transparent text-xs font-semibold placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-inset transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                                    error ? 'ring-1 ring-inset ring-red-400' : 'focus:ring-green-700'
                                                }`}
                                            />
                                        </td>
                                    ))}
                                    <td className="px-3 py-2 text-center border-r border-stone-200 bg-stone-50/40">
                                        <span className={`inline-block font-mono text-xs font-bold rounded px-2 py-0.5 ${rowTotal > 0 ? 'text-green-700 bg-green-50 border border-green-200' : 'text-stone-300'}`}>
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

            {errorList.length > 0 && (
                <div className="px-4 sm:px-5 py-2.5 bg-red-50 border-t border-red-100">
                    <ul className="space-y-1">
                        {errorList.map((msg, i) => (
                            <li key={i} className="text-[10px] font-bold text-red-600 uppercase tracking-wider">{msg}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Footer Actions */}
            <div className="bg-stone-50 border-t border-stone-200 px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="h-11 px-4 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                        <Plus size={14} /> Add Row
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="h-11 px-3 text-stone-500 hover:text-stone-800 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1"
                    >
                        <RotateCcw size={13} /> Clear
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <p className="text-xs text-stone-600 font-medium text-center sm:text-left">
                        <strong className="text-stone-900">{validBatchRows.length}</strong> {validBatchRows.length === 1 ? 'household' : 'households'} ready ({batchTotalPigs} pigs)
                    </p>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isPending || validBatchRows.length === 0}
                        className="h-12 px-6 bg-green-700 hover:bg-green-600 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                    >
                        {isPending ? (
                            <>
                                <span className="loading loading-spinner loading-xs"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check size={16} /> Save Batch {validBatchRows.length > 0 ? `(${validBatchRows.length})` : ''}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchSurveyEncoder;