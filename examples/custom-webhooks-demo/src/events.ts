/**
 * Fake deliveries. The CircleCI bodies follow the GitHub samples in CircleCI's outbound webhooks
 * reference; the LINE bodies follow the webhook types of @line/bot-sdk. Only the fields the demo
 * reads are guaranteed to match real deliveries.
 */
export type Provider = 'circleci' | 'line';

export interface Scenario {
  id: string;
  provider: Provider;
  label: string;
  /** Extra headers besides the signature (CircleCI sends the event type in a header) */
  headers: Record<string, string>;
  body: () => unknown;
}

const now = () => new Date().toISOString();

function circleciBase(id: string) {
  return {
    id,
    happened_at: now(),
    webhook: { id: 'cf8c4fdd-0587-4da1-b4ca-4846e9640af9', name: 'Kotodayori demo' },
    project: { id: '84996744-a854-4f5e-aea3-04e2851dc1d2', name: 'webhook-service', slug: 'github/circleci/webhook-service' },
    organization: { id: 'f22b6566-597d-46d5-ba74-99ef5bb3d85c', name: 'circleci' },
    pipeline: {
      id: '1285fe1d-d3a6-44fc-8886-8979558254c4',
      number: 130,
      created_at: now(),
      trigger: { type: 'webhook' },
      vcs: { branch: 'main', revision: '1dc6aa69429bff4806ad6afe58d3d8f57e25973e', commit: { subject: 'Description of change' } },
    },
  };
}

function circleciWorkflow(status: string) {
  return {
    ...circleciBase(crypto.randomUUID()),
    type: 'workflow-completed',
    workflow: {
      id: 'fda08377-fe7e-46b1-8992-3a7aaecac9c3',
      name: 'build-test-deploy',
      status,
      created_at: now(),
      stopped_at: now(),
      url: 'https://app.circleci.com/pipelines/github/circleci/webhook-service/130/workflows/fda08377-fe7e-46b1-8992-3a7aaecac9c3',
    },
  };
}

function lineEventBase(type: string) {
  return {
    type,
    mode: 'active',
    timestamp: Date.now(),
    source: { type: 'user', userId: 'U4af4980629demo' },
    webhookEventId: `01DEMO${crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`,
    deliveryContext: { isRedelivery: false },
  };
}

const lineText = (text: string) => ({
  ...lineEventBase('message'),
  replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXCTA',
  message: { id: '444573844083572737', type: 'text', quoteToken: 'q3Plxr4AgKd...', text },
});

const lineFollow = () => ({
  ...lineEventBase('follow'),
  replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXCTA',
  follow: { isUnblocked: false },
});

const lineBody = (...events: unknown[]) => ({ destination: 'xxxxxxxxxx', events });

export const scenarios: Scenario[] = [
  {
    id: 'circleci-workflow-success',
    provider: 'circleci',
    label: 'CircleCI: workflow-completed (success)',
    headers: { 'circleci-event-type': 'workflow-completed' },
    body: () => circleciWorkflow('success'),
  },
  {
    id: 'circleci-workflow-failed',
    provider: 'circleci',
    label: 'CircleCI: workflow-completed (failed)',
    headers: { 'circleci-event-type': 'workflow-completed' },
    body: () => circleciWorkflow('failed'),
  },
  {
    id: 'circleci-job',
    provider: 'circleci',
    label: 'CircleCI: job-completed',
    headers: { 'circleci-event-type': 'job-completed' },
    body: () => ({
      ...circleciBase(crypto.randomUUID()),
      type: 'job-completed',
      workflow: {
        id: 'fda08377-fe7e-46b1-8992-3a7aaecac9c3',
        name: 'build-test-deploy',
        created_at: now(),
        stopped_at: now(),
        url: 'https://app.circleci.com/pipelines/github/circleci/webhook-service/130/workflows/fda08377-fe7e-46b1-8992-3a7aaecac9c3',
      },
      job: { id: '8b91f9a8-7975-4e60-916c-f0152ccbc937', name: 'test', number: 136, status: 'success', started_at: now(), stopped_at: now() },
    }),
  },
  {
    id: 'line-text',
    provider: 'line',
    label: 'LINE: text message',
    headers: {},
    body: () => lineBody(lineText('Hello, Kotodayori!')),
  },
  {
    id: 'line-sticker',
    provider: 'line',
    label: 'LINE: sticker message',
    headers: {},
    body: () =>
      lineBody({
        ...lineEventBase('message'),
        replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXCTA',
        message: { id: '444573844083572738', type: 'sticker', packageId: '446', stickerId: '1988', stickerResourceType: 'STATIC' },
      }),
  },
  {
    id: 'line-batch',
    provider: 'line',
    label: 'LINE: one request with 2 events (follow + text)',
    headers: {},
    body: () => lineBody(lineFollow(), lineText('Thanks for adding me')),
  },
  {
    id: 'line-unhandled',
    provider: 'line',
    label: 'LINE: image message (no handler)',
    headers: {},
    body: () =>
      lineBody({
        ...lineEventBase('message'),
        replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXCTA',
        message: { id: '444573844083572739', type: 'image', contentProvider: { type: 'line' } },
      }),
  },
];
