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

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    failedQueue = []
}

api.interceptors.response.use(
    res => res,
    async error => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                })
                    .then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`
                        return api(originalRequest)
                    })
                    .catch(err => {
                        return Promise.reject(err)
                    })
            }

            originalRequest._retry = true
            isRefreshing = true

            const refresh = useAuthStore.getState().refresh

            if (!refresh) {
                isRefreshing = false
                return Promise.reject(error)
            }

            try {
                const res = await axios.post(
                    `${import.meta.env.VITE_BASE_URL}/token/refresh/`,
                    { refresh }
                )
                const newAccess = res.data.access
                const newRefresh = res.data.refresh

                useAuthStore.setState({
                    access: newAccess,
                    ...(newRefresh && { refresh: newRefresh })
                })

                originalRequest.headers.Authorization = `Bearer ${newAccess}`
                processQueue(null, newAccess)
                isRefreshing = false

                return api(originalRequest)
            } catch (refreshError) {
                processQueue(refreshError, null)
                isRefreshing = false

                useAuthStore.getState().logout()
                window.location.href = "/"
                return Promise.reject(refreshError)
            }
        }

        return Promise.reject(error)
    }
)