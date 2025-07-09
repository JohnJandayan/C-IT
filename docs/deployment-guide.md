# C-It Deployment Guide

This guide provides step-by-step instructions for deploying the C-It application to a production environment.

## 🚀 Deployment

The C-It application is designed to be deployed as two separate services: a Next.js frontend hosted on **Cloudflare Pages**, and a Django backend hosted on **Render**.

### Backend (Render)

1.  **Fork this repository.**
2.  **Create a new "Blueprint Instance" on Render.**
3.  **Connect your forked repository.**
4.  **Render will automatically detect the `render.yaml` file and configure the services.**
5.  **Set the `SECRET_KEY` environment variable in the Render dashboard for the `c-it-backend` service.**
6.  **The backend will be deployed and available at the URL provided by Render.**

### Frontend (Cloudflare Pages)

1.  **Log in to the Cloudflare dashboard and navigate to "Workers & Pages".**
2.  **Create a new application and connect your forked repository.**
3.  **Configure the build settings:**
    *   **Framework preset**: Next.js
    *   **Build command**: `npm run build`
    *   **Build output directory**: `.next`
4.  **Add an environment variable:**
    *   `NEXT_PUBLIC_API_URL`: The URL of your deployed Render backend (e.g., `https://c-it-backend.onrender.com`).
5.  **Deploy the application.**

---
*For more detailed configuration, including `render.yaml` and `_headers` files, please refer to the `docs/hosting-configuration.md` file.*