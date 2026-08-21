import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useGetAgriDashboard = () => {
    return useQuery({
        queryKey: ['agri_metrics'],
        queryFn: async () => {
            const res = await api.get('/dashboard/agri-metrics/')
            return res.data
        }
    })
}

export const useGetFarmerDashboard = () => {
    return useQuery({
        queryKey: ['farmer_metrics'],
        queryFn: async () => {
            const res = await api.get('/dashboard/farmer-metrics/')
            return res.data
        }
    })
}

export const useGetOPVDashboard = () => {
    return useQuery({
        queryKey: ['opv_metrics'],
        queryFn: async () => {
            const res = await api.get('/dashboard/opv-metrics/')
            return res.data
        }
    })
}

export const useGetInspectorDashboard = () => {
    return useQuery({
        queryKey: ['inspector_metrics'],
        queryFn: async () => {
            const res = await api.get('/dashboard/inspector-metrics/')
            return res.data
        }
    })
}

export const useGetOPVAnalytics = () => {
    return useQuery({
        queryKey: ['opv_analytics'],
        queryFn: async () => {
            const res = await api.get('/dashboard/opv-analytics/')
            return res.data
        }
    })
}

export const useGetDashboardInsights = (role) => {
    return useQuery({
        queryKey: ['dashboard_insights', role],
        queryFn: async () => {
            const params = role ? { role } : {};
            const res = await api.get('/dashboard/insights/', { params });
            return res.data;
        },
        staleTime: 1000 * 60 * 30, // 30 mins client-side cache
    });
};

export const useRefreshDashboardInsights = (role) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const res = await api.post('/dashboard/insights/refresh/', { role });
            return res.data;
        },
        onSuccess: (newData) => {
            queryClient.setQueryData(['dashboard_insights', role], newData);
            queryClient.invalidateQueries({ queryKey: ['dashboard_insights'] });
        }
    });
};
