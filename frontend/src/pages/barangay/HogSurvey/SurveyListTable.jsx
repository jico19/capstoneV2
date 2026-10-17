import { Activity, Calendar, User, Phone, Edit, Trash2, X, Search } from 'lucide-react';
import DataTable from '../../../components/ui/DataTable';

const ACTIVE_DAYS = 180;
const isFarmerActive = (lastSurveyDate) => {
    if (!lastSurveyDate) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ACTIVE_DAYS);
    return new Date(lastSurveyDate) >= cutoff;
};

/**
 * Paginated Hog Survey Records Table & Mobile Cards
 */
const SurveyListTable = ({
    surveys,
    count,
    limit,
    offset,
    onOffsetChange,
    onEdit,
    onDelete,
    filterFarmer,
    filterDateFrom,
    filterDateTo,
    onFilterChange,
    onClearFilters,
    onFilterByFarmer
}) => {
    const isFiltered = Boolean(filterFarmer || filterDateFrom || filterDateTo);

    const columns = [
        {
            header: 'Survey Date',
            accessor: 'survey_date',
            render: (survey) => (
                <div className="font-mono font-bold flex items-center gap-1.5 whitespace-nowrap text-stone-800">
                    <Calendar size={14} className="text-stone-400 shrink-0" />
                    {survey.survey_date}
                </div>
            ),
        },
        {
            header: 'Farmer / Owner',
            accessor: 'farmer_name',
            render: (survey) => survey.farmer_name ? (
                <span
                    className="flex items-center gap-1.5 cursor-pointer hover:text-green-700 font-bold text-stone-900 group"
                    onClick={() => onFilterByFarmer(survey.farmer_name)}
                    title="Click to view all surveys for this farmer"
                >
                    <User size={14} className="text-stone-400 group-hover:text-green-700 shrink-0" />
                    <span className="group-hover:underline">{survey.farmer_name}</span>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ml-1 ${
                        isFarmerActive(survey.survey_date) ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                    }`}>
                        {isFarmerActive(survey.survey_date) ? 'Active' : 'Inactive'}
                    </span>
                </span>
            ) : (
                <span className="text-stone-300 font-normal italic">—</span>
            ),
        },
        {
            header: 'Contact No.',
            accessor: 'contact_number',
            render: (survey) => survey.contact_number ? (
                <span className="flex items-center gap-1.5 font-mono text-stone-600 whitespace-nowrap">
                    <Phone size={13} className="text-stone-400 shrink-0" />
                    {survey.contact_number}
                </span>
            ) : (
                <span className="text-stone-300 font-normal italic">—</span>
            ),
        },
        { header: 'Inahin', accessor: 'inahin', align: 'center' },
        { header: 'Barako', accessor: 'barako', align: 'center' },
        { header: 'Fattener', accessor: 'fattener', align: 'center' },
        { header: 'Grower', accessor: 'grower', align: 'center' },
        { header: 'Starter', accessor: 'starter', align: 'center' },
        { header: 'Bulaw', accessor: 'bulaw', align: 'center' },
        {
            header: 'Total Swine',
            accessor: 'total_pigs',
            align: 'center',
            className: 'font-mono font-black text-green-800 bg-green-50/50',
        },
        {
            header: 'Actions',
            align: 'right',
            headerClassName: 'pr-6',
            className: 'pr-6 whitespace-nowrap',
            render: (survey) => (
                <div className="flex items-center gap-1.5 justify-end">
                    <button
                        onClick={() => onEdit(survey)}
                        className="h-8 px-2.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-wider rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                    >
                        <Edit size={12} /> Edit
                    </button>
                    <button
                        onClick={() => onDelete(survey)}
                        className="h-8 px-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider rounded-md transition-colors flex items-center gap-1 shadow-2xs"
                    >
                        <Trash2 size={12} /> Delete
                    </button>
                </div>
            ),
        },
    ];

    const renderMobileCards = (items) => (
        <div className="p-3 space-y-3 bg-stone-50/60">
            {items.map((survey) => (
                <div key={survey.id} className="bg-white border border-stone-200 rounded-xl p-4 space-y-3 shadow-xs">
                    {/* Header: Date + Total Pigs */}
                    <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-stone-600">
                            <Calendar size={14} className="text-stone-400" />
                            <span>{survey.survey_date}</span>
                        </div>
                        <span className="text-xs font-mono font-black text-green-800 bg-green-100 px-2 py-0.5 rounded-md border border-green-200">
                            {survey.total_pigs} pigs
                        </span>
                    </div>

                    {/* Farmer Details */}
                    <div>
                        {survey.farmer_name ? (
                            <div className="flex items-center justify-between gap-2">
                                <span
                                    className="text-sm font-bold text-stone-900 flex items-center gap-1.5 cursor-pointer hover:text-green-700"
                                    onClick={() => onFilterByFarmer(survey.farmer_name)}
                                >
                                    <User size={15} className="text-stone-400 shrink-0" />
                                    <span>{survey.farmer_name}</span>
                                </span>
                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                                    isFarmerActive(survey.survey_date) ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                                }`}>
                                    {isFarmerActive(survey.survey_date) ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        ) : (
                            <span className="text-xs text-stone-400 italic">No farmer name</span>
                        )}
                        {survey.contact_number && (
                            <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1 font-mono">
                                <Phone size={12} className="text-stone-400 shrink-0" />
                                <span>{survey.contact_number}</span>
                            </div>
                        )}
                    </div>

                    {/* Classification Grid */}
                    <div className="grid grid-cols-3 gap-1.5 text-center bg-stone-50 p-2 rounded-lg border border-stone-200/60">
                        <div className="p-1">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Inahin</span>
                            <span className="text-xs font-mono font-bold text-stone-800">{survey.inahin}</span>
                        </div>
                        <div className="p-1">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Barako</span>
                            <span className="text-xs font-mono font-bold text-stone-800">{survey.barako}</span>
                        </div>
                        <div className="p-1">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Starter</span>
                            <span className="text-xs font-mono font-bold text-stone-800">{survey.starter}</span>
                        </div>
                        <div className="p-1 border-t border-stone-200/60 pt-1">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Grower</span>
                            <span className="text-xs font-mono font-bold text-stone-800">{survey.grower}</span>
                        </div>
                        <div className="p-1 border-t border-stone-200/60 pt-1">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Fattener</span>
                            <span className="text-xs font-mono font-bold text-stone-800">{survey.fattener}</span>
                        </div>
                        <div className="p-1 border-t border-stone-200/60 pt-1">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Bulaw</span>
                            <span className="text-xs font-mono font-bold text-stone-800">{survey.bulaw}</span>
                        </div>
                    </div>

                    {/* Actions (44px+ hit areas) */}
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            onClick={() => onEdit(survey)}
                            className="flex-1 h-11 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                            <Edit size={14} /> Edit
                        </button>
                        <button
                            onClick={() => onDelete(survey)}
                            className="flex-1 h-11 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="border border-stone-200 bg-white rounded-xl shadow-xs overflow-hidden">
            {/* Filter Active Ribbon */}
            {filterFarmer && (
                <div className="px-4 sm:px-6 py-2.5 bg-sky-50 border-b border-sky-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <User size={14} className="text-sky-700 shrink-0" />
                        <span className="text-xs text-sky-900 font-bold truncate">
                            Viewing surveys for: <strong>{filterFarmer}</strong> ({count} {count === 1 ? 'record' : 'records'})
                        </span>
                    </div>
                    <button
                        onClick={onClearFilters}
                        className="text-[10px] font-black uppercase tracking-wider text-sky-700 hover:text-red-600 flex items-center gap-1 shrink-0"
                    >
                        <X size={13} /> Clear
                    </button>
                </div>
            )}

            {/* Responsive Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                        Search & Filter Records
                    </span>
                    {isFiltered && (
                        <button
                            onClick={onClearFilters}
                            className="text-stone-400 hover:text-red-600 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                            <X size={13} /> Reset Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input
                            type="text"
                            value={filterFarmer}
                            onChange={e => onFilterChange('farmer_name', e.target.value)}
                            placeholder="Filter by farmer name..."
                            className="w-full h-10 pl-9 pr-3 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700/20"
                        />
                    </div>

                    <div>
                        <input
                            type="date"
                            value={filterDateFrom}
                            onChange={e => onFilterChange('date_from', e.target.value)}
                            aria-label="Filter from date"
                            className="w-full h-10 px-3 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700/20"
                        />
                    </div>

                    <div>
                        <input
                            type="date"
                            value={filterDateTo}
                            onChange={e => onFilterChange('date_to', e.target.value)}
                            aria-label="Filter to date"
                            className="w-full h-10 px-3 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700/20"
                        />
                    </div>
                </div>
            </div>

            {/* Universal DataTable with Mobile Card Fallback */}
            <DataTable
                columns={columns}
                data={surveys}
                minWidth="960px"
                className="border-0"
                emptyState={{
                    icon: Activity,
                    title: 'No hog surveys recorded',
                    description: isFiltered
                        ? 'No survey records match your search filters.'
                        : 'Start recording swine inventory surveys using Add Survey or Batch Entry.',
                }}
                mobileRenderer={renderMobileCards}
                pagination={{
                    count,
                    limit,
                    offset,
                    onPageChange: onOffsetChange,
                }}
            />
        </div>
    );
};

export default SurveyListTable;