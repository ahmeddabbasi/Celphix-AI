# 🚀 Frontend-Only Development Guide

## Overview

This guide explains how to develop the Celphix frontend independently without requiring the backend to be active. The development system provides:

- ✅ **Auth Bypass** - Access all routes without login
- ✅ **Mock API** - Realistic fake data for testing
- ✅ **Environment-Based Switching** - Easy toggle between mock and real API
- ✅ **Production Safety** - Dev code is completely removed from production builds
- ✅ **Scalable Architecture** - Easy to add new mock endpoints

---

## Quick Start (5 minutes)

### 1. Enable Development Mode

The `.env.development` file is pre-configured. Just ensure these settings:

```bash
# .env.development
VITE_DEV_MODE=true          # Enable dev mode auth bypass
VITE_USE_MOCK_API=true      # Use mock data instead of real API
VITE_DEV_MOCK_DELAY=false   # Optional: simulate network delay
```

### 2. Start Development Server

```bash
npm run dev
# or
yarn dev
# or
bun run dev
```

### 3. Access Dashboard

Navigate to `http://localhost:5173` (or your Vite dev port)

You'll be automatically logged in as "dev_user" with full Command Center access.

### 4. Check Console Logs

Open DevTools (F12) → Console tab to see:

```
🚀 Celphix - Development Mode
✅ Dev Session Initialized
Profile: { user_id: 1, username: 'dev_user', is_admin: true, ... }
🔧 Development Mode Configuration
Dev Mode Enabled: true
Using Mock API: true
Mock User ID: 1
Mock Username: dev_user
📡 API Proxy Configuration
Dev Mode: true
Using Mock API: true
Available Mock Endpoints: 12
  ✓ /api/auth/me
  ✓ /api/cc/dashboard/summary
  ✓ ...
```

---

## Advanced Usage

### Scenario 1: Mock API Development (Recommended for UI-only work)

**Goal**: Work on frontend design/functionality without any backend dependency

```bash
# .env.development
VITE_DEV_MODE=true
VITE_USE_MOCK_API=true
VITE_DEV_MOCK_DELAY=true    # Enable network simulation for better UX testing
```

**Features**:
- Instant feedback (no server latency)
- No backend required
- Perfect for CSS, component testing, layout work
- Mock data is predefined and consistent

### Scenario 2: Real Backend Development (When backend is available)

**Goal**: Connect to your backend running on another PC via Cloudflare Tunnel

```bash
# .env.development
VITE_DEV_MODE=true
VITE_USE_MOCK_API=false     # ← Use real API, not mock
VITE_API_URL=https://your-cloudflare-url.com  # Your tunnel URL
```

**Setup**:
1. Start backend on another PC
2. Run Cloudflare Tunnel on backend PC
3. Get tunnel URL
4. Add URL to `VITE_API_URL`
5. Start frontend dev server

**Flow**:
```
Browser → Frontend Dev Server → Cloudflare Tunnel → Backend PC → Backend API
```

### Scenario 3: Hybrid Mode (Some endpoints mocked, others real)

Edit `src/lib/dev/dev-api-proxy.ts` to comment out specific endpoints:

```typescript
// In mockEndpoints, comment out endpoints you want to hit real API
const mockEndpoints: Record<string, ...> = {
  "/api/auth/me": () => mockApiFactory.createUserProfile(),  // ← Mock
  // "/api/cc/dashboard/summary": ...,  // ← Will use real API
};
```

---

## Testing Different User Roles

### Admin User (Default)

```javascript
// DevTools Console
import { devAuth } from "@/lib/dev/dev-auth";
devAuth.getDevProfile();
// Returns: { is_admin: true, command_center_access: true, ... }
```

### PAYG User (Limited access)

```javascript
// DevTools Console
import { devAuth } from "@/lib/dev/dev-auth";
import { devConfig } from "@/lib/dev/dev-config";

devAuth.updateDevProfile({
  is_admin: false,
  command_center_access: false,  // ← Redirects to PAYG section
});
```

### Custom User

```javascript
// DevTools Console
import { devAuth } from "@/lib/dev/dev-auth";

devAuth.updateDevProfile({
  user_id: 123,
  username: "test_user",
  email: "test@example.com",
  is_admin: false,
  command_center_access: true,
});
```

### View Current Session Info

```javascript
// DevTools Console
import { devAuth } from "@/lib/dev/dev-auth";
devAuth.logDevSession();
```

---

## Adding New Mock Endpoints

