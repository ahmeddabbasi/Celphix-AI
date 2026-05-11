# 🏗️ Advanced Architecture & Developer Reference

## Table of Contents

1. [System Design](#system-design)
2. [Module Breakdown](#module-breakdown)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Extending the System](#extending-the-system)
5. [API Proxy Internals](#api-proxy-internals)
6. [Security Considerations](#security-considerations)
7. [Performance Optimization](#performance-optimization)
8. [Testing Strategy](#testing-strategy)

---

## System Design

### Design Patterns Used

#### 1. **Decorator Pattern** (API Proxy)
- Wraps the original `authenticatedFetch()` function
- Adds request interception without modifying original code
- Allows transparent switching between real and mock APIs

```typescript
// Pseudo-code showing the pattern
export async function authenticatedFetch(url, options) {
  if (devConfig.isDevMode()) {
    return apiProxy.interceptRequest(url, options, () =>
      originalAuthenticatedFetch(url, options)
    );
  }
  return originalAuthenticatedFetch(url, options);
}
```

#### 2. **Factory Pattern** (Mock Data)
- `mockApiFactory` creates consistent, realistic test data
- Centralizes mock data generation logic
- Easy to modify all mock data from one place

```typescript
const userProfile = mockApiFactory.createUserProfile({
  is_admin: false,
});
```

#### 3. **Strategy Pattern** (Auth & API Selection)
- Choose authentication strategy at runtime via environment variables
- Dev mode uses different auth/API than production

```typescript
if (devConfig.isDevMode()) {
  // Use dev auth strategy
  devAuth.initDevSession();
} else {
  // Use production auth flow
  requireLogin();
}
```

#### 4. **Proxy Pattern** (ProtectedRoute)
- Routes component rendering based on auth state
- Handles both dev and production authentication

---

## Module Breakdown

### Core Modules

#### `src/lib/dev/dev-config.ts` - Feature Flags
- **Responsibility**: Centralized feature flag management
- **Key Functions**:
  - `isDevMode()` - Check if dev mode is enabled
  - `useMockApi()` - Check if mock API should be used
  - `logConfig()` - Log current configuration
- **Design**: Simple boolean checks with clear semantics
- **Type Safety**: All environment variables are type-checked

#### `src/lib/dev/dev-auth.ts` - Authentication Bypass
- **Responsibility**: Provide mock authentication without backend
- **Key Functions**:
  - `initDevSession()` - Create mock auth session in localStorage
  - `generateMockJwt()` - Generate fake JWT token
  - `getDevProfile()` - Return mock user profile
  - `updateDevProfile()` - Modify user profile for testing
  - `isDevSessionActive()` - Verify session exists
- **Design**: Mirrors production auth but uses local data
- **Storage**: Uses browser localStorage (same as production)

#### `src/lib/dev/dev-api-mocks.ts` - Mock Data Factory
- **Responsibility**: Generate realistic mock data for all endpoints
- **Key Functions**: `create*()` methods for each data type
  - `createUserProfile()` - Mock user data
  - `createDashboardSummary()` - Dashboard metrics
  - `createAssistantsWithStats()` - Assistant data
  - etc.
- **Design**: Consistent, deterministic data (except for randomized metrics)
- **Extensibility**: Easy to add new mock data types

#### `src/lib/dev/dev-api-proxy.ts` - Request Interception
- **Responsibility**: Route requests to mock or real API
- **Key Functions**:
  - `interceptRequest()` - Main interception logic
  - `shouldMockEndpoint()` - Check if endpoint should be mocked
  - `getMockData()` - Retrieve mock data for endpoint
  - `simulateNetworkDelay()` - Add artificial latency
- **Design**: Transparent to calling code
- **Routing**: Endpoint matching via URL path parsing

#### `src/lib/auth.ts` - Modified Authentication
- **Responsibility**: Main auth module, now with dev support
- **Key Changes**:
  - Imports dev modules
  - `isAuthenticated()` checks dev mode first
  - `authenticatedFetch()` uses API proxy in dev mode
  - `initializeDevelopmentMode()` initializes dev features
- **Backward Compatible**: Production behavior unchanged

#### `src/components/ProtectedRoute.tsx` - Route Guards
- **Responsibility**: Protect routes from unauthenticated access
- **Key Changes**:
  - `ProtectedRoute` checks dev mode first
  - `CCProtectedRoute` skips access checks in dev mode
- **Behavior**:
  - Dev mode: Always allow access
  - Production: Standard auth checks

---

## Data Flow Diagrams

### Authentication Flow (Dev Mode)

```
┌─────────────────┐
│  App.tsx init   │
│  (useEffect)    │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│ initializeDevelopmentMode()  │
│                              │
│ 1. Check VITE_DEV_MODE       │
│ 2. Call devAuth.initDevSession()
│ 3. Log configuration         │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ devAuth.initDevSession()     │
│                              │
│ 1. Create mock JWT           │
│ 2. Store in localStorage     │
│ 3. Set session ID & username │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ localStorage (auth tokens)   │
│ - access_token: mock JWT     │
│ - session_id: dev_session_*  │
│ - username: dev_user         │
└──────────────────────────────┘

User can now access all protected routes ✓
```

### API Request Flow (Dev Mode with Mock API)

```
┌──────────────────────────┐
│  React Component         │
│  (e.g., useUserProfile)  │
└────────┬─────────────────┘
         │ fetch("/api/auth/me")
         ▼
┌──────────────────────────┐
│ api.ts: request()        │
│                          │
│ Makes HTTP call via      │
│ authenticatedFetch()     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ auth.ts: authenticatedFetch()        │
│                                      │
│ Checks: devConfig.isDevMode()?       │
│ YES → Use API proxy                  │
│ NO  → Direct fetch (production)      │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ dev-api-proxy.ts: interceptRequest() │
│                                      │
│ Checks: shouldMockEndpoint()?        │
│ YES → Get mock data                  │
│ NO  → Fall through to real API       │
└────────┬─────────────────────────────┘
         │
         ▼
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌──────────────┐    ┌────────────────────┐
│ Mock Data    │    │ Real API Request   │
│ (200 OK)     │    │ (authenticatedFetch)
│              │    │                    │
│ ┌──────────┐ │    │ ┌──────────────┐  │
│ │Dashboard │ │    │ │Backend API   │  │
│ │Summary   │ │    │ │/api/auth/me  │  │
│ └──────────┘ │    │ └──────────────┘  │
└──────────┬───┘    └────────┬───────────┘
           │                 │
           └─────────┬───────┘
                     │
                     ▼
            ┌─────────────────┐
            │ Response (JSON) │
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ React renders   │
            │ with data       │
            └─────────────────┘
```

### Route Protection Flow (Dev Mode)

```
User navigates to /dashboard
         │
         ▼
┌──────────────────────────┐
│ App.tsx: <Route>         │
│ with <CCProtectedRoute>  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ ProtectedRoute.tsx           │
│ CCProtectedRoute({children}) │
└────────┬─────────────────────┘
         │
         ▼
   ┌─────────────────────┐
   │ isDevMode()?        │
   └──┬───────────────┬──┘
      │ YES           │ NO
      ▼               ▼
  ┌────────┐    ┌─────────────────┐
  │ ALLOW  │    │ Production Flow │
  │ Access │    │ - Check auth    │
  │        │    │ - Verify access │
  │Render  │    │ - Redirect if   │
  │children│    │   needed        │
  └────────┘    └────────┬────────┘
                         │
                    ┌────┴─────────┐
                    │              │
                    ▼              ▼
              ┌──────────┐  ┌──────────┐
              │  ALLOW   │  │ REDIRECT │
              │  Access  │  │ to /login│
              └──────────┘  └──────────┘
```

---

## Extending the System

### Adding a New Mock Endpoint

#### Example: Add mock data for "Calls" feature

**Step 1**: Add factory method in `dev-api-mocks.ts`

```typescript
// In MockApiFactory class
export interface Call {
  call_id: number;
  assistant_id: number;
  caller_number: string;
  duration_seconds: number;
  status: "completed" | "missed" | "in_progress";
  started_at: string;
}

createCall(overrides: Partial<Call> = {}): Call {
  return {
    call_id: Math.floor(Math.random() * 10000),
    assistant_id: 1,
    caller_number: "+1234567890",
    duration_seconds: Math.floor(Math.random() * 600) + 30,
    status: "completed",
    started_at: new Date().toISOString(),
    ...overrides,
  };
}

createCalls(limit = 20): { calls: Call[] } {
  return {
    calls: Array.from({ length: limit }, (_, i) =>
      this.createCall({ call_id: i + 1 })
    ),
  };
}
```

**Step 2**: Register endpoint in `dev-api-proxy.ts`

```typescript
const mockEndpoints: Record<string, ...> = {
  // ... existing endpoints
  "/api/cc/calls": () => mockApiFactory.createCalls(),
  "/api/cc/calls/{id}": (params) => {
    const callId = params?.id as number;
    return mockApiFactory.createCall({ call_id: callId });
  },
  "/api/payg/calls": () => mockApiFactory.createCalls(10),
};
```

**Step 3**: Test in browser console

```javascript
// DevTools Console
fetch("/api/cc/calls")
  .then(r => r.json())
  .then(data => console.log(data));
// Should return: { calls: [...] }
```

**Step 4**: Use in component

The API call will automatically use mock data:

```typescript
// In a React component
const { data: calls } = useQuery({
  queryKey: ["calls"],
  queryFn: () => api.get("/api/cc/calls"),
});
```

---

## API Proxy Internals

### Endpoint Matching Algorithm

```typescript
// How endpoints are matched and routed

export function shouldMockEndpoint(url: string): boolean {
  // 1. Extract path from full URL
  const path = this.getEndpointPath(url);  // "/api/cc/calls"
  
  // 2. Check if path exists in mockEndpoints
  return path in mockEndpoints;  // true if registered
}

// Example URL transformations:
"http://localhost:5173/api/cc/calls?limit=10"
  → path = "/api/cc/calls"
  → params = { limit: "10" }
  → lookup in mockEndpoints
  → returns handler
  → calls handler(params)
  → returns mock data
```

### Request Interception Logic

```typescript
export async function interceptRequest(
  url: string,
  options: RequestInit,
  realApiCall: () => Promise<Response>
): Promise<Response> {
  // 1. Check if dev mode is enabled
  if (!devConfig.isDevMode()) {
    return realApiCall();  // No interception in production
  }

  // 2. Check if endpoint should be mocked
  if (this.shouldMockEndpoint(url)) {
    // Simulate network delay (optional)
    await this.simulateNetworkDelay();
    
    // Get mock data
    const mockData = this.getMockData(url);
    
    // Create Response object
    return createMockResponse(mockData);
  }

  // 3. Not mocked, use real API
  return realApiCall();
}
```

### Network Delay Simulation

```typescript
// Useful for testing loading states

async simulateNetworkDelay(ms = 300): Promise<void> {
  const shouldDelay = (
    import.meta.env.VITE_DEV_MOCK_DELAY as string
  )?.toLowerCase() === "true";
  
  if (shouldDelay) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage:
// VITE_DEV_MOCK_DELAY=true  → 300ms delay
// VITE_DEV_MOCK_DELAY=false → Instant response
```

---

## Security Considerations

### 1. Dev Code Isolation

**Goal**: Ensure dev code never reaches production

**Implementation**:
- All dev imports are behind feature flags
- Vite tree-shaking removes unreachable code
- Environment variables are build-time constants

```typescript
// This is safe - unreachable code is eliminated
if (devConfig.isDevMode()) {  // Always false in production
  // This entire block is removed from production bundle
  devAuth.initDevSession();
}
```

**Verification**:
```bash
npm run build
# Check that dev modules are not in dist/
grep -r "dev-config\|dev-auth\|dev-api" dist/ || echo "No dev code found"
```

### 2. No Credentials Stored

**Current Implementation**:
- Mock tokens are generated client-side
- No real credentials are ever stored
- localStorage structure mirrors production (for compatibility)

**Safe Practice**:
- Never commit `.env.development` with real credentials
- Use `.gitignore` to prevent accidental commits

```bash
# .gitignore (ensure this exists)
.env
.env.local
.env.*.local
.env.development  # Optional: if it contains secrets
```

### 3. Protected Routes Can't Be Bypassed in Production

```typescript
// In ProtectedRoute.tsx
export function CCProtectedRoute({ children }: ProtectedRouteProps) {
  // This check only passes if VITE_DEV_MODE=true
  if (devConfig.isDevMode()) {
    return <>{children}</>;
  }

  // Production always goes here ↓
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  // ... real access checks ...
}
```

Production builds have `VITE_DEV_MODE` set to `false`, making all dev bypasses impossible.

### 4. API Validation Still Occurs

Even with mock API in dev mode, real API will validate:
- Request structure
- Authorization
- Data types
- Business logic

Switching from mock to real API should require minimal changes (if any).

---

## Performance Optimization

### 1. Mock Data Caching

Mock data is generated on-demand. For frequently accessed data, consider caching:

```typescript
// In dev-api-mocks.ts
private userProfileCache: UserProfile | null = null;

createUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  if (!this.userProfileCache) {
    this.userProfileCache = {
      // ... create profile
    };
  }
  return { ...this.userProfileCache, ...overrides };
}
```

### 2. Lazy Loading Mock Endpoints

Register only endpoints you're actually using:

```typescript
// In dev-api-proxy.ts
const mockEndpoints: Record<string, ...> = {
  // Only register endpoints you're working on
  "/api/auth/me": () => mockApiFactory.createUserProfile(),
  "/api/cc/dashboard/summary": (params) => 
    mockApiFactory.createDashboardSummary(params?.window),
  // Comment out unused endpoints to reduce memory
};
```

### 3. Network Delay Tuning

Adjust mock delay to your needs:

```javascript
// DevTools - test with different delays
import { apiProxy } from "@/lib/dev/dev-api-proxy";
await apiProxy.simulateNetworkDelay(100);  // Fast
await apiProxy.simulateNetworkDelay(500);  // Slow connection
```

---

## Testing Strategy

### Unit Tests for Dev Modules

```typescript
// Example: test-dev-config.ts
import { devConfig } from "@/lib/dev/dev-config";

describe("devConfig", () => {
  beforeEach(() => {
    // Mock environment variables
    vi.stubEnv("VITE_DEV_MODE", "true");
    vi.stubEnv("VITE_USE_MOCK_API", "true");
  });

  it("should detect dev mode is enabled", () => {
    expect(devConfig.isDevMode()).toBe(true);
  });

  it("should detect mock API is enabled", () => {
    expect(devConfig.useMockApi()).toBe(true);
  });

  it("should return consistent mock user ID", () => {
    expect(devConfig.getMockUserId()).toBe(1);
  });
});
```

### Integration Tests

```typescript
// Example: test-api-proxy.ts
import { apiProxy } from "@/lib/dev/dev-api-proxy";

describe("apiProxy", () => {
  it("should intercept mocked endpoints", async () => {
    const response = await apiProxy.interceptRequest(
      "/api/auth/me",
      {},
      async () => {
        throw new Error("Real API should not be called");
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.username).toBe("dev_user");
  });

  it("should fall back to real API for unmocked endpoints", async () => {
    let realApiCalled = false;

    const response = await apiProxy.interceptRequest(
      "/api/unknown-endpoint",
      {},
      async () => {
        realApiCalled = true;
        return new Response(JSON.stringify({}), { status: 200 });
      }
    );

    expect(realApiCalled).toBe(true);
  });
});
```

### Manual Testing Checklist

- [ ] Enable dev mode: `VITE_DEV_MODE=true`
- [ ] Use mock API: `VITE_USE_MOCK_API=true`
- [ ] Check console logs show dev initialization
- [ ] Verify localStorage has auth tokens
- [ ] Access /dashboard without login
- [ ] Switch to PAYG user role
- [ ] Disable mock API and test with real backend
- [ ] Build for production and verify dev code is removed

---

## Configuration File Examples

### Development Configuration

```bash
# .env.development (for UI-only development)
VITE_DEV_MODE=true
VITE_USE_MOCK_API=true
VITE_DEV_MOCK_DELAY=true
VITE_API_URL=
VITE_WS_URL=
```

### Integration Configuration

```bash
# .env.development (when backend is available)
VITE_DEV_MODE=true
VITE_USE_MOCK_API=false
VITE_API_URL=https://your-cloudflare-tunnel-url.com
VITE_WS_URL=
```

### Production Configuration

```bash
# Build process (via Vercel env vars or .env.production)
VITE_DEV_MODE=false
VITE_USE_MOCK_API=false
VITE_API_URL=https://voiceagent.rebortai.com
```

---

## Future Enhancements

### Potential Improvements

1. **Persistent Mock Data Storage**: Save mock data modifications across page reloads
2. **Mock API Requests**: Intercept POST/PUT/DELETE and simulate state changes
3. **Network Failure Simulation**: Test error handling
4. **Performance Profiling**: Measure mock vs real API performance
5. **Snapshot Testing**: Version and diff mock data across releases
6. **Mock Data Fixtures**: Load predefined datasets for specific test scenarios
7. **Visual Diff Tool**: Compare real API response with mock data

---

**End of Advanced Architecture Guide**
