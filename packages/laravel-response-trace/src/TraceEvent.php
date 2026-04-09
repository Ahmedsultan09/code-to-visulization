<?php

declare(strict_types=1);

namespace CodeToVisualization\ResponseTrace;

/**
 * Immutable record for a single trace step (flat event log).
 */
final class TraceEvent
{
    /**
     * @param  array<string, mixed>|null  $detail
     */
    public function __construct(
        public readonly string $path,
        public readonly string $action,
        public readonly string $source,
        public readonly ?string $condition,
        public readonly string $outcome,
        public readonly ?array $detail = null,
        public readonly ?string $t = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $row = [
            'path' => $this->path,
            'action' => $this->action,
            'source' => $this->source,
            'condition' => $this->condition,
            'outcome' => $this->outcome,
        ];

        if ($this->detail !== null) {
            $row['detail'] = $this->detail;
        }

        if ($this->t !== null) {
            $row['t'] = $this->t;
        }

        return $row;
    }
}
