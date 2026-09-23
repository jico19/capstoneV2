import { Activity, Calendar, User, Phone, Edit, Trash2, X } from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';

const ACTIVE_DAYS = 180;
const isFarmerActive = (lastSurveyDate) => {
    if (!lastSurveyDate) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ACTIVE_DAYS);
    return new Date(lastSurveyDate) >= cutoff;
};

/**
 * Paginated Hog Survey Records Table
 */
const SurveyListTable = ({ surveys, count, limit, offset, onOffsetChange, onEdit, onDelete, filterFarmer, filterDateFrom, filterDateTo, onFilterChange, onClearFilters, onFilterByFarmer }) => {
    return (
        <div className="border border-stone-200 bg-white">
            {/* Farmer history summary card */}
            {filterFarmer && (
                <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Farmer History</p>
                        <p className="text-sm font-black text-blue-800">{filterFarmer}</p>
                        <p className="text-[10px] text-blue-500 mt-0.5">
                            {count} record{count !== 1 ? 's' : ''} found
                        </p>
                    </div>
                    <button
                        onClick={onClearFilters}
                        className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-red-500 flex items-center gap-1"
                    >
                        <X size={12} /> Clear filter
                    </button>
                </div>
            )}

            {/* Filter bar */}
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/50 flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Farmer Name</label>
                    <input
                        type="text"
                        value={filterFarmer}
                        onChange={e => onFilterChange('farmer_name', e.target.value)}
                        placeholder="Search farmer..."
                        className="bg-white border border-stone-300 rounded-none text-xs w-52 h-9 px-3 focus:outline-none focus:border-stone-500 placeholder:text-stone-400"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Date From</label>
                    <input
                        type="date"
                        value={filterDateFrom}
                        onChange={e => onFilterChange('date_from', e.target.value)}
                        className="bg-white border border-stone-300 rounded-none text-xs w-36 h-9 px-3 focus:outline-none focus:border-stone-500"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Date To</label>
                    <input
                        type="date"
                        value={filterDateTo}
                        onChange={e => onFilterChange('date_to', e.target.value)}
                        className="bg-white border border-stone-300 rounded-none text-xs w-36 h-9 px-3 focus:outline-none focus:border-stone-500"
                    />
                </div>
                <div className="flex items-end gap-2 pb-0.5">
                    {(filterFarmer || filterDateFrom || filterDateTo) && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-1">
                            Filtered
                        </span>
                    )}
                    <button
                        onClick={onClearFilters}
                        className="text-stone-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="md:hidden">
                {surveys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-stone-50/30">
                        <Activity size={48} className="text-stone-200 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">No hog surveys found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-stone-100">
                        {surveys.map((survey) => (
                            <div key={survey.id} className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-stone-500">
                                        <Calendar size={13} className="text-stone-400" />
                                        {survey.survey_date}
                                    </div>
                                    <span className="text-sm font-black text-green-700 bg-green-50 px-2 py-0.5 border border-green-100">
                                        {survey.total_pigs} pigs
                                    </span>
                                </div>

                                <div>
                                    {survey.farmer_name ? (
                                        <span
                                            className="text-xs font-bold text-stone-800 flex items-center gap-1.5 cursor-pointer hover:text-green-700"
                                            onClick={() => onFilterByFarmer(survey.farmer_name)}
                                            title="View all surveys for this farmer"
                                        >
                                            <User size={13} className="text-stone-400 shrink-0" />
                                            {survey.farmer_name}
                                            <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 ${
                                                isFarmerActive(survey.survey_date) ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'
                                            }`}>
                                                {isFarmerActive(survey.survey_date) ? 'Active' : 'Inactive'}
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="text-xs text-stone-300 italic">No farmer name</span>
                                    )}
                                    {survey.contact_number && (
                                        <span className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-1">
                                            <Phone size={12} className="text-stone-400 shrink-0" />
                                            {survey.contact_number}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[10px] text-stone-500 border-t border-stone-100 pt-2">
                                    <span><b className="text-stone-700">{survey.inahin}</b> inahin</span>
                                    <span><b className="text-stone-700">{survey.barako}</b> barako</span>
                                    <span><b className="text-stone-700">{survey.fattener}</b> fattener</span>
                                    <span><b className="text-stone-700">{survey.grower}</b> grower</span>
                                    <span><b className="text-stone-700">{survey.starter}</b> starter</span>
                                    <span><b className="text-stone-700">{survey.bulaw}</b> bulaw</span>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        onClick={() => onEdit(survey)}
                                        className="flex-1 bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Edit size={12} /> Edit
                                    </button>
                                    <button
                                        onClick={() => onDelete(survey)}
                                        className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Trash2 size={12} /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="hidden md:block overflow-x-auto w-full">
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
                                            <span
                                                className="flex items-center gap-1.5 cursor-pointer hover:text-green-700 hover:underline"
                                                onClick={() => onFilterByFarmer(survey.farmer_name)}
                                                title="Click to view all surveys for this farmer"
                                            >
                                                <User size={13} className="text-stone-400 shrink-0" />
                                                {survey.farmer_name}
                                                <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 ml-1.5 ${
                                                    isFarmerActive(survey.survey_date) ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'
                                                }`}>
                                                    {isFarmerActive(survey.survey_date) ? 'Active' : 'Inactive'}
                                                </span>
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
                                                onClick={() => onEdit(survey)}
                                                className="bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                            >
                                                <Edit size={12} /> Edit
                                            </button>
                                            <button
                                                onClick={() => onDelete(survey)}
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
                    onPageChange={onOffsetChange}
                />
            )}
        </div>
    );
};

export default SurveyListTable;