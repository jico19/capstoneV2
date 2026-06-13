import { useQueryClient, useMutation, useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";

export const useApplication = (limit = 10, offset = 0, status, search) => {
    return useQuery({
        queryKey: ['application', limit, offset, status, search],
        queryFn: async () => {
            const res = await api.get('/application/', {
                params: { limit, offset, status, search }
            })
            console.log(res.data)
            return res.data
        },
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5, // treat data as fresh for 5 mins
    })
}

export const useApplicationDetail = (id) => {
    return useQuery({
        queryKey: ['application', id],
        queryFn: async () => {
            const res = await api.get(`/application/${id}/`)
            console.log(res.data)
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


export const useCreateApplicataion = () => {
    const query = useQueryClient()
    return useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/application/', data)
            return res.data
        }, onSuccess: () => {
            toast.success('Successfully submitted your application.')
            query.invalidateQueries({ queryKey: ['application'] })
        }, onError: (error) => {
            toast.error("There is something wrong...")
            console.log(error.response)
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
        onSuccess: (data) => {
            toast.success('Your application has been resubmitted.')
            queryClient.invalidateQueries({ queryKey: ['application'] })
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