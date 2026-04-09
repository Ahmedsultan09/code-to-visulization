<?php

declare(strict_types=1);

namespace CodeToVisualization\ResponseTrace;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;
use UnitEnum;

final class TraceRecorder
{
    public function __construct(
        private readonly TraceContext $context,
        private readonly JsonResource $resource,
        private readonly TraceRedactor $redactor,
    ) {
        $this->context->setResourceIfNull($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function field(string $key, mixed $value, string $source = 'default', ?string $condition = null): array
    {
        if (! $this->context->isEnabled()) {
            return [$key => $value];
        }

        $path = $this->context->qualifyKey($key);
        $preview = $this->redactor->preview($value);

        $this->context->recordTimeline(
            path: $path,
            action: 'set',
            source: $source,
            condition: $condition,
            outcome: 'included',
            valuePreview: $preview,
        );

        $this->context->applyShadowFragment([$path => $value]);

        return [$key => $value];
    }

    /**
     * @param  callable(): array<string, mixed>  $then
     * @param  (callable(): array<string, mixed>)|null  $else
     * @return array<string, mixed>
     */
    public function when(
        string $conditionLabel,
        bool $condition,
        callable $then,
        ?callable $else = null,
        string $source = 'default',
    ): array {
        if (! $this->context->isEnabled()) {
            return $condition ? $then() : ($else !== null ? $else() : []);
        }

        if ($condition) {
            $fragment = $then();
            foreach (array_keys($fragment) as $childKey) {
                $path = $this->context->qualifyKey((string) $childKey);
                $this->recordMergeKey(
                    path: $path,
                    source: $source,
                    condition: $conditionLabel,
                    value: $fragment[(string) $childKey],
                );
            }
            $this->context->applyShadowFragment(
                $this->qualifyFragmentKeys($fragment),
            );

            return $fragment;
        }

        $this->context->recordTimeline(
            path: $this->context->qualifyKey('_branch'),
            action: 'when',
            source: $source,
            condition: $conditionLabel,
            outcome: 'excluded',
            detail: ['branch' => 'then'],
        );

        if ($else !== null) {
            $fragment = $else();
            foreach (array_keys($fragment) as $childKey) {
                $path = $this->context->qualifyKey((string) $childKey);
                $this->recordMergeKey(
                    path: $path,
                    source: $source,
                    condition: $conditionLabel,
                    value: $fragment[(string) $childKey],
                );
            }
            $this->context->applyShadowFragment(
                $this->qualifyFragmentKeys($fragment),
            );

            return $fragment;
        }

        return [];
    }

    /**
     * @param  callable(): array<string, mixed>  $then
     * @param  (callable(): array<string, mixed>)|null  $else
     * @param  array<string, mixed>|null  $arguments  Passed to Gate::allows as authorization arguments
     * @return array<string, mixed>
     */
    public function whenGate(
        string $ability,
        mixed $arguments,
        callable $then,
        ?callable $else = null,
        string $source = 'permission_block',
    ): array {
        $allowed = Gate::allows($ability, $arguments);
        $conditionLabel = "Gate::allows('{$ability}', ...)";

        if (! $this->context->isEnabled()) {
            return $allowed ? $then() : ($else !== null ? $else() : []);
        }

        $detail = [
            'gate' => $ability,
            'allowed' => $allowed,
            'arguments' => $this->stringifyGateArguments($arguments),
        ];

        if ($allowed) {
            $fragment = $then();
            foreach (array_keys($fragment) as $childKey) {
                $path = $this->context->qualifyKey((string) $childKey);
                $this->recordMergeKey(
                    path: $path,
                    source: $source,
                    condition: $conditionLabel,
                    value: $fragment[(string) $childKey],
                    action: 'gate',
                    extraDetail: $detail,
                );
            }
            $this->context->applyShadowFragment(
                $this->qualifyFragmentKeys($fragment),
            );

            return $fragment;
        }

        $fragment = $else !== null ? $else() : [];
        if ($fragment !== []) {
            foreach (array_keys($fragment) as $childKey) {
                $path = $this->context->qualifyKey((string) $childKey);
                $this->recordMergeKey(
                    path: $path,
                    source: $source,
                    condition: $conditionLabel,
                    value: $fragment[(string) $childKey],
                    action: 'gate',
                    extraDetail: $detail,
                );
            }
            $this->context->applyShadowFragment(
                $this->qualifyFragmentKeys($fragment),
            );
        } else {
            $this->context->recordTimeline(
                path: $this->context->qualifyKey('_gate:'.$ability),
                action: 'gate',
                source: $source,
                condition: $conditionLabel,
                outcome: 'excluded',
                detail: $detail,
            );
        }

        return $fragment;
    }

    /**
     * Record enum branch and return payload fragment (use inside match() arms).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function recordEnum(UnitEnum $enum, string $source, array $data, ?string $condition = null): array
    {
        if (! $this->context->isEnabled()) {
            return $data;
        }

        $enumClass = $enum::class;
        $caseLabel = $enum instanceof \BackedEnum
            ? (string) $enum->value
            : $enum->name;

        $detail = [
            'enum' => $enumClass,
            'case' => $caseLabel,
        ];

        $cond = $condition ?? "{$enumClass}::{$caseLabel}";

        foreach ($data as $childKey => $value) {
            $path = $this->context->qualifyKey((string) $childKey);
            $this->recordMergeKey(
                path: $path,
                source: $source,
                condition: $cond,
                value: $value,
                action: 'enum',
                extraDetail: $detail,
            );
        }

        $this->context->applyShadowFragment($this->qualifyFragmentKeys($data));

        return $data;
    }

    /**
     * @param  callable(): mixed  $callback
     */
    public function child(string $segment, callable $callback): mixed
    {
        return $this->context->withChildPrefix($segment, $callback);
    }

    /**
     * @return array<string, mixed>
     */
    public function merge(string $source, array $data, ?string $condition = null): array
    {
        if (! $this->context->isEnabled()) {
            return $data;
        }

        foreach ($data as $key => $value) {
            $path = $this->context->qualifyKey((string) $key);
            $this->recordMergeKey(
                path: $path,
                source: $source,
                condition: $condition,
                value: $value,
            );
        }

        $this->context->applyShadowFragment(
            $this->qualifyFragmentKeys($data),
        );

        return $data;
    }

    private function recordMergeKey(
        string $path,
        string $source,
        ?string $condition,
        mixed $value,
        string $action = 'merge',
        ?array $extraDetail = null,
    ): void {
        $had = array_key_exists($path, $this->context->shadow());
        $detail = $extraDetail ?? [];
        if ($had) {
            $detail['previousValuePreview'] = $this->redactor->safePreview($this->context->shadow()[$path]);
        }

        $this->context->recordTimeline(
            path: $path,
            action: $action,
            source: $source,
            condition: $condition,
            outcome: $had ? 'override' : 'included',
            detail: $detail === [] ? null : $detail,
            valuePreview: $this->redactor->preview($value),
        );
    }

    /**
     * @param  array<string, mixed>  $fragment
     * @return array<string, mixed>
     */
    private function qualifyFragmentKeys(array $fragment): array
    {
        $out = [];
        foreach ($fragment as $k => $v) {
            $out[$this->context->qualifyKey((string) $k)] = $v;
        }

        return $out;
    }

    private function stringifyGateArguments(mixed $arguments): string
    {
        if (is_object($arguments)) {
            return $arguments::class;
        }

        if (is_array($arguments)) {
            return implode(', ', array_map(function ($v) {
                if (is_object($v)) {
                    return $v::class;
                }

                try {
                    return json_encode($v, JSON_THROW_ON_ERROR);
                } catch (\Throwable) {
                    return '[unserializable]';
                }
            }, $arguments));
        }

        if ($arguments === null) {
            return '';
        }

        return (string) $arguments;
    }
}
