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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600 border border-stone-200/60">
                        <User size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-stone-900 tracking-tight">
                            {farmer.first_name} {farmer.last_name}
                        </p>
                        <p className="text-xs font-mono text-stone-500 mt-0.5">
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
                    <p className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                        <Phone size={12} className="text-stone-400" />
                        {farmer.phone_no || 'No phone listed'}
                    </p>
                    <p className="text-xs text-stone-500 font-normal truncate max-w-xs">
                        {farmer.address || 'No address listed'}
                    </p>
                </div>
            ),
        },
        {
            header: 'Location',
            render: (farmer) => (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                    <MapPin size={14} className="text-emerald-600 shrink-0" />
                    <span>{farmer.barangay_name || 'None'}</span>
                </div>
            ),
        },
        {
            header: 'KYC Status',
            align: 'center',
            render: (farmer) => (
                <>
                    {farmer.verification_status === 'VERIFIED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <CheckCircle2 size={12} /> Verified
                        </span>
                    )}
                    {farmer.verification_status === 'PENDING_REVIEW' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200/80">
                            <Clock size={12} /> Pending Review
                        </span>
                    )}
                    {farmer.verification_status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200/80">
                            <AlertCircle size={12} /> Rejected
                        </span>
                    )}
                    {(!farmer.verification_status || farmer.verification_status === 'UNVERIFIED') && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-stone-100 text-stone-600 border border-stone-200">
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
                    className={`btn-tactile inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                        farmer.is_active 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
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
            headerClassName: 'pr-6',
            className: 'pr-6',
            render: (farmer) => (
                <div className="flex items-center gap-2 justify-end">
                    <button
                        onClick={() => onReview(farmer)}
                        className={`btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border shadow-2xs ${
                            farmer.verification_status === 'PENDING_REVIEW'
                                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-600'
                                : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
                        }`}
                    >
                        <ShieldCheck size={13} /> Review Docs
                    </button>
                    <button
                        onClick={() => onEdit(farmer)}
                        className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 shadow-2xs transition-colors"
                    >
                        <Edit size={12} /> Edit Details
                    </button>
                    <button
                        onClick={() => onDelete(farmer)}
                        disabled={isDeleting}
                        className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 shadow-2xs transition-colors disabled:opacity-50"
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