import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";



export const useGetNotification = (limit = 10, offset = 0) => {
    return useQuery({
        queryKey: ['notification', limit, offset],
        queryFn: async () => {
            const res = await api.get('/notification/', {
                params: { limit, offset }
            })
            return res.data
        }
    })
}