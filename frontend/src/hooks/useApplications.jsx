import { useQueryClient, useMutation, useQuery, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";


export const useApplication = (limit = 10, offset = 0, status, search, options = {}) => {
    return useQuery({
        queryKey: ['application', limit, offset, status, search],
        queryFn: async () => {
            const res = await api.get('/application/', {
                params: { limit, offset, status, search }
            })
            return res.data
        },
        placeholderData: keepPreviousData,
        staleTime: 1000 * 15, // 15 seconds fresh
        refetchOnWindowFocus: true,
        ...options,
    })
}

export const useApplicationDetail = (id, options = {}) => {
    return useQuery({
        queryKey: ['application', id],
        queryFn: async () => {
            const res = await api.get(`/application/${id}/`)
            return res.data
        },
        enabled: !!id,
        staleTime: 1000 * 10,
        refetchOnWindowFocus: true,
        ...options,
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

export const useOCRUpdate = () => {
    const query = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await api.patch(`/ocr-validation/${id}/`, data)
            return res.data
        }, onSuccess: () => {
            toast.success('Successfully Updated.')
            query.invalidateQueries({ queryKey: ['application'] })
        }, onError: () => {
            toast.error("There is something wrong...")
        }
    })
}


export const useCreateApplication = () => {
    const query = useQueryClient()
    return useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/application/', data)
            return res.data
        }, onSuccess: () => {
            toast.success('Successfully submitted your application.')
            query.invalidateQueries({ queryKey: ['application'] })
            query.invalidateQueries({ queryKey: ['farmer_metrics'] })
            query.invalidateQueries({ queryKey: ['agri_metrics'] })
        }, onError: () => {
            toast.error("There is something wrong...")
        }
    })
}

export const useResubmitApplication = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, formData }) => {
            const res = await api.post(`/application/${id}/resubmit/`, formData)
            return res.data
        },
        onSuccess: () => {
            toast.success('Your application has been resubmitted.')
            queryClient.invalidateQueries({ queryKey: ['application'] })
            queryClient.invalidateQueries({ queryKey: ['farmer_metrics'] })
            queryClient.invalidateQueries({ queryKey: ['agri_metrics'] })
            queryClient.invalidateQueries({ queryKey: ['opv_metrics'] })
        },
        onError: (error) => {
            console.error(error.response)
            const detail = error.response?.data?.detail || "Could not resubmit application."
            toast.error(detail)
        }
    })
}

export const useGetPermit = (id) => {
    return useQuery({
        queryKey: ['docs', id],
        queryFn: async () => {
            const res = await api.get(`/issued-permit/${id}/`)
            return res.data
        }
    })
}