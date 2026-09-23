# Plan 004: JWT refresh — persist rotated refresh, update zustand, single-flight

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise. When
> done, update the status row for this plan in `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 8ea30ba..HEAD -- frontend/src/lib/api.js frontend/src/store/authStore.js`
> If either file changed, compare the "Current state" excerpts against live code before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `8ea30ba`, 2026-09-23
- **Issue**: —

## Why this matters

`ROTATE_REFRESH_TOKENS=True` (`backend/config/settings/base.py:178`) means every
`POST /token/refresh/` returns a **new** refresh token and invalidates the old one. But the
frontend interceptor (`frontend/src/lib/api.js:43-50`) saves only `res.data.access` back to
sessionStorage — the rotated refresh is discarded, and the in-memory zustand store
(`frontend/src/store/authStore.js`) is never updated. Consequences: (a) the persisted, now-stale
refresh expires client-side while still valid server-side, and — worse — parts of the app read
the token from the zustand store, not the interceptor, so `authStore.fetchUserProfile`
(`authStore.js:50-74`) keeps using the stale access token and silently 401s; (b) a burst of
concurrent 401s each fires its own refresh (no single-flight); (c) any transient network error
during refresh clears sessionStorage and redirects to `/login` (`api.js:57-62`), logging the user
out.

## Current state

`frontend/src/lib/api.js:29-63` — the full response interceptor:
```js
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
                        const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/token/refresh/`, {
                            refresh: refreshToken,
                        });
                        const newAccess = res.data.access;
                        parsed.state.access = newAccess;
                        sessionStorage.setItem('auth-context', JSON.stringify(parsed));
                        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                        return api(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.error("Token refresh failed, logging out", refreshError);
                sessionStorage.clear();
                window.location.href = '/login';
            }
        }
        ...
        return Promise.reject(error);
    }
);
```

`frontend/src/store/authStore.js` — persisted to sessionStorage under key `auth-context` via zustand `persist` (`createJSONStorage(() => sessionStorage)`, line 84). State holds `user`, `access`, `refresh`, `isAuthenticated`. `fetchUserProfile` uses `useAuthStore.getState().access` with a **bare** `axios.get` (no interceptor).

Repo convention (AGENTS.md, hard requirement): auth persists to **sessionStorage** with key `auth-context` — do not switch to localStorage.

## Commands you will need

| Purpose | Command              | Expected on success |
|---------|----------------------|---------------------|
| Lint    | `npm run lint` (from `frontend/`) | exit 0 |

Frontend has no test suite (AGENTS.md: "lint only"). Verification is lint + a manual smoke test described in the Test plan.

## Suggested executor toolkit

None required. Keep the changes in the two in-scope files; follow the existing code style (plain async/await, `import.meta.env.VITE_BASE_URL`).

## Scope

**In scope**:
- `frontend/src/lib/api.js`
- `frontend/src/store/authStore.js`

**Out of scope**:
- Backend token settings/paths (`backend/config/settings/base.py`, `/token/refresh/`) — rotation stays on.
- Any other page/component code.
- Switching storage away from sessionStorage.

## Git workflow

- Branch: `advisor/004-jwt-refresh-fix`.
- Commit once after lint passes. Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Extract a single-flight refresh routine in `api.js`

Add a module-level `let refreshPromise = null;` at the top of `frontend/src/lib/api.js` (near the `axios.create`). Extract the refresh logic into a function that returns **one shared promise** for concurrent callers:

```js
let refreshPromise = null;

