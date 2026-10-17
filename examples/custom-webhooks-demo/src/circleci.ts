import type { Verifier, WebhookEvent } from '@kotodayori/core';
import { hexToBytes, payloadToText, verifyHmacSha256 } from './hmac.js';

/*
 * CircleCI outbound webhooks
 * https://circleci.com/docs/guides/integration/outbound-webhooks/
 * https://circleci.com/docs/reference/outbound-webhooks-reference/
 *
 * Only the fields used in this demo are typed. CircleCI documents the payloads as open maps:
 * new fields may be added at any time.
 */
interface CircleCIPayloadBase {
  id: string;
  happened_at: string;
  webhook: { id: string; name: string };
  project: { id: string; name: string; slug: string };
  organization: { id: string; name: string };
  pipeline: {
    id: string;
    number: number;
    created_at: string;
    trigger: { type: string };
    vcs?: { branch?: string; tag?: string; revision: string; commit?: { subject: string } };
  };
}

export interface WorkflowCompletedPayload extends CircleCIPayloadBase {
  type: 'workflow-completed';
  workflow: {
    id: string;
    name: string;
    status: 'success' | 'failed' | 'error' | 'canceled' | 'unauthorized';
    created_at: string;
    stopped_at?: string;
    url: string;
  };
}

export interface JobCompletedPayload extends CircleCIPayloadBase {
  type: 'job-completed';
  workflow: { id: string; name: string; created_at: string; stopped_at?: string; url: string };
  job: {
    id: string;
    number: number;
    name: string;
    status: 'success' | 'failed' | 'canceled' | 'unauthorized';
    started_at: string;
    stopped_at?: string;
  };
}

interface CircleCIEvent<TType extends string, TPayload> extends WebhookEvent {
  type: TType;
  data: { object: TPayload };
}

export type CircleCIEventMap = {
  'workflow-completed': CircleCIEvent<'workflow-completed', WorkflowCompletedPayload>;
  'job-completed': CircleCIEvent<'job-completed', JobCompletedPayload>;
};

/**
 * Verifies the `circleci-signature` header (`v1=<hex HMAC-SHA256 of the raw body>`) and
 * routes by the `circleci-event-type` header.
 */
export function createCircleCIVerifier(secret: string): Verifier {
  return async (payload, headers) => {
    const header = headers['circleci-signature'];
    if (!header) {
      throw new Error('Missing circleci-signature header');
    }

    // The header is a comma-separated list such as `v1=<hex>,v2=<hex>`. CircleCI says to check
    // only the latest version to prevent downgrade attacks; v1 is the latest (and only) one today.
    const v1 = header
      .split(',')
      .map((part) => part.trim())
      .find((part) => part.startsWith('v1='))
      ?.slice('v1='.length);
    const signature = v1 ? hexToBytes(v1) : null;
    if (!signature) {
      throw new Error('No valid v1 signature in circleci-signature header');
    }
    if (!(await verifyHmacSha256(secret, payload, signature))) {
      throw new Error('Invalid signature');
    }

    const type = headers['circleci-event-type'];
    if (!type) {
      throw new Error('Missing circleci-event-type header');
    }

    const body = JSON.parse(payloadToText(payload)) as { id: string };
    // Event types without a registered handler are acknowledged and ignored by the router
    return { event: { id: body.id, type, data: { object: body } } };
  };
}
