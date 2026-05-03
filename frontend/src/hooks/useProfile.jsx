import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";

// Hook for fetching and updating user profile data.
export const useProfile = (userId) => {
    const queryClient = useQueryClient();

    // Fetch full profile details
    const profileQuery = useQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
            const res = await api.get(`/user/${userId}/`);
            return res.data;
        },
        enabled: !!userId,
    });

    // Update profile details
    const updateProfileMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await api.patch(`/user/${userId}/`, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', userId] });
            toast.success("Profile Updated", {
                description: "Your changes have been saved successfully."
            });
        },
        onError: (error) => {
            console.error("Update failed:", error);
            toast.error("Update Failed", {
                description: "We couldn't save your changes. Please check the fields."
            });
        }
    });

    return {
        profile: profileQuery.data,
        isLoading: profileQuery.isLoading,
        isError: profileQuery.isError,
        updateProfile: updateProfileMutation.mutate,
        isUpdating: updateProfileMutation.isPending,
    };
};
