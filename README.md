# 📦 Warehouse Scanner Frontend (Next.js)

A lightning-fast, mobile-first picking interface optimized for **Barcode & QR Code** scanning in industrial warehouse environments.

## 🚀 Features
- **Focus Trap Architecture**: Invisible input field with auto-refocus, ensuring the scanner is always ready to scan without tapping.
- **2-Scan Workflow**: Enforces "Shelf Location -> Order Box" scanning for zero-error fulfilment.
- **Mobile Steppers (+/-)**: Large, high-contrast buttons for manual quantity adjustment on tablets.
- **Substitution Support**: Real-time product search and substitution for out-of-stock items.
- **Edge Security (Proxy)**: Next.js 16 `proxy.ts` (middleware) to block non-warehouse IPs instantly.

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (Canary)
- **UI Architecture**: Tailwind CSS + Framer Motion (Animations)
- **Icons**: Lucide React
- **Notifications**: Sonner

## 🔐 Configuration (Cloud Run)
Environment variables are **"baked-in"** during the Google Cloud Build process. Ensure these are set in the Cloud Run Console variables section before deployment:

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | The production URL of your backend + `/api`. |
| `NEXT_PUBLIC_AUTH_ENABLED` | Set to `true` to enable session security. |
| `WHITELISTED_IPS` | Same as the backend list to match proxy security. |

## 📦 Deployment
Deploy with Google Cloud CLI (requires `node:20.10-alpine` base image):
```bash
gcloud builds submit --tag gcr.io/[PROJECT_ID]/scanner-frontend .
gcloud run deploy scanner-frontend --image gcr.io/[PROJECT_ID]/scanner-frontend --platform managed --port 3000
```

## 🧪 Testing Environment
The project uses **Jest** & **React Testing Library** with a "Smart Dynamic Runner".

### Primary Commands
| Command | Action |
| :--- | :--- |
| `npm test` | Run all tests in the system |
| `npm test p1` | Run Phase 1 only (Session Start) |
| `npm test p1,p2` | Run Multiple Phases (e.g., p1 and p2) |
| `npm run test:watch` | Start Jest in Watch Mode |

> [!NOTE]
> The runner is **Phase-Aware**. If you request a phase that doesn't exist (e.g., `p4`), it will stop and show you the available phases automatically!

## ⚙️ Environment Setup
Create a `.env.local` file in the root directory and configure these variables:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | The base URL of your NestJS backend. Ensure it ends with `/api`. |
| `NEXT_PUBLIC_AUTH_ENABLED` | `true` | Toggle for local session security. Set to `false` for development bypass. |
| `WHITELISTED_IPS` | `127.0.0.1, ::1, *` | IPs allowed to scan. Use `*` to allow all for local debugging. |

### Quick Start Template:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_AUTH_ENABLED=true
WHITELISTED_IPS=127.0.0.1, ::1, *
```

## 📜 License
Private / Proprietary.
