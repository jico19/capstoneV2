import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";

export const useInspectorLogs = () => {
    const queryClient = useQueryClient();

    const logsQuery = useQuery({
        queryKey: ['inspector-logs'],
        queryFn: async () => {
            const res = await api.get('/inspector/');
            console.log(res.data)
            return res.data;
        }
    });

    const generateReport = useMutation({
        mutationFn: async ({ start_date, end_date }) => {
            const res = await api.get('/inspector/generate_report/', {
                params: { start_date, end_date },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `INSPECTOR_LOGS_${start_date}_to_${end_date}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
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
        onError: (error) => {
            console.error(error);
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
