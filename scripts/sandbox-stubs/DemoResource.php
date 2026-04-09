<?php

declare(strict_types=1);

namespace App\Http\Resources;

use CodeToVisualization\ResponseTrace\TracedJsonResource;

/**
 * Minimal resource to verify response tracing in the sandbox app.
 */
final class DemoResource extends TracedJsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return array_merge(
            $this->trace()->field('message', 'trace demo ok', source: 'demo'),
            $this->trace()->merge('extra', ['trace_demo' => true]),
        );
    }
}
