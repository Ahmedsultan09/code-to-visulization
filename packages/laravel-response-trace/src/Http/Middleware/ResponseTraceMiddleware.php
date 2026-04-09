<?php

declare(strict_types=1);

namespace CodeToVisualization\ResponseTrace\Http\Middleware;

use Closure;
use CodeToVisualization\ResponseTrace\TraceContext;
use CodeToVisualization\ResponseTrace\TraceRedactor;
use CodeToVisualization\ResponseTrace\TraceResponseEnricher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class ResponseTraceMiddleware
{
    public function __construct(
        private readonly TraceRedactor $redactor,
        private readonly TraceResponseEnricher $enricher,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $enabled = $this->shouldEnable($request);

        $context = new TraceContext(
            enabled: $enabled,
            requestId: (string) Str::uuid(),
            redactor: $this->redactor,
            maxTimelinePerField: (int) config('response_trace.max_timeline_entries_per_field', 50),
            emitFlatEvents: (bool) config('response_trace.emit_flat_events', true),
        );

        app()->instance(TraceContext::class, $context);

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if (! app()->bound(TraceContext::class)) {
            return;
        }

        $context = app(TraceContext::class);

        if (! $context->isEnabled()) {
            return;
        }

        if ($response instanceof JsonResponse) {
            $this->enricher->attach($response, $context);
        }
    }

    private function shouldEnable(Request $request): bool
    {
        if (! (bool) config('response_trace.enabled', false)) {
            return false;
        }

        $param = (string) config('response_trace.query_param', 'debug');
        $header = (string) config('response_trace.header', 'X-Response-Trace');
        $headerVal = strtolower((string) $request->header($header));
        $requestWantsTrace = $request->boolean($param)
            || in_array($headerVal, ['1', 'true', 'yes'], true);

        if ((bool) config('response_trace.require_request_flag', true)) {
            return $requestWantsTrace;
        }

        return true;
    }
}
