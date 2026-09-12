import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useGetMaps } from '../../hooks/useMaps';
import { Search, UserPlus } from 'lucide-react';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { toast } from 'sonner';
import { parseValidationError } from '../../lib/utils';
import FarmerFormModal from './FarmerFormModal';
import DocumentReviewModal from './DocumentReviewModal';
import FarmersTable from './FarmersTable';


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
        } catch {
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
        } catch {
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
            <FarmersTable
                farmers={farmers}
                count={count}
                limit={limit}
                offset={offset}
                onOffsetChange={setOffset}
                onReview={setReviewingFarmer}
                onEdit={setEditUser}
                onDelete={handleDeleteFarmer}
                onToggleStatus={toggleActiveStatus}
                isDeleting={deleteMutation.isPending}
            />

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

export default FarmerManagementPage;