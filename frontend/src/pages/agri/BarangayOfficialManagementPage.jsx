import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useGetMaps } from '../../hooks/useMaps';
import { 
    Users, 
    Search, 
    UserPlus, 
    Edit, 
    Check, 
    X, 
    UserCheck,
    UserX,
    MapPin,
    Phone,
    Trash2,
    Shield
} from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { parseValidationError } from '../../lib/utils';


/**
 * Barangay Official Management Page
 * Municipal Agriculture Office (MAO) control panel to manage Barangay Officials.
 * Follows flat UI industrial aesthetic (stone colors, square borders, bold tracking).
 */
const BarangayOfficialManagementPage = () => {
    const queryClient = useQueryClient();
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
    const [confirmToggleStatusUser, setConfirmToggleStatusUser] = useState(null);

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchQuery(searchInput);
            setOffset(0);
        }, 350);
        return () => clearTimeout(handler);
    }, [searchInput]);

    // Query for Barangay Officials (users with role='Barangay')
    const { data, isLoading, isError, isFetching } = useQuery({
        queryKey: ['barangay-officials', limit, offset, searchQuery],
        queryFn: async () => {
            const res = await api.get('/user/', {
                params: { limit, offset, search: searchQuery, role: 'Barangay' }
            });
            return res.data;
        }
    });

    // Query for Barangays (for dropdowns)
    const { data: barangays = [] } = useGetMaps();

    // Mutation: Create user
    const createMutation = useMutation({
        mutationFn: async (userData) => {
            const res = await api.post('/user/', {
                ...userData,
                role: 'Barangay',
                is_active: true
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success("Barangay Official account created successfully.");
            queryClient.invalidateQueries({ queryKey: ['barangay-officials'] });
            setIsCreateOpen(false);
        },
        onError: (err) => {
            console.error(err);
            const detail = parseValidationError(err, "Could not create Barangay Official account.");
            toast.error(detail);
        }
    });

    // Mutation: Update user
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await api.patch(`/user/${id}/`, data);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Barangay Official registry updated.");
            queryClient.invalidateQueries({ queryKey: ['barangay-officials'] });
            setEditUser(null);
        },
        onError: (err) => {
            console.error(err);
            const detail = parseValidationError(err, "Could not update Barangay Official account.");
            toast.error(detail);
        }
    });

    // Mutation: Delete user
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await api.delete(`/user/${id}/`);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Barangay Official account permanently deleted.");
            queryClient.invalidateQueries({ queryKey: ['barangay-officials'] });
        },
        onError: (err) => {
            console.error(err);
            const detail = parseValidationError(err, "Could not delete Barangay Official account.");
            toast.error(detail);
        }
    });

    const handleDeleteOfficial = (official) => {
        setConfirmDeleteUser(official);
    };

    const executeDelete = async () => {
        if (!confirmDeleteUser) return;
        try {
            await deleteMutation.mutateAsync(confirmDeleteUser.id);
            setConfirmDeleteUser(null);
        } catch {
            // Handled in mutation
        }
    };

    const toggleActiveStatus = (official) => {
        setConfirmToggleStatusUser(official);
    };

    const executeToggleStatus = async () => {
        if (!confirmToggleStatusUser) return;
        try {
            await updateMutation.mutateAsync({
                id: confirmToggleStatusUser.id,
                data: { is_active: !confirmToggleStatusUser.is_active }
            });
            setConfirmToggleStatusUser(null);
        } catch {
            // Handled in mutation
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl">
                <span className="loading loading-spinner loading-lg text-emerald-700"></span>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mt-4">Syncing Official Directory...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-8">
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-8 text-center font-semibold text-xs shadow-xs">
                    Failed to load official registry. Please refresh the page.
                </div>
            </div>
        );
    }

    const officials = data?.results || [];
    const count = data?.count || 0;

    const officialColumns = [
        {
            header: "Official Account",
            render: (official) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                        <Shield size={18} className="text-emerald-700" />
                    </div>
                    <div>
                        <p className="text-xs sm:text-sm font-semibold text-stone-900 uppercase">
                            {official.first_name} {official.last_name}
                        </p>
                        <p className="text-[11px] font-mono text-stone-400 mt-0.5">
                            @{official.username}
                        </p>
                    </div>
                </div>
            )
        },
        {
            header: "Phone & Address",
            render: (official) => (
                <div className="space-y-0.5">
                    <p className="text-xs font-medium text-stone-700 flex items-center gap-1.5">
                        <Phone size={12} className="text-stone-400" />
                        {official.phone_no || 'No phone listed'}
                    </p>
                    <p className="text-[11px] text-stone-500 font-normal truncate max-w-xs">
                        {official.address || 'No address listed'}
                    </p>
                </div>
            )
        },
        {
            header: "Assigned Barangay",
            render: (official) => (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                    <MapPin size={12} className="text-emerald-700 shrink-0" />
                    <span className="uppercase">{official.barangay_name || 'Unassigned'}</span>
                </span>
            )
        },
        {
            header: "Status",
            align: "center",
            render: (official) => (
                <button
                    type="button"
                    onClick={() => toggleActiveStatus(official)}
                    className={`btn-tactile px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-md border transition-all inline-flex items-center gap-1.5
                        ${official.is_active 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-red-50 hover:text-red-700 hover:border-red-200' 
                            : 'bg-red-50 text-red-700 border-red-200/80 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200'
                        }`}
                >
                    {official.is_active ? (
                        <>
                            <UserCheck size={13} /> Active
                        </>
                    ) : (
                        <>
                            <UserX size={13} /> Deactivated
                        </>
                    )}
                </button>
            )
        },
        {
            header: "Actions",
            align: "right",
            headerClassName: "pr-8",
            className: "pr-8",
            render: (official) => (
                <div className="flex items-center gap-2 justify-end">
                    <button
                        type="button"
                        onClick={() => setEditUser(official)}
                        className="btn-tactile bg-stone-100 hover:bg-stone-200/80 text-stone-700 hover:text-stone-900 border border-stone-200 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                    >
                        <Edit size={13} /> Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteOfficial(official)}
                        disabled={deleteMutation.isPending}
                        className="btn-tactile bg-red-50 hover:bg-red-100/80 text-red-700 border border-red-200 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {deleteMutation.isPending ? (
                            <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                            <Trash2 size={13} />
                        )}
                        Delete
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 bg-stone-50/40 min-h-screen font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-stone-200 pb-6 gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Municipal Agriculture Office</span>
                        <span className="text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200/70">
                            LGU Directory
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Barangay Officials</h1>
                    <p className="text-sm text-stone-500 font-normal">Manage and assign Barangay Officials to track localized swine surveys and endorsements.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="btn-tactile bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2.5 text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-2"
                >
                    <UserPlus size={16} /> Register Official
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search name, phone, address..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full h-10 pl-9 pr-10 border border-stone-200 text-xs font-medium bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 rounded-lg placeholder:text-stone-400 transition-all"
                    />
                    {isFetching && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 loading loading-spinner loading-xs text-emerald-700"></span>
                    )}
                </div>
                <div className="text-xs font-medium text-stone-500">
                    Showing <span className="font-semibold text-stone-800">{officials.length}</span> of <span className="font-semibold text-stone-800">{count}</span> Officials
                </div>
            </div>

            {/* Officials Table */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                <DataTable
                    columns={officialColumns}
                    data={officials}
                    minWidth="800px"
                    className="border-0"
                    emptyState={{
                        icon: Users,
                        title: "No registered officials found",
                        description: "Try adjusting search filters or adding a new barangay official."
                    }}
                    pagination={count > limit ? {
                        count,
                        limit,
                        offset,
                        onPageChange: setOffset
                    } : null}
                />
            </div>

            {/* Create Official Modal */}
            {isCreateOpen && (
                <OfficialFormModal 
                    onClose={() => setIsCreateOpen(false)}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isSubmitting={createMutation.isPending}
                    barangays={barangays}
                />
            )}

            {/* Edit Official Modal */}
            {editUser && (
                <OfficialFormModal 
                    user={editUser}
                    onClose={() => setEditUser(null)}
                    onSubmit={(data) => updateMutation.mutate({ id: editUser.id, data })}
                    isSubmitting={updateMutation.isPending}
                    barangays={barangays}
                />
            )}

            {/* Custom Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!confirmDeleteUser}
                onClose={() => setConfirmDeleteUser(null)}
                onYes={executeDelete}
                title="Permanently Delete Official?"
                message={confirmDeleteUser ? `Are you sure you want to PERMANENTLY delete the account of ${confirmDeleteUser.first_name} ${confirmDeleteUser.last_name}? They will no longer be able to submit hog surveys.` : ""}
                yesText="Permanently Delete"
                yesVariant="danger"
                type="danger"
                isSubmitting={deleteMutation.isPending}
            />

            {/* Custom Status Toggle Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!confirmToggleStatusUser}
                onClose={() => setConfirmToggleStatusUser(null)}
                onYes={executeToggleStatus}
                title="Confirm Account Status Change"
                message={confirmToggleStatusUser ? `Are you sure you want to ${confirmToggleStatusUser.is_active ? 'deactivate' : 'activate'} the account of ${confirmToggleStatusUser.first_name} ${confirmToggleStatusUser.last_name}?` : ""}
                yesText={confirmToggleStatusUser?.is_active ? "Deactivate" : "Activate"}
                yesVariant={confirmToggleStatusUser?.is_active ? "danger" : "success"}
                type={confirmToggleStatusUser?.is_active ? "warning" : "help"}
                isSubmitting={updateMutation.isPending}
            />
        </div>
    );
};

/**
 * Reusable Official Form Modal for Registration & Edit Details
 */
const OfficialFormModal = ({ user, onClose, onSubmit, isSubmitting, barangays }) => {
    const isEdit = !!user;
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            username: user?.username || '',
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            phone_no: user?.phone_no || '',
            address: user?.address || '',
            barangay: user?.barangay || '',
            receive_sms: user?.receive_sms !== undefined ? user.receive_sms : true,
            is_active: user?.is_active !== undefined ? user.is_active : true,
        }
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
            <div className="bg-white w-full max-w-xl border border-stone-200 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col modal-enter">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-200 bg-stone-50/70 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100">
                            <Users size={16} />
                        </div>
                        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                            {isEdit ? "Update Official Profile" : "Register Barangay Official"}
                        </h3>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        disabled={isSubmitting} 
                        className="btn-tactile text-stone-400 hover:text-stone-700 p-1.5 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Username */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Username / Account ID</label>
                            <input
                                type="text"
                                {...register('username', { required: "Username is required." })}
                                disabled={isSubmitting}
                                className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-xs font-medium text-stone-900 placeholder:text-stone-400 transition-all"
                                placeholder="barangay_official"
                            />
                            {errors.username && <p className="text-[10px] font-semibold text-red-600">{errors.username.message}</p>}
                        </div>

                        {/* Password (only if registering) */}
                        {!isEdit && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Account Password</label>
                                <input
                                    type="password"
                                    {...register('password', { required: "Password is required for new accounts." })}
                                    disabled={isSubmitting}
                                    className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-xs font-medium text-stone-900 placeholder:text-stone-400 transition-all"
                                    placeholder="••••••••"
                                />
                                {errors.password && <p className="text-[10px] font-semibold text-red-600">{errors.password.message}</p>}
                            </div>
                        )}
                        
                        {/* First Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">First Name</label>
                            <input
                                type="text"
                                {...register('first_name', { required: "First name is required." })}
                                disabled={isSubmitting}
                                className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-xs font-medium text-stone-900 placeholder:text-stone-400 transition-all"
                                placeholder="Pedro"
                            />
                            {errors.first_name && <p className="text-[10px] font-semibold text-red-600">{errors.first_name.message}</p>}
                        </div>

                        {/* Last Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Last Name</label>
                            <input
                                type="text"
                                {...register('last_name', { required: "Last name is required." })}
                                disabled={isSubmitting}
                                className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-xs font-medium text-stone-900 placeholder:text-stone-400 transition-all"
                                placeholder="Sanchez"
                            />
                            {errors.last_name && <p className="text-[10px] font-semibold text-red-600">{errors.last_name.message}</p>}
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Contact Number</label>
                            <input
                                type="text"
                                {...register('phone_no', { 
                                    required: "Phone number is required.",
                                    pattern: {
                                        value: /^(?:\+639|639|09)\d{9}$/,
                                        message: "Please enter a valid mobile number (e.g. 09171234567)."
                                    }
                                })}
                                disabled={isSubmitting}
                                className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-xs font-medium text-stone-900 placeholder:text-stone-400 transition-all"
                                placeholder="09171234567"
                            />
                            {errors.phone_no && <p className="text-[10px] font-semibold text-red-600">{errors.phone_no.message}</p>}
                        </div>

                        {/* Assigned Barangay Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Assign to Barangay</label>
                            <select
                                {...register('barangay', { required: "Selecting a barangay is required." })}
                                disabled={isSubmitting}
                                className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-xs font-medium text-stone-900 cursor-pointer transition-all"
                            >
                                <option value="">Select Barangay</option>
                                {barangays.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            {errors.barangay && <p className="text-[10px] font-semibold text-red-600">{errors.barangay.message}</p>}
                        </div>

                        {/* Address */}
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Complete Address</label>
                            <input
                                type="text"
                                {...register('address', { required: "Complete address is required." })}
                                disabled={isSubmitting}
                                className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-xs font-medium text-stone-900 placeholder:text-stone-400 transition-all"
                                placeholder="Barangay Hall, Sariaya, Quezon"
                            />
                            {errors.address && <p className="text-[10px] font-semibold text-red-600">{errors.address.message}</p>}
                        </div>

                        {/* Options */}
                        <div className="sm:col-span-2 flex flex-col gap-2.5 py-2 border-t border-stone-100 mt-1">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    {...register('receive_sms')}
                                    disabled={isSubmitting}
                                    className="checkbox checkbox-success checkbox-sm rounded border-stone-300"
                                />
                                <span className="text-xs font-medium text-stone-700">Send SMS notifications to this official</span>
                            </label>

                            {isEdit && (
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        {...register('is_active')}
                                        disabled={isSubmitting}
                                        className="checkbox checkbox-success checkbox-sm rounded border-stone-300"
                                    />
                                    <span className="text-xs font-medium text-stone-700">Official account is active and authorized</span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex gap-3 justify-end pt-5 border-t border-stone-100 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="btn-tactile px-5 py-2.5 border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 rounded-lg transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-tactile bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-100 text-white px-6 py-2.5 text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check size={14} /> {isEdit ? "Save Profile" : "Register Official"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BarangayOfficialManagementPage;
