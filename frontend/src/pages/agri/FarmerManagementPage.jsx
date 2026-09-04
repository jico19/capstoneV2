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
    User,
    UserCheck,
    UserX,
    MapPin,
    Phone,
    Trash2,
    AlertCircle,
    ShieldCheck,
    Clock,
    CheckCircle2,
    ExternalLink, 
    FileText, 
    FileCheck,
    Eye
} from 'lucide-react';
import Pagination from '../../components/ui/Pagination';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { parseValidationError } from '../../lib/utils';
import FileViewerModal from '../../components/ui/FileViewerModal';


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
    const [statusFilter, setStatusFilter] = useState("");
    
    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
    const [confirmToggleStatusUser, setConfirmToggleStatusUser] = useState(null);
    const [reviewingFarmer, setReviewingFarmer] = useState(null);

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
        queryKey: ['farmers', limit, offset, searchQuery, statusFilter],
        queryFn: async () => {
            const params = { limit, offset, search: searchQuery, role: 'Farmer' };
            if (statusFilter) {
                params.verification_status = statusFilter;
            }
            const res = await api.get('/user/', { params });
            return res.data;
        }
    });

    // Mutation: Verify/Reject farmer KYC documents
    const verifyMutation = useMutation({
        mutationFn: async ({ id, action, remarks, document_updates }) => {
            const res = await api.post(`/user/${id}/verify_documents/`, { action, remarks, document_updates });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.msg || "Farmer verification status updated.");
            queryClient.invalidateQueries({ queryKey: ['farmers'] });
            setReviewingFarmer(null);
        },
        onError: (err) => {
            console.error(err);
            const detail = parseValidationError(err, "Failed to update verification status.");
            toast.error(detail);
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
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
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
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setOffset(0);
                        }}
                        className="border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 focus:outline-none focus:border-stone-500 rounded-none"
                    >
                        <option value="">All KYC Statuses</option>
                        <option value="PENDING_REVIEW">Pending Review</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="UNVERIFIED">Unverified</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                    Showing {farmers.length} of {count} Farmers
                </div>
            </div>

            {/* Farmers Table */}
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
                                                    onClick={() => setReviewingFarmer(farmer)}
                                                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 border ${
                                                        farmer.verification_status === 'PENDING_REVIEW'
                                                            ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700 shadow-sm'
                                                            : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                                                    }`}
                                                >
                                                    <ShieldCheck size={13} /> Review Docs
                                                </button>
                                                <button
                                                    onClick={() => setEditUser(farmer)}
                                                    className="bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5"
                                                >
                                                    <Edit size={12} /> Edit Details
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteFarmer(farmer)}
                                                    disabled={deleteMutation.isPending}
                                                    className="bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 disabled:opacity-50"
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
                onYes={executeDelete}
                title="Permanently Delete Account?"
                message={confirmDeleteUser ? `Are you sure you want to PERMANENTLY delete the account of ${confirmDeleteUser.first_name} ${confirmDeleteUser.last_name}? This action is irreversible and might affect their existing permit applications.` : ""}
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

            {/* KYC Document Review Modal */}
            {reviewingFarmer && (
                <DocumentReviewModal
                    farmer={reviewingFarmer}
                    onClose={() => setReviewingFarmer(null)}
                    onApprove={(remarks, docUpdates) => verifyMutation.mutate({ id: reviewingFarmer.id, action: 'approve', remarks, document_updates: docUpdates })}
                    onReject={(remarks) => verifyMutation.mutate({ id: reviewingFarmer.id, action: 'reject', remarks })}
                    isSubmitting={verifyMutation.isPending}
                />
            )}
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
 * KYC Document Review Modal for MAO Officers
 */
const DocumentReviewModal = ({ farmer, onClose, onApprove, onReject, isSubmitting }) => {
    const [remarks, setRemarks] = useState(farmer.verification_remarks || "");
    const [previewDoc, setPreviewDoc] = useState(null);
    const docs = farmer.farmer_documents || [];


    // Local state for editable document details (license_number, expiration_date)
    const [docEdits, setDocEdits] = useState(() => {
        const initial = {};
        docs.forEach((d) => {
            initial[d.document_type] = {
                license_number: d.license_number || "",
                expiration_date: d.expiration_date || "",
            };
        });
        return initial;
    });

    const handleEditChange = (dtype, field, val) => {
        setDocEdits((prev) => ({
            ...prev,
            [dtype]: {
                ...prev[dtype],
                [field]: val,
            },
        }));
    };

    const docLabels = {
        handlers_license: "Handler's License (BAI)",
        transport_carrier_reg: "Transport License / Vehicle OR-CR",
        traders_pass: "Trader's Pass (LGU)",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
            <div className="bg-white border-2 border-stone-800 max-w-3xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start border-b border-stone-200 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">KYC Document Review</span>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-stone-100 text-stone-700">
                                {farmer.verification_status || 'UNVERIFIED'}
                            </span>
                        </div>
                        <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight mt-1">
                            {farmer.first_name} {farmer.last_name}
                        </h2>
                        <p className="text-xs text-stone-500 font-mono">@{farmer.username} • {farmer.phone_no} • {farmer.barangay_name || 'No Barangay'}</p>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1">
                        <X size={20} />
                    </button>
                </div>

                {/* Document Cards */}
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">Submitted Standing Documents & OCR Data</p>
                    
                    {['handlers_license', 'transport_carrier_reg', 'traders_pass'].map((dtype) => {
                        const doc = docs.find((d) => d.document_type === dtype);
                        const edit = docEdits[dtype] || {};

                        return (
                            <div key={dtype} className="p-4 border border-stone-200 bg-stone-50 space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-stone-800 text-xs">{docLabels[dtype]}</h4>
                                        {doc ? (
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-green-100 text-green-800">
                                                On File
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-red-100 text-red-700">
                                                Missing
                                            </span>
                                        )}
                                        {doc?.ocr_status === 'PROCESSED' && (
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-blue-100 text-blue-800">
                                                OCR Verified
                                            </span>
                                        )}
                                    </div>

                                    {doc?.file ? (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDoc({
                                                url: doc.file,
                                                title: `${docLabels[dtype]} - ${farmer.first_name} ${farmer.last_name}`,
                                                subtitle: edit.license_number ? `Extracted License: ${edit.license_number}` : undefined
                                            })}
                                            className="px-3 py-1 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Eye size={12} className="text-green-700" /> View Document
                                        </button>
                                    ) : (
                                        <span className="text-[10px] text-stone-400 italic font-medium">No file attached</span>
                                    )}

                                </div>

                                {/* Editable Fields: License No & Expiry Date */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200/60">
                                    <div>
                                        <label className="block text-[9px] font-black text-stone-500 uppercase tracking-wider mb-1">
                                            License / Pass / Reg No.
                                        </label>
                                        <input
                                            type="text"
                                            value={edit.license_number || ""}
                                            onChange={(e) => handleEditChange(dtype, "license_number", e.target.value)}
                                            placeholder="License number..."
                                            className="w-full bg-white border border-stone-300 text-stone-800 text-xs px-2.5 py-1.5 focus:outline-none focus:border-stone-800 font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black text-stone-500 uppercase tracking-wider mb-1">
                                            Expiration Date
                                        </label>
                                        <input
                                            type="date"
                                            value={edit.expiration_date || ""}
                                            onChange={(e) => handleEditChange(dtype, "expiration_date", e.target.value)}
                                            className="w-full bg-white border border-stone-300 text-stone-800 text-xs px-2.5 py-1.5 focus:outline-none focus:border-stone-800"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Remarks / Rejection Reason */}
                <div className="space-y-2 pt-2 border-t border-stone-200">
                    <label className="block text-[10px] font-black text-stone-600 uppercase tracking-widest">
                        Validation Remarks / Rejection Reason
                    </label>
                    <textarea
                        rows={2}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter feedback or rejection reason for the farmer (sent via SMS/notification)..."
                        className="w-full border border-stone-300 text-xs p-3 rounded-none focus:outline-none focus:border-stone-800 bg-white"
                    />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-stone-200">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 border border-stone-300 text-stone-700 text-xs font-black uppercase tracking-widest hover:bg-stone-100"
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        onClick={() => onReject(remarks)}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                    >
                        <X size={14} /> Reject with Remarks
                    </button>

                    <button
                        type="button"
                        onClick={() => onApprove(remarks, docEdits)}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-green-700 hover:bg-green-600 text-white text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-green-700/20"
                    >
                        <Check size={14} /> Approve & Save Verification
                    </button>
                </div>

                {/* Built-in Document Viewer Modal */}
                <FileViewerModal
                    isOpen={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    fileUrl={previewDoc?.url}
                    title={previewDoc?.title}
                    subtitle={previewDoc?.subtitle}
                />
            </div>
        </div>
    );
};



export default FarmerManagementPage;
