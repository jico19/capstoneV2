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
    // Only fetch if:
    // 1. A specific season is selected (wet/dry)
    // 2. OR both months are empty (initial full year view)
    // 3. OR both months are selected (complete custom range)
    const isReady = (season !== 'all') || (!startMonth && !endMonth) || (!!startMonth && !!endMonth);

    return useQuery({
        // The array MUST include months and season so React Query knows to re-fetch when they change
        queryKey: ['hog-survey', startMonth, endMonth, season],
        queryFn: async () => {
            // Build the params dynamically
            const params = {};
            if (startMonth) params.start_month = startMonth;
            if (endMonth) params.end_month = endMonth;
            if (season) params.season = season;

            // Artificial delay to showcase the loading state
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Make sure your Axios instance is pointing to the correct Django endpoint
            const res = await api.get('/hog-survey/survey_data/', { params });
            return res.data;
        },
        // Important: this keeps the old map colors on screen while the new ones load
        placeholderData: keepPreviousData,
        enabled: isReady,
        staleTime: 1000 * 60 * 5, // treat data as fresh for 5 mins
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