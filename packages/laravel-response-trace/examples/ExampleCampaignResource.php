<?php

declare(strict_types=1);

namespace CodeToVisualization\ResponseTrace\Examples;

use CodeToVisualization\ResponseTrace\TracedJsonResource;

/**
 * Pilot resource demonstrating trace helpers. Copy into App\Http\Resources and adjust namespaces.
 *
 * @property object $resource
 */
final class ExampleCampaignResource extends TracedJsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        $model = $this->resource;

        $platform = $model->platform ?? CampaignPlatform::Facebook;

        $userFragment = $this->trace()->child('user', function () use ($model) {
            $user = $model->user ?? (object) ['name' => 'Guest', 'country' => 'US'];

            return $this->trace()->merge('nested_user', [
                'name' => $user->name,
                'country' => $user->country,
            ]);
        });

        return array_merge(
            $this->trace()->field('id', $model->id ?? null, source: 'base_block'),
            $this->trace()->field('title', $model->title ?? '', source: 'base_block'),
            $this->trace()->when(
                '$model->published === true',
                (bool) ($model->published ?? false),
                fn () => [
                    'published_at' => $model->published_at ?? null,
                ],
                source: 'published_block',
            ),
            $this->trace()->merge('seo_block', [
                'title' => $model->seo_title ?? null,
            ], condition: '$model->seo_title !== null'),
            $this->trace()->whenGate(
                'viewBudget',
                $model,
                fn () => ['budget' => $model->budget ?? null],
                source: 'permission_block',
            ),
            match ($platform) {
                CampaignPlatform::Facebook => $this->trace()->recordEnum(
                    $platform,
                    'platform_branch',
                    ['network' => 'facebook', 'pixels' => true],
                ),
                CampaignPlatform::Google => $this->trace()->recordEnum(
                    $platform,
                    'platform_branch',
                    ['network' => 'google'],
                ),
            },
            ['user' => $userFragment],
        );
    }
}
