import { downloadBlob } from '../lib/utils';
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";

export const useInspectorLogs = (page = 1, limit = 5) => {
    const queryClient = useQueryClient();
    const offset = (page - 1) * limit;

    const logsQuery = useQuery({
        queryKey: ['inspector-logs', page, limit],
        queryFn: async () => {
            const res = await api.get('/inspector/', {
                params: { limit, offset }
            });
            return res.data;
        }
    });

    const generateReport = useMutation({
        mutationFn: async ({ start_date, end_date }) => {
            const res = await api.get('/inspector/generate_report/', {
                params: { start_date, end_date },
                responseType: 'blob'
            });
            downloadBlob(res.data, `INSPECTOR_LOGS_${start_date}_to_${end_date}.pdf`);
        },
        onSuccess: () => {
            toast.success("Report generated successfully.");
        },
        onError: () => {
            toast.error("Failed to generate report.");
        }
    });

    const createLog = useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/inspector/', data);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Inspection logged successfully.");
            queryClient.invalidateQueries({ queryKey: ['inspector-logs'] });
        },
        onError: () => {
            toast.error("Failed to log inspection.");
        }
    });

    return {
        logs: logsQuery.data,
        isLoading: logsQuery.isLoading,
        isError: logsQuery.isError,
        generateReport,
        createLog
    };
};
