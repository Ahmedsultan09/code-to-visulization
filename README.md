# code-to-visualization

Monorepo for a **Laravel JsonResource response tracing** package and a **React + Tailwind** viewer.

The viewer has two modes:

1. **Understand API (from code)** — Paste PHP (`JsonResource` / `TracedJsonResource`). The app explains which fields can appear and under which rules, in plain language for designers and PMs. Analysis runs entirely in the browser.
2. **Request details (for developers)** — Paste API JSON that includes `_trace` to inspect per-request field timelines (engineers debugging the Laravel middleware).

## What to install (to run or share the viewer)

1. **[Node.js](https://nodejs.org/) (LTS)** — runs the React app and `npm` scripts.
2. **npm** — comes with Node; use it for `npm install` in `frontend/`.
3. **Git** — optional; typical for cloning this repo.
4. **[ngrok](https://ngrok.com/)** (only if you want a public link without deploying) — [create an account](https://ngrok.com/) and install the [ngrok agent](https://ngrok.com/download).

**Designers** who only receive an ngrok or hosted URL need **only a web browser** for the “Understand API” tab.

**Optional for the developer tab:** a Laravel app with the response-trace middleware and a captured JSON body that includes `_trace`.

## Run the React viewer locally

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (default **http://localhost:5173**). The dev server binds to **all interfaces** (`0.0.0.0`) so tools like ngrok can reach it.

## Share the viewer with ngrok

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for step-by-step ngrok commands (dev and preview), ports **5173** / **4173**, and security notes.

## Run the PHP package locally (sandbox)

### Option A: Laravel Herd (macOS, easiest)

1. Install [Laravel Herd](https://herd.laravel.com/) and finish its first-run setup (it installs PHP, Composer, and DNS for `.test` sites).
2. Open a **new** terminal so `php` and `composer` come from Herd (or use **Herd → Open terminal** if you use that).
3. From this repo root:

```bash
./scripts/bootstrap-laravel-sandbox.sh
```

4. Point Herd at the Laravel app (document root must be `sandbox/public`):

   - **CLI:** `cd sandbox && herd link response-trace` (pick any name; the site becomes `https://response-trace.test`).
   - **GUI:** Herd → **Sites** → **+** → choose the **`sandbox`** folder. Herd detects Laravel and serves `public/`.

5. Open:

`https://<your-site>.test/trace-demo?debug=1`

Example: `https://response-trace.test/trace-demo?debug=1`

You should see JSON with `data` and `_trace`. Herd uses HTTPS on `.test` by default.

You do **not** need `php artisan serve` when using Herd.

### Option B: PHP + Composer (no Herd)

You need **PHP 8.2+** and **Composer**, or **Docker** (the script falls back to the `composer:2` image).

```bash
./scripts/bootstrap-laravel-sandbox.sh
cd sandbox
php artisan serve
```

Then open [http://127.0.0.1:8000/trace-demo?debug=1](http://127.0.0.1:8000/trace-demo?debug=1).

**Docker-only:** ensure Docker is running; the script will use `docker run … composer:2` when `composer` is not on your PATH.

**Composer via Docker Compose:**

```bash
docker compose run --rm composer install --working-dir=packages/laravel-response-trace
```

## Laravel package

See [packages/laravel-response-trace/README.md](packages/laravel-response-trace/README.md).

- Per-request `TraceContext`, `TraceRecorder` API (`field`, `when`, `merge`, `whenGate`, `recordEnum`, `child`)
- Middleware attaches `_trace` to JSON responses and sets `X-Trace-Id`
- Pilot example: [packages/laravel-response-trace/examples/ExampleCampaignResource.php](packages/laravel-response-trace/examples/ExampleCampaignResource.php)

## Response shape (when tracing is enabled)

JSON responses can include a top-level `_trace` object alongside `data` (for wrapped `JsonResource` responses), with `fields` (dot-path keys and timelines) and optional `events` (flat chronological log).
