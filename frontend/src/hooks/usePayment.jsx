import { downloadBlob } from '../lib/utils';
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";



export const usePayment = (limit = 10, offset = 0, { search = '', method = '', status = '', startDate = '', endDate = '' } = {}) => {
    const query = useQuery({
        queryKey: ['payment', limit, offset, search, method, status, startDate, endDate],
        queryFn: async () => {
            const params = { limit, offset };
            if (search) params.search = search;
            if (method && method !== 'ALL') params.method = method;
            if (status && status !== 'ALL') params.status = status;
            if (startDate && endDate) {
                params.start_date = startDate;
                params.end_date = endDate;
            }

            const res = await api.get('/payment/', { params });
            return res.data;
        },
        keepPreviousData: true,
    });

    const generateReport = useMutation({
        mutationFn: async ({ start_date, end_date }) => {
            const res = await api.get('/report/revenue-collection/pdf/', {
                params: { start_date, end_date },
                responseType: 'blob'
            });
            return { data: res.data, start_date, end_date };
        },
        onSuccess: ({ data, start_date, end_date }) => {
            downloadBlob(data, `LGU_MEMORANDUM_REVENUE_COLLECTION_${start_date}_to_${end_date}.pdf`);
        }
    });

    return {
        ...query,
        generateReport
    };
};

export const usePaymentStats = () => {
    return useQuery({
        queryKey: ['payment-stats'],
        queryFn: async () => {
            const res = await api.get('/payment/stats/');
            return res.data;
        },
        staleTime: 30000,
    });
};