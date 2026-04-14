import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";



export const usePayment = () => {
    return useQuery({
        queryKey: ['payment'],
        queryFn: async () => {
            const res = await api.get('/payment/')
            return res.data
        }
    })
}