### Step 1: Define Mock Data Generator

File: `src/lib/dev/dev-api-mocks.ts`

```typescript
// In the MockApiFactory class, add a method:

createMyNewData(): MyDataType {
  return {
    id: 1,
    name: "Test Data",
    value: Math.random() * 100,
  };
}
```

### Step 2: Add to Endpoint Mapping

File: `src/lib/dev/dev-api-proxy.ts`

```typescript
const mockEndpoints: Record<string, ...> = {
  // ... existing endpoints
  "/api/my-endpoint": () => mockApiFactory.createMyNewData(),
  "/api/my-endpoint-with-params": (params) => {
    const id = params?.id as number;
    return mockApiFactory.createMyNewData(); // Use params as needed
  },
};
```

### Step 3: Test

```javascript
// DevTools Console
fetch("/api/my-endpoint")
  .then(r => r.json())
  .then(console.log);
// Should return mock data
```

---

## Architecture

### File Structure

```
src/
├── lib/
│   ├── auth.ts                           # Modified for dev support
│   ├── api.ts                            # API request wrapper
│   └── dev/                              # ← NEW: Dev-only utilities
│       ├── dev-config.ts                 # Feature flags & config
│       ├── dev-auth.ts                   # Auth bypass & mock sessions
│       ├── dev-api-mocks.ts             # Mock data factory
│       └── dev-api-proxy.ts             # Request interception/routing
│
├── components/
│   └── ProtectedRoute.tsx                # Modified for dev bypass
│
├── pages/
│   ├── Dashboard.tsx
│   ├── Login.tsx                         # Still works (gets bypassed in dev)
│   └── ...
│
└── App.tsx                               # Modified to init dev mode
```

### Control Flow (Dev Mode Enabled)

```
User Action
    ↓
React Component
    ↓
API Request (fetch/http)
    ↓
lib/auth.ts → authenticatedFetch()
    ↓
lib/dev/dev-api-proxy.ts → interceptRequest()
    ├─→ [If VITE_USE_MOCK_API=true] Mock Data Factory ✓
    └─→ [If VITE_USE_MOCK_API=false] Real API Call ✓
    ↓
Response (JSON)
    ↓
Component Renders
```

### Route Protection Flow (Dev Mode Enabled)

```
User visits /dashboard
    ↓
App.tsx → <CCProtectedRoute>
    ↓
ProtectedRoute.tsx checks: devConfig.isDevMode()?
    ├─→ [YES] Skip auth checks → Render children ✓
    └─→ [NO] Check isAuthenticated() → Redirect to /login
```

---

## Security & Production Safety

### How Dev Code is Removed from Production

1. **Vite Tree-Shaking**: All `import { devConfig }` statements are eliminated
2. **Dead Code Elimination**: Unused `dev/` directory is excluded from builds
3. **Environment Variables**: `VITE_DEV_MODE` is never set in production
4. **Conditional Imports**: Dev imports only happen if dev mode is enabled

### Verification

```bash
# Build for production
npm run build

# Check bundle size - should NOT include dev code
# (dev/* and dev/ should not appear in dist/)
ls -lh dist/
strings dist/assets/*.js | grep -i "dev_mode"  # Should be empty
```

### Production Configuration

```bash
# Production build uses these settings automatically:
VITE_DEV_MODE=false  (or unset)
VITE_USE_MOCK_API=false (or unset)
VITE_API_URL=https://voiceagent.rebortai.com
```

---

## Environment Variables Reference

### VITE_DEV_MODE
- **Type**: `string` ("true" or "false")
- **Default**: Not set (equivalent to "false")
- **Effect**: Enables all development-only features
- **Production**: Should never be "true"

### VITE_USE_MOCK_API
- **Type**: `string` ("true" or "false")
- **Default**: Not set (equivalent to "false")
- **Effect**: Routes API requests to mock data factory
- **Requires**: `VITE_DEV_MODE=true` to work
- **Production**: Should never be "true"

### VITE_DEV_MOCK_DELAY
- **Type**: `string` ("true" or "false")
- **Default**: Not set (equivalent to "false")
- **Effect**: Adds ~300ms artificial delay to mock responses
- **Use Case**: Testing loading states and skeleton screens
- **Production**: No effect (ignored when `VITE_DEV_MODE=false`)

### VITE_API_URL
- **Type**: `string` (URL)
- **Default**: Empty (uses Vite proxy to localhost:8000)
- **Effect**: Backend API base URL for real API calls
- **Dev Usage**: Leave empty for local dev, or set to Cloudflare Tunnel URL
- **Production**: Set to `https://voiceagent.rebortai.com`

