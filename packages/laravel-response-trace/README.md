# Laravel Response Trace

Opt-in tracing for `JsonResource` responses: records field inclusion, overrides, permission branches, and enum branches, exposed as `_trace` on JSON responses when enabled.

## Try it in this repo

From the monorepo root, run `./scripts/bootstrap-laravel-sandbox.sh` (PHP + Composer from [Laravel Herd](https://herd.laravel.com/) works well on macOS, or use Docker).

**Herd:** `cd sandbox && herd link response-trace` → open `https://response-trace.test/trace-demo?debug=1`.

**Plain PHP:** `cd sandbox && php artisan serve` → `http://127.0.0.1:8000/trace-demo?debug=1`.

## Install

In your Laravel app `composer.json`:

```json
"repositories": [
  { "type": "path", "url": "../packages/laravel-response-trace" }
],
"require": {
  "code-to-visualization/laravel-response-trace": "*"
}
```

Register the provider (Laravel 11+ auto-discovers `extra.laravel.providers` when using Composer path/repo install). Publish config:

```bash
php artisan vendor:publish --tag=response-trace-config
```

Register the middleware so `terminate()` runs and `_trace` is attached. **Laravel 11+** (`bootstrap/app.php`):

```php
->withMiddleware(function (Illuminate\Foundation\Configuration\Middleware $middleware) {
    $middleware->append(\CodeToVisualization\ResponseTrace\Http\Middleware\ResponseTraceMiddleware::class);
})
```

Or add the alias to a group in `bootstrap/app.php`:

```php
$middleware->alias([
    'response.trace' => \CodeToVisualization\ResponseTrace\Http\Middleware\ResponseTraceMiddleware::class,
]);
```

Then append `response.trace` to your `api` middleware group if you prefer route-scoped tracing.

**Laravel 10:** append `\CodeToVisualization\ResponseTrace\Http\Middleware\ResponseTraceMiddleware::class` to `$middleware` in `App\Http\Kernel`.

## Configure

`.env`:

```
RESPONSE_TRACE_ENABLED=true
RESPONSE_TRACE_REQUIRE_FLAG=true
RESPONSE_TRACE_QUERY_PARAM=debug
```

With `REQUIRE_FLAG=true`, tracing runs only when `?debug=1` (or your param) or header `X-Response-Trace: 1` is present **and** `enabled` is true.

Set `RESPONSE_TRACE_REQUIRE_FLAG=false` locally to trace every response (do not use in production).

Optional: `RESPONSE_TRACE_CAPTURE_VALUES=true` to embed raw values in previews (keep off outside trusted environments).

## Usage

1. Use the `InteractsWithResponseTrace` trait on a `JsonResource`, or extend `TracedJsonResource`.
2. Replace plain array fragments with `$this->trace()->field()`, `when()`, `merge()`, `whenGate()`, `recordEnum()`, and `child()` as needed.
3. Issue API requests with `?debug=1` (or configured header).

See `examples/ExampleCampaignResource.php` for a full pilot resource.

## Response shape

Successful JSON responses gain a sibling `_trace` object (alongside `data` for wrapped resources) with `fields`, `events` (if enabled), `requestId`, and timing metadata. `X-Trace-Id` is set to `requestId` when tracing is active.
