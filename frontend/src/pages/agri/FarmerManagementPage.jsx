import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '/src/lib/api';
import { useGetMaps } from '/src/hooks/useMaps';
import { 
    Users, 
    Search, 
    UserPlus, 
    Edit, 
    Check, 
    X, 
    User,
    UserCheck,
    UserX,
    MapPin,
    Phone,
    Trash2,
    AlertCircle
} from 'lucide-react';
import Pagination from '../../components/ui/Pagination';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';

const parseValidationError = (err, fallback = "Action failed.") => {
    if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'object') {
            if (data.detail) return data.detail;
            const fieldErrors = Object.entries(data)
                .map(([field, errors]) => {
                    const fieldLabel = field.replace('_', ' ');
                    const errorMsg = Array.isArray(errors) ? errors[0] : errors;
                    return `${fieldLabel}: ${errorMsg}`;
                })
                .join(' | ');
            if (fieldErrors) return fieldErrors;
        } else if (typeof data === 'string') {
            return data;
        }
    }
    return err.message || fallback;
};

/**
 * Farmer Management Page
 * Municipal Agriculture Office (MAO) control panel to manage farmers.
 * Follows flat UI industrial aesthetic (stone colors, square borders, bold tracking).
 */
const FarmerManagementPage = () => {
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

    // Query for farmers (users with role='Farmer')
    const { data, isLoading, isError, isFetching } = useQuery({
        queryKey: ['farmers', limit, offset, searchQuery],
        queryFn: async () => {
            const res = await api.get('/user/', {
                params: { limit, offset, search: searchQuery }
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
                role: 'Farmer',
                is_active: true
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success("Farmer account created successfully.");
            queryClient.invalidateQueries({ queryKey: ['farmers'] });
            setIsCreateOpen(false);
        },
        onError: (err) => {
            console.error(err);
            const detail = parseValidationError(err, "Could not create farmer account.");
            toast.error(detail);
        }
    });

    // Mutation: Update user (including active/inactive status)
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await api.patch(`/user/${id}/`, data);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Farmer registry updated.");
            queryClient.invalidateQueries({ queryKey: ['farmers'] });
            setEditUser(null);
        },
        onError: (err) => {
            console.error(err);
            const detail = parseValidationError(err, "Could not update farmer account.");
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
            toast.success("Farmer account permanently deleted.");
            queryClient.invalidateQueries({ queryKey: ['farmers'] });
        },
        onError: (err) => {
            console.error(err);
            const detail = parseValidationError(err, "Could not delete farmer account.");
            toast.error(detail);
        }
    });

    const handleDeleteFarmer = (farmer) => {
        setConfirmDeleteUser(farmer);
    };

    const executeDelete = async () => {
        if (!confirmDeleteUser) return;
        try {
            await deleteMutation.mutateAsync(confirmDeleteUser.id);
            setConfirmDeleteUser(null);
        } catch (error) {
            // Handled in mutation
        }
    };

    const toggleActiveStatus = (farmer) => {
        setConfirmToggleStatusUser(farmer);
    };

    const executeToggleStatus = async () => {
        if (!confirmToggleStatusUser) return;
        try {
            await updateMutation.mutateAsync({
                id: confirmToggleStatusUser.id,
                data: { is_active: !confirmToggleStatusUser.is_active }
            });
            setConfirmToggleStatusUser(null);
        } catch (error) {
            // Handled in mutation
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Syncing Farmer Directory...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-8">
                <div className="bg-red-50 text-red-600 border border-red-100 p-8 text-center font-black uppercase tracking-widest text-xs">
                    Failed to load farmer registry. Please refresh the page.
                </div>
            </div>
        );
    }

    const farmers = data?.results || [];
    const count = data?.count || 0;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-white min-h-screen font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-stone-100 pb-8 gap-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Municipal Agriculture Office</p>
                    <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter leading-none">Farmer Directory</h1>
                    <p className="text-sm text-stone-500 font-medium">Manage and audit swine owners in Sariaya</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-stone-900 hover:bg-stone-800 text-white px-6 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center gap-2"
                >
                    <UserPlus size={16} /> Register New Farmer
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search name, phone, address..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-stone-200 text-xs font-semibold bg-white focus:outline-none focus:border-stone-500 rounded-none placeholder:text-stone-300 transition-colors"
                    />
                    {isFetching && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 loading loading-spinner loading-xs text-stone-400"></span>
                    )}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                    Showing {farmers.length} of {count} Farmers
                </div>
            </div>

            {/* Farmers Table */}
            <div className="border border-stone-200 bg-white">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-500">
                            <tr>
                                <th className="px-6 py-5">Farmer Account</th>
                                <th className="px-6 py-5">Phone & Address</th>
                                <th className="px-6 py-5">Location</th>
                                <th className="px-6 py-5 text-center">Status</th>
                                <th className="px-6 py-5 text-right pr-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {farmers.length === 0 ? (
                                <tr>
                                    <td colSpan="5">
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
                                        {/* Status */}
                                        <td className="px-6 py-5 text-center">
                                            <button
                                                onClick={() => toggleActiveStatus(farmer)}
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
                                                    onClick={() => setEditUser(farmer)}
                                                    className="bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                                                >
                                                    <Edit size={12} /> Edit Details
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteFarmer(farmer)}
                                                    disabled={deleteMutation.isPending}
                                                    className="bg-white border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {deleteMutation.isPending ? (
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
                        onPageChange={setOffset} 
                    />
                )}
            </div>

            {/* Create Farmer Modal */}
            {isCreateOpen && (
                <FarmerFormModal 
                    onClose={() => setIsCreateOpen(false)}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isSubmitting={createMutation.isPending}
                    barangays={barangays}
                />
            )}

            {/* Edit Farmer Modal */}
            {editUser && (
                <FarmerFormModal 
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
                onConfirm={executeDelete}
                title="Permanently Delete Account?"
                message={confirmDeleteUser ? `Are you sure you want to PERMANENTLY delete the account of ${confirmDeleteUser.first_name} ${confirmDeleteUser.last_name}? This action is irreversible and might affect their existing permit applications.` : ""}
                confirmText="Permanently Delete"
                confirmButtonClass="bg-red-600 hover:bg-red-700"
                isSubmitting={deleteMutation.isPending}
            />

            {/* Custom Status Toggle Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!confirmToggleStatusUser}
                onClose={() => setConfirmToggleStatusUser(null)}
                onConfirm={executeToggleStatus}
                title="Confirm Account Status Change"
                message={confirmToggleStatusUser ? `Are you sure you want to ${confirmToggleStatusUser.is_active ? 'deactivate' : 'activate'} the account of ${confirmToggleStatusUser.first_name} ${confirmToggleStatusUser.last_name}?` : ""}
                confirmText={confirmToggleStatusUser?.is_active ? "Deactivate" : "Activate"}
                confirmButtonClass={confirmToggleStatusUser?.is_active ? "bg-red-600 hover:bg-red-700" : "bg-green-700 hover:bg-green-600"}
                isSubmitting={updateMutation.isPending}
            />
        </div>
    );
};

/**
 * Reusable Farmer Form Modal for Registration & Edit Details
 */
const FarmerFormModal = ({ user, onClose, onSubmit, isSubmitting, barangays }) => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-xl border border-stone-200 shadow-2xl rounded-none overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <Users size={18} className="text-stone-700" />
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest">
                            {isEdit ? "Update Farmer Profile" : "Register Swine Owner"}
                        </h3>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Username */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Username / Account ID</label>
                            <input
                                type="text"
                                {...register('username', { required: "Username is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                placeholder="john_doe"
                            />
                            {errors.username && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.username.message}</p>}
                        </div>

                        {/* Password (only if registering) */}
                        {!isEdit && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Account Password</label>
                                <input
                                    type="password"
                                    {...register('password', { required: "Password is required for new accounts." })}
                                    disabled={isSubmitting}
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                    placeholder="••••••••"
                                />
                                {errors.password && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.password.message}</p>}
                            </div>
                        )}
                        
                        {/* First Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">First Name</label>
                            <input
                                type="text"
                                {...register('first_name', { required: "First name is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                placeholder="Juan"
                            />
                            {errors.first_name && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.first_name.message}</p>}
                        </div>

                        {/* Last Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Last Name</label>
                            <input
                                type="text"
                                {...register('last_name', { required: "Last name is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                placeholder="Dela Cruz"
                            />
                            {errors.last_name && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.last_name.message}</p>}
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Contact Number</label>
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
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                placeholder="09171234567"
                            />
                            {errors.phone_no && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.phone_no.message}</p>}
                        </div>

                        {/* Barangay Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Barangay</label>
                            <select
                                {...register('barangay', { required: "Selecting a barangay is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold text-stone-800 cursor-pointer"
                            >
                                <option value="">Select Barangay</option>
                                {barangays.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            {errors.barangay && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.barangay.message}</p>}
                        </div>

                        {/* Address */}
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Complete Address</label>
                            <input
                                type="text"
                                {...register('address', { required: "Complete address is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                placeholder="Purok 4, Sariaya, Quezon"
                            />
                            {errors.address && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.address.message}</p>}
                        </div>

                        {/* Options */}
                        <div className="sm:col-span-2 flex flex-col gap-3 py-2 border-t border-stone-100 mt-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    {...register('receive_sms')}
                                    disabled={isSubmitting}
                                    className="checkbox checkbox-success checkbox-sm rounded-none border-stone-300"
                                />
                                <span className="text-[10px] font-black uppercase tracking-wider text-stone-600">Send SMS notifications to this farmer</span>
                            </label>

                            {isEdit && (
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        {...register('is_active')}
                                        disabled={isSubmitting}
                                        className="checkbox checkbox-success checkbox-sm rounded-none border-stone-300"
                                    />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-600">Farmer account is active and authorized</span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex gap-4 justify-end pt-6 border-t border-stone-100 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-6 py-3 border border-stone-200 hover:bg-stone-50 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-green-700 hover:bg-green-600 disabled:bg-stone-100 text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check size={14} /> {isEdit ? "Save Profile" : "Register Owner"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * Reusable Custom Flat UI Confirmation Modal
 */
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", confirmButtonClass = "bg-green-700 hover:bg-green-600", isSubmitting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md border border-stone-200 shadow-2xl rounded-none overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={18} className="text-red-600 shrink-0" />
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest">{title}</h3>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <p className="text-xs font-bold text-stone-600 leading-relaxed uppercase tracking-wider">
                        {message}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-4 justify-end pt-4 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-6 py-3 border border-stone-200 hover:bg-stone-50 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className={`${confirmButtonClass} text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Processing...
                                </>
                            ) : (
                                confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FarmerManagementPage;
