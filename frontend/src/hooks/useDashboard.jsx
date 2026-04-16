import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useGetAgriDashboard = () => {
    return useQuery({
        queryKey: ['agri_metrics'],
        queryFn: async () => {
            const res = await api.get('/dashboard/agri-metrics/')
            return res.data
        }
    })
}

export const useGetFarmerDashboard = () => {
    return useQuery({
        queryKey: ['farmer_metrics'],
        queryFn: async () => {
            const res = await api.get('/dashboard/farmer-metrics/')
            return res.data
        }
    })
}

export const useGetOPVDashboard = () => {
    return useQuery({
        queryKey: ['opv_metrics'],
        queryFn: async () => {
            const res = await api.get('/dashboard/opv-metrics/')
            return res.data
        }
    })
}

export const useGetInspectorDashboard = () => {
    return useQuery({
        queryKey: ['inspector_metrics'],
        queryFn: async () => {
            const res = await api.get('/dashboard/inspector-metrics/')
            return res.data
        }
    })
}