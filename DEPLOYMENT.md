# Sharing the viewer with ngrok

The React app runs on your machine (or CI) and can be shared over the public internet with [ngrok](https://ngrok.com/) so teammates only need a browser.

## What designers need

- A modern web browser.
- The **https** link you send them (from ngrok).

They do **not** need Node.js, ngrok, PHP, or Laravel to use **Understand API (from code)**.

## Path A: Dev server + ngrok (fastest for demos)

1. Install [Node.js LTS](https://nodejs.org/) and the [ngrok agent](https://ngrok.com/download) (and sign in to ngrok).
2. From the repo:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Vite listens on **http://0.0.0.0:5173** (see [frontend/vite.config.ts](frontend/vite.config.ts)).
4. In another terminal:

   ```bash
   ngrok http 5173
   ```

5. Share the **https** forwarding URL (for example `https://xxxx.ngrok-free.app`).

## Path B: Production build + preview + ngrok

1. Build and preview:

   ```bash
   cd frontend
   npm install
   npm run build
   npm run preview
   ```

2. Preview listens on **http://0.0.0.0:4173** by default.
3. Run:

   ```bash
   ngrok http 4173
   ```

## Security expectations

- The tunnel exposes whatever is running on that port to the internet. Use this for **non-secret** demos, or lock down access with [ngrok OAuth](https://ngrok.com/docs/http/oauth/) or IP allowlists if needed.
- **Pasted PHP or JSON stays in the browser** (nothing is uploaded to your servers by this viewer). Anyone who has the ngrok URL can still **open the app** and use it locally in their session.
- Do not leave a tunnel open longer than necessary.

## Optional: static hosting

You can deploy `frontend/dist` to Netlify, Vercel, S3 + CloudFront, or any static host and share that URL instead of ngrok—no tunnel required.
