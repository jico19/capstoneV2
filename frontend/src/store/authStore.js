import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
                    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/login/`, credentials)
                    const decoded = JSON.parse(atob(res.data.access.split('.')[1]))
                    const user = {
                        id: decoded.id,
                        username: decoded.username,
                        role: decoded.role,
                        first_name: decoded.first_name,
                        last_name: decoded.last_name
                    };

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
                set({ user: null, access: null, refresh: null, isAuthenticated: false });
                sessionStorage.clear()
            },
        }),
        {
            name: 'auth-context', // unique name for sessionStorage
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);

export default useAuthStore;
