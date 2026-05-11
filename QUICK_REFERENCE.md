# 🎯 Dev Mode Quick Reference

## One-Liner Start

```bash
npm run dev   # Done! Auto-logs in with mock data
```

---

## Environment Variables Cheat Sheet

| Variable | Value | Effect |
|----------|-------|--------|
| `VITE_DEV_MODE` | `true` | Enable dev features |
| `VITE_USE_MOCK_API` | `true` | Use fake API data |
| `VITE_DEV_MOCK_DELAY` | `true` | Simulate 300ms network delay |
| `VITE_API_URL` | URL | Backend URL (leave empty for local) |
| `VITE_WS_URL` | URL | WebSocket URL (auto-derived if empty) |

---

## Console Commands

### View Dev Session Info
```javascript
import { devAuth } from "@/lib/dev/dev-auth";
devAuth.logDevSession();
```

### View Configuration
```javascript
import { devConfig } from "@/lib/dev/dev-config";
devConfig.logConfig();
```

### View API Proxy Status
```javascript
import { apiProxy } from "@/lib/dev/dev-api-proxy";
apiProxy.logConfig();
```

### Switch to PAYG User
```javascript
import { devAuth } from "@/lib/dev/dev-auth";
devAuth.updateDevProfile({
  is_admin: false,
  command_center_access: false,
});
```

### Switch to Admin User
```javascript
import { devAuth } from "@/lib/dev/dev-auth";
devAuth.updateDevProfile({
  is_admin: true,
  command_center_access: true,
});
```

### Clear Dev Session
```javascript
import { devAuth } from "@/lib/dev/dev-auth";
devAuth.clearDevSession();
location.reload();
```

### Test Mock API
```javascript
fetch("/api/cc/dashboard/summary?window=week")
  .then(r => r.json())
  .then(console.log);
```

---

## Common Workflows

### Scenario 1: Pure UI Development
```bash
# .env.development
VITE_DEV_MODE=true
VITE_USE_MOCK_API=true

npm run dev
# → Auto-logged in, instant API responses
```

### Scenario 2: Integration Testing
```bash
# .env.development
VITE_DEV_MODE=true
VITE_USE_MOCK_API=false
VITE_API_URL=https://your-cloudflare-url.com

npm run dev
# → Connects to real backend via tunnel
```

### Scenario 3: Loading States Testing
```bash
# .env.development
VITE_DEV_MODE=true
VITE_USE_MOCK_API=true
VITE_DEV_MOCK_DELAY=true

npm run dev
# → 300ms delay on each API call for UX testing
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/dev/dev-config.ts` | Feature flags & settings |
| `src/lib/dev/dev-auth.ts` | Mock authentication |
| `src/lib/dev/dev-api-mocks.ts` | Mock data factory |
| `src/lib/dev/dev-api-proxy.ts` | Request routing |
| `src/lib/auth.ts` | Modified auth module |
| `src/components/ProtectedRoute.tsx` | Modified route guards |
| `.env.development` | Dev environment config |

---

## Documentation

| File | Content |
|------|---------|
| `DEV_GUIDE.md` | Complete development guide |
| `ARCHITECTURE.md` | Technical deep-dive |
| `QUICK_REFERENCE.md` | This file |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Not auto-logging in | Check `VITE_DEV_MODE=true` in `.env.development` |
| Real API 401 errors | Try `VITE_USE_MOCK_API=true` to verify dev mode works |
| Mock API returns empty | Check endpoint is in `mockEndpoints` in `dev-api-proxy.ts` |
| Changes not taking effect | Clear browser cache: DevTools → Application → Clear all |
| Backend timeout | Try `VITE_USE_MOCK_API=true` or check Cloudflare Tunnel is running |

---

## Key Concepts

- **Dev Mode**: Frontend-only development without backend
- **Mock API**: Fake responses that mimic real API structure
- **Auth Bypass**: Automatic login in dev mode
- **API Proxy**: Intercepts requests and routes to mock or real API
- **Environment Variables**: Control dev behavior without code changes

---

## Production Safety

✅ All dev code is removed from production builds via Vite tree-shaking

✅ Production builds have `VITE_DEV_MODE=false` (set by build system)

✅ No secrets are stored locally

✅ Can safely commit `.env.development` (it contains no real credentials)

---

## Team Setup

1. Clone repo
2. Dev mode is already configured in `.env.development`
3. Run `npm run dev`
4. ✅ Ready to go!

---

## For More Info

- See `DEV_GUIDE.md` for detailed walkthrough
- See `ARCHITECTURE.md` for technical details
- See inline comments in `src/lib/dev/` files
