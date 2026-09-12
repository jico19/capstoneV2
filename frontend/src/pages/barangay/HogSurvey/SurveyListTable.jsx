import { Activity, Calendar, User, Phone, Edit, Trash2 } from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';

/**
 * Paginated Hog Survey Records Table
 */
const SurveyListTable = ({ surveys, count, limit, offset, onOffsetChange, onEdit, onDelete }) => {
    return (
        <div className="border border-stone-200 bg-white">
            <div className="overflow-x-auto w-full">
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
                                            <span className="flex items-center gap-1.5">
                                                <User size={13} className="text-stone-400 shrink-0" />
                                                {survey.farmer_name}
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