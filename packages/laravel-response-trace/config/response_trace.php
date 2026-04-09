<?php

return [

    'enabled' => env('RESPONSE_TRACE_ENABLED', false),

    /*
     * When true, a request must also send the query param or header below.
     * When false and enabled is true, every JSON response is traced (use only locally).
     */
    'require_request_flag' => env('RESPONSE_TRACE_REQUIRE_FLAG', true),

    'query_param' => env('RESPONSE_TRACE_QUERY_PARAM', 'debug'),

    'header' => env('RESPONSE_TRACE_HEADER', 'X-Response-Trace'),

    'capture_values' => env('RESPONSE_TRACE_CAPTURE_VALUES', false),

    'redact_by_default' => env('RESPONSE_TRACE_REDACT', true),

    'max_timeline_entries_per_field' => (int) env('RESPONSE_TRACE_MAX_TIMELINE', 50),

    'emit_flat_events' => env('RESPONSE_TRACE_EMIT_EVENTS', true),

];
