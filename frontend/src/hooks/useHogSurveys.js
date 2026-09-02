import { downloadBlob } from '../lib/utils';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "../lib/api";

// 1. Get all surveys
export const useGetSurveys = (limit = 100, offset = 0) => {
    return useQuery({
        queryKey: ['hog-surveys', limit, offset],
        queryFn: async () => {
            const res = await api.get('/hog-survey/', {
                params: { limit, offset }
            });
            return res.data;
        },
        placeholderData: keepPreviousData,
    });
};

// 2. Add new survey
export const useCreateSurvey = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/hog-survey/', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hog-surveys'] });
            queryClient.invalidateQueries({ queryKey: ['hog-survey'] }); // Invalidate map data too
        }
    });
};

// 3. Update survey
export const useUpdateSurvey = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await api.patch(`/hog-survey/${id}/`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hog-surveys'] });
            queryClient.invalidateQueries({ queryKey: ['hog-survey'] });
        }
    });
};

// 4. Delete survey
export const useDeleteSurvey = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            await api.delete(`/hog-survey/${id}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hog-surveys'] });
            queryClient.invalidateQueries({ queryKey: ['hog-survey'] });
        }
    });
};

// 5. Export CSV
export const useExportHogSurveyCsv = () => {
    return useMutation({
        mutationFn: async (params) => {
            const res = await api.get('/hog-survey/export_csv/', {
                params,
                responseType: 'blob'
            });
            downloadBlob(res.data, `Sariaya_Hog_Population_${params?.start_date || 'ALL'}.csv`);
        }
    });
};
