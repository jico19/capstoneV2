import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";



export const useGetNotification = () => {
    return useQuery({
        queryKey: ['notification'],
        queryFn: async () => {
            const res = await api.get('/notification/')
            return res.data
        }
    })
}