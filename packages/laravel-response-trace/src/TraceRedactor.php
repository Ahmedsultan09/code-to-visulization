<?php

declare(strict_types=1);

namespace CodeToVisualization\ResponseTrace;

final class TraceRedactor
{
    public function __construct(
        private readonly bool $captureValues,
        private readonly bool $redactByDefault,
    ) {}

    /**
     * @return array{type: string, length?: int, hash?: string, preview?: mixed}
     */
    public function preview(mixed $value): array
    {
        if ($this->captureValues && ! $this->redactByDefault) {
            return ['type' => $this->typeOf($value), 'preview' => $value];
        }

        return $this->safePreview($value);
    }

    /**
     * @return array{type: string, length?: int, hash?: string}
     */
    public function safePreview(mixed $value): array
    {
        if ($value === null) {
            return ['type' => 'null'];
        }

        if (is_bool($value)) {
            return ['type' => 'boolean'];
        }

        if (is_int($value)) {
            return ['type' => 'integer'];
        }

        if (is_float($value)) {
            return ['type' => 'number'];
        }

        if (is_string($value)) {
            $len = strlen($value);

            return [
                'type' => 'string',
                'length' => $len,
                'hash' => hash('xxh3', $value),
            ];
        }

        if (is_array($value)) {
            return [
                'type' => 'array',
                'length' => count($value),
            ];
        }

        if (is_object($value)) {
            return [
                'type' => 'object',
                'preview' => $value::class,
            ];
        }

        return ['type' => 'unknown'];
    }

    private function typeOf(mixed $value): string
    {
        return match (true) {
            $value === null => 'null',
            is_bool($value) => 'boolean',
            is_int($value) => 'integer',
            is_float($value) => 'number',
            is_string($value) => 'string',
            is_array($value) => 'array',
            is_object($value) => 'object',
            default => 'unknown',
        };
    }
}
