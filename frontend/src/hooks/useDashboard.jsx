import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useGetAgriDashboard = () => {
    return useQuery({
        queryKey: ['agri_metrics'],
        queryFn: async () => {
            const res = await api.get('/agri-metrics/')
            return res.data
        }
    })
}