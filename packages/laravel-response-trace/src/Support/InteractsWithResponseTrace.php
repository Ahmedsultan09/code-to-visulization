<?php

declare(strict_types=1);

namespace CodeToVisualization\ResponseTrace\Support;

use CodeToVisualization\ResponseTrace\TraceContext;
use CodeToVisualization\ResponseTrace\TraceRecorder;
use CodeToVisualization\ResponseTrace\TraceRedactor;

trait InteractsWithResponseTrace
{
    protected function trace(): TraceRecorder
    {
        $redactor = app(TraceRedactor::class);

        $context = app()->bound(TraceContext::class)
            ? app(TraceContext::class)
            : TraceContext::disabled($redactor);

        return new TraceRecorder($context, $this, $redactor);
    }
}
