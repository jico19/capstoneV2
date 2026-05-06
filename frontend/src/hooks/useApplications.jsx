import { useQueryClient, useMutation, useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toast } from "sonner";

export const useApplication = (limit = 10, offset = 0, status) => {
    return useQuery({
        queryKey: ['application', limit, offset, status],
        queryFn: async () => {
            const res = await api.get('/application/', {
                params: { limit, offset, status }
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
            console.log(res.data)
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
            console.log(error)
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
        onSuccess: (data) => {
            toast.success('Your application has been resubmitted.')
            queryClient.invalidateQueries({ queryKey: ['application'] })
        },
        onError: (error) => {
            console.error(error)
            const detail = error.response?.data?.detail || "Could not resubmit application."
            toast.error(detail)
        }
    })
}

export const useGetPermit = (id) => {
    return useQuery({
        queryKey: ['docs', id],
        queryFn: async () => {
            console.log(typeof (id))
            const res = await api.get(`/issued-permit/${id}/`)
            return res.data
        }
    })
}