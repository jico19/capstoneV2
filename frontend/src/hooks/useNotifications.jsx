import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";


export const useGetNotification = (limit = 10, offset = 0, filter = 'ALL') => {
    return useQuery({
        queryKey: ['notification', limit, offset, filter],
        queryFn: async () => {
            const params = { limit, offset };
            if (filter === 'UNREAD') {
                params.is_read = 'false';
            } else if (filter === 'READ') {
                params.is_read = 'true';
            }
            const res = await api.get('/notification/', {
                params
            })
            return res.data
        },
        staleTime: 1000 * 60 * 10
    })
}

// Hook to fetch unread notification count.
export const useGetUnreadNotificationCount = () => {
    return useQuery({
        queryKey: ['notification', 'unread_count'],
        queryFn: async () => {
            const res = await api.get('/notification/unread_count/')
            return res.data.unread_count
        },
        staleTime: 1000 * 30, // Refetch every 30 seconds to keep badge fresh
        refetchInterval: 1000 * 30
    })
}

// Hook to fetch unread notification counts grouped by section
export const useGetSectionNotificationCounts = () => {
    return useQuery({
        queryKey: ['notification', 'section_counts'],
        queryFn: async () => {
            const res = await api.get('/notification/section_counts/');
            return res.data || {};
        },
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 30,
    });
};

// Hook to mark all unread notifications in a specific section as read
export const useMarkSectionRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (section) => {
            const res = await api.post('/notification/mark_section_read/', { section });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification'] });
        },
    });
};