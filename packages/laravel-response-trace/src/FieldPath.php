<?php

declare(strict_types=1);

namespace CodeToVisualization\ResponseTrace;

final class FieldPath
{
    /**
     * @param  list<string>  $prefixParts
     */
    public static function qualify(array $prefixParts, string $key): string
    {
        $key = trim($key);
        if ($key === '') {
            return implode('.', $prefixParts);
        }

        if ($prefixParts === []) {
            return $key;
        }

        return implode('.', $prefixParts).'.'.$key;
    }

    public static function parent(string $dotPath): ?string
    {
        if (! str_contains($dotPath, '.')) {
            return null;
        }

        return implode('.', array_slice(explode('.', $dotPath), 0, -1));
    }
}
