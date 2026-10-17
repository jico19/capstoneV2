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
import DataTable from '../../components/ui/DataTable';

/**
 * Paginated Farmers Directory Table with KYC / account status badges.
 * Built using the universal DataTable component.
 */
const FarmersTable = ({
    farmers,
    count,
    limit,
    offset,
    onOffsetChange,
    onReview,
    onEdit,
    onDelete,
    onToggleStatus,
    isDeleting,
}) => {
    const columns = [
        {
            header: 'Farmer Account',
            render: (farmer) => (
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
            ),
        },
        {
            header: 'Phone & Address',
            render: (farmer) => (
                <div className="space-y-1">
                    <p className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                        <Phone size={12} className="text-stone-400" />
                        {farmer.phone_no || 'No phone listed'}
                    </p>
                    <p className="text-[10px] text-stone-500 font-medium truncate max-w-xs">
                        {farmer.address || 'No address listed'}
                    </p>
                </div>
            ),
        },
        {
            header: 'Location',
            render: (farmer) => (
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                    <MapPin size={14} className="text-green-600 shrink-0" />
                    <span className="uppercase tracking-tight">{farmer.barangay_name || 'None'}</span>
                </div>
            ),
        },
        {
            header: 'KYC Status',
            align: 'center',
            render: (farmer) => (
                <>
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
                </>
            ),
        },
        {
            header: 'Account',
            align: 'center',
            render: (farmer) => (
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
            ),
        },
        {
            header: 'Actions',
            align: 'right',
            headerClassName: 'pr-8',
            className: 'pr-8',
            render: (farmer) => (
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
            ),
        },
    ];

    return (
        <DataTable
            columns={columns}
            data={farmers}
            minWidth="900px"
            emptyState={{
                icon: Users,
                title: 'No registered farmers found',
                description: 'Try adjusting search filters or registering a new farmer profile.',
            }}
            pagination={
                count > limit
                    ? {
                          count,
                          limit,
                          offset,
                          onPageChange: onOffsetChange,
                      }
                    : null
            }
        />
    );
};

export default FarmersTable;