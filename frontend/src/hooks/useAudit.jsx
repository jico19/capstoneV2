import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useGetAuditTrail = (limit = 10, offset = 0) => {
    return useQuery({
        queryKey: ['audit-trail', limit, offset],
        queryFn: async () => {
            const res = await api.get('/audit-trail/', {
                params: { limit, offset }
            })
            return res.data
        }
    })
}