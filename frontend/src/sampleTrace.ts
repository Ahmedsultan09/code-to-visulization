import type { ApiEnvelope } from './types/trace';

export const sampleEnvelope: ApiEnvelope = {
  data: {
    id: 1,
    title: 'SEO title override',
    published_at: '2026-04-01',
    network: 'facebook',
    user: { name: 'Ada', country: 'US' },
  },
  _trace: {
    version: 1,
    requestId: '0195f0a0-0000-7000-8000-000000000001',
    enabled: true,
    resource: 'App\\Http\\Resources\\ExampleCampaignResource',
    durationMs: 4.128,
    fields: {
      id: {
        included: true,
        finalValuePreview: { type: 'integer' },
        timeline: [
          {
            t: '2026-04-08T12:00:00+00:00',
            action: 'set',
            source: 'base_block',
            condition: null,
            outcome: 'included',
            valuePreview: { type: 'integer' },
          },
        ],
      },
      title: {
        included: true,
        finalValuePreview: { type: 'string', length: 18, hash: 'abc' },
        timeline: [
          {
            t: '2026-04-08T12:00:00+00:00',
            action: 'set',
            source: 'base_block',
            condition: null,
            outcome: 'included',
          },
          {
            t: '2026-04-08T12:00:01+00:00',
            action: 'merge',
            source: 'seo_block',
            condition: '$model->seo_title !== null',
            outcome: 'override',
            detail: { previousValuePreview: { type: 'string', length: 11 } },
          },
        ],
      },
      budget: {
        included: false,
        timeline: [
          {
            action: 'gate',
            source: 'permission_block',
            condition: "Gate::allows('viewBudget', ...)",
            outcome: 'excluded',
            detail: { gate: 'viewBudget', allowed: false, arguments: 'stdClass' },
          },
        ],
      },
      'user.name': {
        included: true,
        finalValuePreview: { type: 'string', length: 3 },
        timeline: [
          {
            action: 'merge',
            source: 'nested_user',
            condition: null,
            outcome: 'included',
          },
        ],
      },
      'user.country': {
        included: true,
        finalValuePreview: { type: 'string', length: 2 },
        timeline: [
          {
            action: 'merge',
            source: 'nested_user',
            condition: null,
            outcome: 'included',
          },
        ],
      },
    },
    events: [
      {
        path: 'title',
        action: 'set',
        source: 'base_block',
        condition: null,
        outcome: 'included',
        t: '2026-04-08T12:00:00+00:00',
      },
      {
        path: 'title',
        action: 'merge',
        source: 'seo_block',
        condition: '$model->seo_title !== null',
        outcome: 'override',
        t: '2026-04-08T12:00:01+00:00',
      },
    ],
  },
};
