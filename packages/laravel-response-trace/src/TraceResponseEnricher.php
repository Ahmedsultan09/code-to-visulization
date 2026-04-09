<?php

declare(strict_types=1);

namespace CodeToVisualization\ResponseTrace;

use Illuminate\Http\JsonResponse;

final class TraceResponseEnricher
{
    public function attach(JsonResponse $response, TraceContext $context): void
    {
        if (! $context->isEnabled()) {
            return;
        }

        $payload = $response->getData(true);

        if (! is_array($payload)) {
            return;
        }

        $trace = $context->toTracePayload();
        $payload['_trace'] = $trace;
        $response->setData($payload);

        if (isset($trace['requestId'])) {
            $response->headers->set('X-Trace-Id', (string) $trace['requestId']);
        }
    }
}