async function refreshAccessToken() {
    const authStorage = sessionStorage.getItem('auth-context');
    if (!authStorage) throw new Error('no auth context');
    const parsed = JSON.parse(authStorage);
    const refreshToken = parsed?.state?.refresh;
    if (!refreshToken) throw new Error('no refresh token');
    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/token/refresh/`, { refresh: refreshToken });
    parsed.state.access = res.data.access;
    if (res.data.refresh) parsed.state.refresh = res.data.refresh;          // rotation: persist new refresh
    sessionStorage.setItem('auth-context', JSON.stringify(parsed));
    const { default: useAuthStore } = await import('../store/authStore');   // dynamic import avoids a load-time cycle
    useAuthStore.setState({ access: res.data.access, refresh: res.data.refresh || parsed.state.refresh });
    return res.data.access;
}
```

Guard against a stale promise: reset `refreshPromise = null` in a `finally` (or clear it at the start of each call). Route the response interceptor's 401 branch through it:

```js
if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    if (!refreshPromise) refreshPromise = refreshAccessToken().catch((e) => { refreshPromise = null; throw e; });
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
```

**Verify**: `npm run lint` → exit 0.

### Step 2: Make `fetchUserProfile` refresh-aware

In `frontend/src/store/authStore.js`, `fetchUserProfile` currently calls a bare `axios.get` with `useAuthStore.getState().access`. Replace it so that on a 401 it triggers the same refresh (so store consumers never silently 401):

Option A (preferred, minimal surface): change `fetchUserProfile` to use the `api` client from `../lib/api` (which has the interceptor) instead of bare axios:

```js
const { api } = await import('../lib/api');
const res = await api.get('/user/me/');
```

On success, also freshen the store's `access`/`refresh` from what the interceptor wrote if available. Keep the existing try/catch that returns `null` on failure.

If a module cycle makes importing `api` from the store awkward, Option B: re-export a small `refreshAndGetAccess()` from `api.js` and have `fetchUserProfile` get a fresh access token through it before the request. Choose the option that does not create an import cycle (`api.js` importing `authStore.js` already exists in Step 1 — the reverse import is fine since `authStore.js` will only *use* `api`, not be the thing `api.js` imports at module load).

**Verify**: `npm run lint` → exit 0.

## Test plan

Frontend has no automated suite — verification is manual, document commands you ran:

1. `npm run lint` → exit 0.
2. Manual smoke: start backend (`python manage.py runserver 8000`) and frontend (`npm run dev`), log in as the seed `Agri` user (see `backend/scripts/seed_realistic_operations.py` / `TEST_CREDENTIALS`), then temporarily lower `ACCESS_TOKEN_LIFETIME` to `timedelta(seconds=30)` in `backend/config/settings/base.py` (revert after), wait it out, and trigger any authed request (e.g. `/user/me/`). The app must recover silently; the zustand store's `access` and `refresh` must both equal the values now in sessionStorage. Revert the settings change.
3. Open the DevTools Session Storage panel and confirm `auth-context` contains a refreshed `refresh` (different from pre-refresh) after a refresh cycle.
4. Refresh-failure path: stop the backend, force a 401 → confirm single redirect to `/login` (not a redirect loop).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run lint` exits 0
- [ ] `refreshAccessToken` is a single shared promise — two simultaneous 401s produce exactly one `POST /token/refresh/` (verify via network tab / server log)
- [ ] After a refresh, sessionStorage `auth-context` contains BOTH a new `access` and a new `refresh`
- [ ] `useAuthStore.setState({ access, refresh })` is called on refresh (store state matches sessionStorage)
- [ ] `git status` shows only `frontend/src/lib/api.js` and `frontend/src/store/authStore.js` modified
- [ ] `advisor-plans/README.md` status row for 004 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- You find that some other module (not `authStore.js`) also reads tokens from sessionStorage directly and would be left stale by these changes — report the additional file rather than widening scope unilaterally. (Grep for `auth-context` to check.)
- The dynamic `import('../store/authStore')` in `api.js` causes a circular-import runtime error in the existing toolchain (Vite/Rollup) — report it and switch to Option B.
- Any file in the drift check changed in ways that invalidate the excerpts.

## Maintenance notes

- The shared `refreshPromise` lives in `api.js` — do not build a competing refresh in another file; route future token consumers through the interceptor.
- If the backend ever grows a session-revocation flow, the `window.__fp_refresh_redirected` guard may need to become a real store flag.
- Reviewer focus: the rotation write (`parsed.state.refresh = res.data.refresh`) and the store sync are the two load-bearing lines; everything else is structure.