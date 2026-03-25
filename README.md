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

## 📜 License
Private / Proprietary.
