import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL,
});

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
            try {
                const authStorage = sessionStorage.getItem('auth-context');
                if (authStorage) {
                    const parsed = JSON.parse(authStorage);
                    const refreshToken = parsed?.state?.refresh;
                    if (refreshToken) {
                        // Request a new access token
                        const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/token/refresh/`, {
                            refresh: refreshToken,
                        });
                        const newAccess = res.data.access;

                        // Save the new access token back to sessionStorage
                        parsed.state.access = newAccess;
                        sessionStorage.setItem('auth-context', JSON.stringify(parsed));

                        // Retry the original request
                        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error("Token refresh failed, logging out", refreshError);
                // Clear storage and redirect to login if refresh fails
                sessionStorage.clear();
                window.location.href = '/login';
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
