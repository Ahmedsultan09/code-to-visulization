<?php

declare(strict_types=1);

namespace CodeToVisualization\ResponseTrace;

use Illuminate\Http\Resources\Json\JsonResource;

final class TraceContext
{
    /** @var list<string> */
    private array $prefixStack = [];

    /** @var list<TraceEvent> */
    private array $flatEvents = [];

    /**
     * Shadow payload built in call order (mirrors array_merge / field order).
     *
     * @var array<string, mixed>
     */
    private array $shadow = [];

    /**
     * @var array<string, list<array<string, mixed>>>
     */
    private array $timelines = [];

    private ?string $resourceClass = null;

    private readonly float $startedAt;

    public function __construct(
        private readonly bool $enabled,
        private readonly string $requestId,
        private readonly TraceRedactor $redactor,
        private readonly int $maxTimelinePerField,
        private readonly bool $emitFlatEvents,
    ) {
        $this->startedAt = microtime(true);
    }

    public static function disabled(TraceRedactor $redactor): self
    {
        return new self(
            enabled: false,
            requestId: '',
            redactor: $redactor,
            maxTimelinePerField: 50,
            emitFlatEvents: false,
        );
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function setResourceIfNull(JsonResource $resource): void
    {
        if ($this->resourceClass !== null) {
            return;
        }

        $this->resourceClass = $resource::class;
    }

    /**
     * @param  callable(): mixed  $callback
     */
    public function withChildPrefix(string $segment, callable $callback): mixed
    {
        if (! $this->enabled) {
            return $callback();
        }

        $this->prefixStack[] = $segment;

        try {
            return $callback();
        } finally {
            array_pop($this->prefixStack);
        }
    }

    /**
     * @return list<string>
     */
    public function currentPrefix(): array
    {
        return $this->prefixStack;
    }

    public function qualifyKey(string $key): string
    {
        return FieldPath::qualify($this->prefixStack, $key);
    }

    /**
     * @param  array<string, mixed>|null  $detail
     * @param  array<string, mixed>|null  $valuePreview
     */
    public function recordTimeline(
        string $path,
        string $action,
        string $source,
        ?string $condition,
        string $outcome,
        ?array $detail = null,
        ?array $valuePreview = null,
    ): void {
        if (! $this->enabled) {
            return;
        }

        $t = $this->nowIso();
        $entry = [
            't' => $t,
            'action' => $action,
            'source' => $source,
            'condition' => $condition,
            'outcome' => $outcome,
        ];

        if ($detail !== null) {
            $entry['detail'] = $detail;
        }

        if ($valuePreview !== null) {
            $entry['valuePreview'] = $valuePreview;
        }

        if (! isset($this->timelines[$path])) {
            $this->timelines[$path] = [];
        }

        $this->timelines[$path][] = $entry;

        if (count($this->timelines[$path]) > $this->maxTimelinePerField) {
            $this->timelines[$path] = array_slice($this->timelines[$path], -$this->maxTimelinePerField);
        }

        if ($this->emitFlatEvents) {
            $this->flatEvents[] = new TraceEvent(
                path: $path,
                action: $action,
                source: $source,
                condition: $condition,
                outcome: $outcome,
                detail: $detail,
                t: $t,
            );
        }
    }

    /**
     * @param  array<string, mixed>  $fragment
     */
    public function applyShadowFragment(array $fragment): void
    {
        foreach ($fragment as $k => $v) {
            $this->shadow[(string) $k] = $v;
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function shadow(): array
    {
        return $this->shadow;
    }

    /**
     * @return array<string, mixed>
     */
    public function toTracePayload(): array
    {
        if (! $this->enabled) {
            return [];
        }

        $fields = [];

        foreach ($this->timelines as $path => $timeline) {
            $included = array_key_exists($path, $this->shadow);
            $fields[$path] = [
                'included' => $included,
                'timeline' => $timeline,
            ];

            if ($included) {
                $fields[$path]['finalValuePreview'] = $this->redactor->preview($this->shadow[$path]);
            }
        }

        $payload = [
            'version' => 1,
            'requestId' => $this->requestId,
            'enabled' => true,
            'resource' => $this->resourceClass,
            'durationMs' => round((microtime(true) - $this->startedAt) * 1000, 3),
            'fields' => $fields,
        ];

        if ($this->emitFlatEvents) {
            $payload['events'] = array_map(static fn (TraceEvent $e) => $e->toArray(), $this->flatEvents);
        }

        return $payload;
    }

    private function nowIso(): string
    {
        return gmdate('c');
    }
}
