import { downloadBlob } from '../lib/utils';
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";



export const usePayment = (limit = 10, offset = 0) => {
    const query = useQuery({
        queryKey: ['payment', limit, offset],
        queryFn: async () => {
            const res = await api.get('/payment/', {
                params: { limit, offset }
            })
            return res.data
        }
    })

    const generateReport = useMutation({
        mutationFn: async ({ start_date, end_date }) => {
            const res = await api.get('/payment/generate_report/', {
                params: { start_date, end_date },
                responseType: 'blob'
            })
            return { data: res.data, start_date, end_date }
        },
        onSuccess: ({ data, start_date, end_date }) => {
            downloadBlob(data, `COLLECTION_REPORT_${start_date}_to_${end_date}.pdf`);
        }
    })

    return {
        ...query,
        generateReport
    }
}