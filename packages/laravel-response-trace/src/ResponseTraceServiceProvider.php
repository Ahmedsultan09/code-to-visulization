<?php

declare(strict_types=1);

namespace CodeToVisualization\ResponseTrace;

use CodeToVisualization\ResponseTrace\Http\Middleware\ResponseTraceMiddleware;
use Illuminate\Support\ServiceProvider;

final class ResponseTraceServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/response_trace.php', 'response_trace');

        $this->app->singleton(TraceRedactor::class, function () {
            return new TraceRedactor(
                captureValues: (bool) config('response_trace.capture_values', false),
                redactByDefault: (bool) config('response_trace.redact_by_default', true),
            );
        });

        $this->app->singleton(TraceResponseEnricher::class);
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__.'/../config/response_trace.php' => config_path('response_trace.php'),
        ], 'response-trace-config');

        $router = $this->app['router'];
        $router->aliasMiddleware('response.trace', ResponseTraceMiddleware::class);
    }
}