### VITE_WS_URL
- **Type**: `string` (URL)
- **Default**: Derived from `VITE_API_URL` or current window origin
- **Effect**: WebSocket URL for real-time features
- **Typical**: Leave empty for automatic derivation

---

## Troubleshooting

### Issue: Getting "Unauthorized" errors even though dev mode is on

**Solution**:
```javascript
// Check dev mode is actually enabled
import { devConfig } from "@/lib/dev/dev-config";
console.log(devConfig.isDevMode());  // Should be true

// Check session was initialized
import { devAuth } from "@/lib/dev/dev-auth";
devAuth.logDevSession();  // Should show Active: true
```

### Issue: Mock API returns empty data

**Solution**:
1. Check that endpoint is registered in `mockEndpoints`
2. Open DevTools Network tab - should show `Status: 200 OK` with mock data
3. Enable `VITE_DEV_MOCK_DELAY=true` to verify it's hitting mock API

### Issue: Frontend connects to real API but gets 401

**Solution**:
1. Check backend is running and accessible via Cloudflare Tunnel
2. Try `VITE_USE_MOCK_API=true` to confirm dev mode works
3. Verify `VITE_API_URL` is set correctly:
   ```javascript
   // Console
   import { getApiUrl } from "@/lib/api";
   console.log(getApiUrl());  // Should show your backend URL
   ```

### Issue: Changes to dev config not taking effect

**Solution**:
1. Clear browser cache: DevTools → Application → Clear all
2. Restart dev server: Stop `npm run dev`, then `npm run dev` again
3. Clear localStorage:
   ```javascript
   // Console
   localStorage.clear();
   location.reload();
   ```

### Issue: Mock data is stale/needs refresh

**Solution**:
```javascript
// Console - reinitialize dev session
import { devAuth } from "@/lib/dev/dev-auth";
devAuth.clearDevSession();
devAuth.initDevSession();

// Then refresh page
location.reload();
```

---

## Best Practices

### ✅ DO

- Use mock mode for UI/design work (fastest feedback loop)
- Switch to real API when testing integration features
- Keep mock data consistent with real API structure
- Test both CC and PAYG user roles
- Add network delay (`VITE_DEV_MOCK_DELAY=true`) when developing loading states
- Create separate mock profiles for different user types

### ❌ DON'T

- Don't commit `.env.development` with real credentials
- Don't use dev mode in production (it's removed anyway via tree-shaking)
- Don't assume mock data is real (it's idealized)
- Don't forget to test with real API before pushing to production
- Don't leave `VITE_DEV_MODE=true` when deploying

---

## For Team Collaboration

### Setting Up New Developer Environment

1. Clone repository
2. Copy `.env.development` (already in repo)
3. Run `npm install` and `npm run dev`
4. Open browser to `http://localhost:5173`
5. ✅ Ready to develop!

### Switching Between Developers

Since dev session is stored in localStorage:

```javascript
// Before switching to another developer profile
import { devAuth } from "@/lib/dev/dev-auth";
devAuth.clearDevSession();
devAuth.initDevSession({ username: "other_dev" });
location.reload();
```

### Adding Team Member Profiles

Edit `src/lib/dev/dev-api-mocks.ts`:

```typescript
const TEAM_PROFILES = {
  ALICE: { username: "alice", email: "alice@celphix.local" },
  BOB: { username: "bob", email: "bob@celphix.local" },
  // ... add team members
};
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/build.yml
- name: Build Frontend
  run: npm run build
  env:
    VITE_DEV_MODE: false  # ← Explicitly disable for production
    VITE_USE_MOCK_API: false
    VITE_API_URL: https://voiceagent.rebortai.com
```

---

## Next Steps

1. **Start with mock mode**: Get comfortable with the UI
2. **Switch to real API**: Test backend integration
3. **Add more mock endpoints**: As needed for your workflows
4. **Share with team**: Run through team onboarding
5. **Document specific flows**: Add team-specific dev guides

---

## Questions or Issues?

Consult the inline code comments in:
- `src/lib/dev/dev-config.ts` - Configuration details
- `src/lib/dev/dev-auth.ts` - Auth bypass mechanism
- `src/lib/dev/dev-api-mocks.ts` - Mock data structure
- `src/lib/dev/dev-api-proxy.ts` - Request routing logic

---

**Happy coding! 🎉**
