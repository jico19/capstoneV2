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


export const useGetHogSurvey = (month, season) => {
    return useQuery({
        // The array MUST include month and season so React Query knows to re-fetch when they change
        queryKey: ['hog-survey', month, season],
        queryFn: async () => {
            // Build the params dynamically
            const params = {};
            if (month) params.month = month;
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