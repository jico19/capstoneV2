import { useQueryClient, useMutation, useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "../lib/api";


export const useGetMaps = () => {
    return useQuery({
        queryKey: ['map'],
        queryFn: async () => {
            const res = await api.get('/barangay/')
            return res.data
        },
        staleTime: 1000 * 60 * 5, // treat data as fresh for 5 mins

    })
}


export const useGetHogSurvey = (startMonth, endMonth, season) => {
    return useQuery({
        // The array MUST include months and season so React Query knows to re-fetch when they change
        queryKey: ['hog-survey', startMonth, endMonth, season],
        queryFn: async () => {
            // Build the params dynamically
            const params = {};
            if (startMonth) params.start_month = startMonth;
            if (endMonth) params.end_month = endMonth;
            if (season) params.season = season;

            // Make sure your Axios instance is pointing to the correct Django endpoint
            const res = await api.get('/hog-survey/survey_data/', { params });
            console.log(res.data)
            return res.data;
        },
        // Important: this keeps the old map colors on screen while the new ones load
        placeholderData: keepPreviousData, 
    })
}

export const useGetTransportVolume = () => {
    return useQuery({
        queryKey: ['transport-volume'],
        queryFn: async () => {
            const res = await api.get('/barangay/transport_volume/');
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
    })
}

export const useGetCheckpoints = () => {
    return useQuery({
        queryKey: ['checkpoints'],
        queryFn: async () => {
            const res = await api.get('/checkpoints/');
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
    })
}