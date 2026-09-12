import {
    Users,
    User,
    MapPin,
    Phone,
    Trash2,
    AlertCircle,
    ShieldCheck,
    Clock,
    CheckCircle2,
    UserCheck,
    UserX,
    Edit
} from 'lucide-react';
import Pagination from '../../components/ui/Pagination';

/**
 * Paginated Farmers Directory Table with KYC / account status badges.
 */
const FarmersTable = ({ farmers, count, limit, offset, onOffsetChange, onReview, onEdit, onDelete, onToggleStatus, isDeleting }) => {
    return (
        <div className="border border-stone-200 bg-white">
            <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-500">
                        <tr>
                            <th className="px-6 py-5">Farmer Account</th>
                            <th className="px-6 py-5">Phone & Address</th>
                            <th className="px-6 py-5">Location</th>
                            <th className="px-6 py-5 text-center">KYC Status</th>
                            <th className="px-6 py-5 text-center">Account</th>
                            <th className="px-6 py-5 text-right pr-8">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {farmers.length === 0 ? (
                            <tr>
                                <td colSpan="6">
                                    <div className="flex flex-col items-center justify-center py-24 bg-stone-50/30">
                                        <Users size={48} className="text-stone-200 mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">No registered farmers found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            farmers.map((farmer) => (
                                <tr key={farmer.id} className="hover:bg-stone-50 transition-colors">
                                    {/* Name & Username */}
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 shrink-0">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-stone-800 uppercase tracking-tight">
                                                    {farmer.first_name} {farmer.last_name}
                                                </p>
                                                <p className="text-[9px] font-mono font-bold text-stone-400 mt-0.5">
                                                    @{farmer.username}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Contacts */}
                                    <td className="px-6 py-5">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                                                <Phone size={12} className="text-stone-400" />
                                                {farmer.phone_no || 'No phone listed'}
                                            </p>
                                            <p className="text-[10px] text-stone-500 font-medium truncate max-w-xs">
                                                {farmer.address || 'No address listed'}
                                            </p>
                                        </div>
                                    </td>
                                    {/* Barangay */}
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                                            <MapPin size={14} className="text-green-600 shrink-0" />
                                            <span className="uppercase tracking-tight">{farmer.barangay_name || 'None'}</span>
                                        </div>
                                    </td>
                                    {/* KYC Verification Status */}
                                    <td className="px-6 py-5 text-center">
                                        {farmer.verification_status === 'VERIFIED' && (
                                            <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-300 inline-flex items-center gap-1">
                                                <CheckCircle2 size={11} /> Verified
                                            </span>
                                        )}
                                        {farmer.verification_status === 'PENDING_REVIEW' && (
                                            <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                                                <Clock size={11} /> Pending Review
                                            </span>
                                        )}
                                        {farmer.verification_status === 'REJECTED' && (
                                            <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-300 inline-flex items-center gap-1">
                                                <AlertCircle size={11} /> Rejected
                                            </span>
                                        )}
                                        {(!farmer.verification_status || farmer.verification_status === 'UNVERIFIED') && (
                                            <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-300 inline-flex items-center gap-1">
                                                Unverified
                                            </span>
                                        )}
                                    </td>
                                    {/* Status */}
                                    <td className="px-6 py-5 text-center">
                                        <button
                                            onClick={() => onToggleStatus(farmer)}
                                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-colors inline-flex items-center gap-1.5
                                                ${farmer.is_active 
                                                    ? 'bg-green-50 text-green-700 border-green-600/30 hover:bg-red-50 hover:text-red-600 hover:border-red-600/30' 
                                                    : 'bg-red-50 text-red-600 border-red-600/30 hover:bg-green-50 hover:text-green-700 hover:border-green-600/30'
                                                }`}
                                        >
                                            {farmer.is_active ? (
                                                <>
                                                    <UserCheck size={12} /> Active
                                                </>
                                            ) : (
                                                <>
                                                    <UserX size={12} /> Deactivated
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    {/* Actions */}
                                    <td className="px-6 py-5 text-right pr-8">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => onReview(farmer)}
                                                className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 border ${
                                                    farmer.verification_status === 'PENDING_REVIEW'
                                                        ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700 shadow-sm'
                                                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                                                }`}
                                            >
                                                <ShieldCheck size={13} /> Review Docs
                                            </button>
                                            <button
                                                onClick={() => onEdit(farmer)}
                                                className="bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                            >
                                                <Edit size={12} /> Edit Details
                                            </button>
                                            <button
                                                onClick={() => onDelete(farmer)}
                                                disabled={isDeleting}
                                                className="bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                {isDeleting ? (
                                                    <span className="loading loading-spinner loading-xs"></span>
                                                ) : (
                                                    <Trash2 size={12} />
                                                )}
                                                Delete
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

export default FarmersTable;