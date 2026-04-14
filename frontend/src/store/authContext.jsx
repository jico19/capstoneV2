import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';



const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            access: null,
            refresh: null,
            isAuthenticated: false,

            // Login Action
            login: async (credentials) => {
                set({ isLoading: true });
                try {
                    // Replace with your actual API call
                    // const response = await api.post('/login', credentials);
                    // const userData = response.data;
                    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/login/`, credentials)
                    const decoded = jwtDecode(res.data.access)
                    const user = { id: decoded.id, username: decoded.username, role: decoded.role };

                    set({
                        user: user,
                        access: res.data.access,
                        refresh: res.data.refresh,
                        isAuthenticated: true,
                    });
                } catch (error) {
                    console.error("Login failed:", error);
                    throw error
                }
            },

            // Logout Action
            logout: () => {
                set({ user: null, isAuthenticated: false });
                localStorage.clear()
                // Optional: clear tokens from cookies/localstorage if not using persist
            },
        }),
        {
            name: 'auth-context', // unique name for localStorage
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export default useAuthStore;