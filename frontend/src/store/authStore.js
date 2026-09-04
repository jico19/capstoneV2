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
                        last_name: decoded.last_name,
                        barangay: decoded.barangay,
                        barangay_name: decoded.barangay_name,
                        verification_status: decoded.verification_status || 'UNVERIFIED'
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

            // Update user state dynamically
            updateUser: (updatedFields) => {
                set((state) => ({
                    user: state.user ? { ...state.user, ...updatedFields } : null
                }));
            },

            // Fetch fresh user profile
            fetchUserProfile: async () => {
                try {
                    const access = useAuthStore.getState().access;
                    if (!access) return null;
                    const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/user/me/`, {
                        headers: { Authorization: `Bearer ${access}` }
                    });
                    if (res.data) {
                        set((state) => ({
                            user: {
                                ...state.user,
                                verification_status: res.data.verification_status,
                                verification_remarks: res.data.verification_remarks,
                                verified_at: res.data.verified_at,
                                first_name: res.data.first_name,
                                last_name: res.data.last_name,
                            }
                        }));
                        return res.data;
                    }
                } catch (error) {
                    console.error("Failed to fetch fresh user profile:", error);
                }
                return null;
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
