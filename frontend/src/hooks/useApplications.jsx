import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useApplication = () => {
    return useQuery({
        queryKey: ['application'],
        queryFn: async () => {
            const res = await api.get('/application/')
            return res.data
        },
        staleTime: 1000 * 60 * 5, // treat data as fresh for 5 mins
    })
}

export const useApplicationDetail = (id) => {
    return useQuery({
        queryKey: ['application', id],
        queryFn: async () => {
            const res = await api.get(`/application/${id}/`)
            return res.data
        },
        enabled: !!id,
    })
}

export const useDocument = (id) => {
    return useQuery({
        queryKey: ['doc', id],
        queryFn: async () => {
            const res = await api.get(`document/${id}/`)
            return res.data
        },
        enabled: !!id,
    })
}

export const useOCRUpdate = (id) => {
    const query = useQueryClient()
    return useMutation({
        mutationFn: async (data) => {
            const res = await api.patch(`/ocr-validation/${id}/`, data)
            console.log(res.data)
            return res.data
        }, onSuccess: () => {
            query.invalidateQueries({ queryKey: ['application']})
        }
    })
}


