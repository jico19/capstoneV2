import axios from "axios";
import useAuthStore from "../store/authContext";

export const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL,
})


api.interceptors.request.use(config => {
    const token = useAuthStore.getState().access

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    res => res,
    async error => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            const refresh = useAuthStore.getState().refresh

            if (!refresh) {
                return Promise.reject(error)
            }

            try {
                const res = await axios.post(
                    `${import.meta.env.VITE_BASE_URL}/token/refresh/`,
                    { refresh }
                )
                useAuthStore.setState({ access: res.data.access})
                originalRequest.headers.Authorization = `Bearer ${res.data.access}`
                return api(originalRequest)
            } catch (error) {
                localStorage.clear()
                window.location.href = "/"
                console.log(error.response)
            }
        }

        return Promise.reject(error)
    }
)