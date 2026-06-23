import { createSlice } from "@reduxjs/toolkit";

const getStoredAuth = () => {
    try {
        const raw = localStorage.getItem('movieapp_auth');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const storedAuth = getStoredAuth();

const authSlice = createSlice({
    name: "user",
    initialState: {
        user: storedAuth?.user || null,
        isLoggedIn: storedAuth?.isLoggedIn || false,
        loading: false,
        error: null,
    },
    reducers: {
        loginSuccess: (state, action) => {
            state.user = action.payload;
            state.isLoggedIn = true;
            state.error = null;
            localStorage.setItem(
                'movieapp_auth',
                JSON.stringify({ user: action.payload, isLoggedIn: true })
            );
        },
        logoutUser: (state) => {
            state.user = null;
            state.isLoggedIn = false;
            localStorage.removeItem('movieapp_auth');
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
    },
});

export const { loginSuccess, logoutUser, setError } = authSlice.actions;

/* ─── Helpers ─────────────────────────────────────────────────── */
export const getUsers = () => {
    try {
        const raw = localStorage.getItem('movieapp_users');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveUsers = (users) => {
    localStorage.setItem('movieapp_users', JSON.stringify(users));
};

export default authSlice.reducer;
