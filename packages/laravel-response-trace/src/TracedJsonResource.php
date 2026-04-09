<?php

declare(strict_types=1);

namespace CodeToVisualization\ResponseTrace;

use Illuminate\Http\Resources\Json\JsonResource;
use CodeToVisualization\ResponseTrace\Support\InteractsWithResponseTrace;

/**
 * Optional base JsonResource with tracing helpers pre-wired.
 */
abstract class TracedJsonResource extends JsonResource
{
    use InteractsWithResponseTrace;
}
