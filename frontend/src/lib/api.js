import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL,
});

let refreshPromise = null;

async function refreshAccessToken() {
    const authStorage = sessionStorage.getItem('auth-context');
    if (!authStorage) throw new Error('no auth context');
    const parsed = JSON.parse(authStorage);
    const refreshToken = parsed?.state?.refresh;
    if (!refreshToken) throw new Error('no refresh token');
    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/token/refresh/`, { refresh: refreshToken });
    parsed.state.access = res.data.access;
    if (res.data.refresh) parsed.state.refresh = res.data.refresh;
    sessionStorage.setItem('auth-context', JSON.stringify(parsed));
    const { default: useAuthStore } = await import('../store/authStore');
    useAuthStore.setState({ access: res.data.access, refresh: res.data.refresh || parsed.state.refresh });
    return res.data.access;
}

// Request Interceptor: Attach the access token from sessionStorage
api.interceptors.request.use(
    (config) => {
        try {
            const authStorage = sessionStorage.getItem('auth-context');
            if (authStorage) {
                const parsed = JSON.parse(authStorage);
                const token = parsed?.state?.access;
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
        } catch (e) {
            console.error("Failed to parse auth token", e);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle token refresh on 401 Unauthorized
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            if (!refreshPromise) {
                refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
            }
            try {
                const newAccess = await refreshPromise;
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                return api(originalRequest);
            } catch (refreshError) {
                console.error("Token refresh failed, logging out", refreshError);
                sessionStorage.clear();
                if (!window.__fp_refresh_redirected) { window.__fp_refresh_redirected = true; window.location.href = '/login'; }
            }
        }

        // Normalize 500-level errors
        if (error.response?.status >= 500) {
            // Attach a normalized message for components to display
            error.userMessage = 'A server error occurred. Please try again later.';
        }
        // Normalize network errors (no response at all)
        if (!error.response) {
            error.userMessage = 'Unable to reach the server. Check your connection.';
        }

        return Promise.reject(error);
    }
);
