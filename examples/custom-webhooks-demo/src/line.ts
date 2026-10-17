import type { Verifier, WebhookDispatcher, WebhookEvent } from '@kotodayori/core';
import type { webhook } from '@line/bot-sdk';
import { base64ToBytes, verifyHmacSha256 } from './hmac.js';

/*
 * LINE Messaging API webhooks
 * https://developers.line.biz/en/reference/messaging-api/
 *
 * The payload types come from the official SDK (@line/bot-sdk), imported as types only, and the
 * signature check matches the SDK's `validateSignature`.
 *
 * Unlike Stripe or CircleCI, one LINE request carries a batch: `{ destination, events: [...] }`.
 * The verifier therefore returns the whole batch as one `line.callback` event, and
 * `splitLineEvents` dispatches each LINE event to the router on its own.
 */

interface LineEvent<TType extends string, TEvent> extends WebhookEvent {
  type: TType;
  data: { object: TEvent };
}

type MessageEventOf<TMessage extends webhook.MessageContent> = Omit<webhook.MessageEvent, 'message'> & { message: TMessage };

/** Message events are routed by message type, e.g. `message.text`, so handlers get the narrowed type */
export type LineEventMap = {
  'message.text': LineEvent<'message.text', MessageEventOf<webhook.TextMessageContent>>;
  'message.sticker': LineEvent<'message.sticker', MessageEventOf<webhook.StickerMessageContent>>;
  'message.image': LineEvent<'message.image', MessageEventOf<webhook.ImageMessageContent>>;
  follow: LineEvent<'follow', webhook.FollowEvent>;
  unfollow: LineEvent<'unfollow', webhook.UnfollowEvent>;
  postback: LineEvent<'postback', webhook.PostbackEvent>;
};

/** What the verifier returns: the whole request body */
export interface LineCallbackEvent extends WebhookEvent {
  type: 'line.callback';
  data: { object: webhook.CallbackRequest };
}

/** Verifies `x-line-signature`: base64 of the HMAC-SHA256 of the raw body, keyed by the channel secret */
export function createLineVerifier(channelSecret: string): Verifier<LineCallbackEvent> {
  return async (payload, headers) => {
    const header = headers['x-line-signature'];
    if (!header) {
      throw new Error('Missing x-line-signature header');
    }
    const signature = base64ToBytes(header);
    if (!signature || !(await verifyHmacSha256(channelSecret, payload, signature))) {
      throw new Error('Invalid signature');
    }

    const body = JSON.parse(payload.toString()) as webhook.CallbackRequest;
    return { event: { id: crypto.randomUUID(), type: 'line.callback', data: { object: body } } };
  };
}

export function lineEventType(event: webhook.Event): string {
  return event.type === 'message' ? `message.${event.message.type}` : event.type;
}

/**
 * Wraps a router so that it can be passed to an adapter: the adapter dispatches the
 * `line.callback` batch, and each LINE event in it is dispatched to `router` in order.
 * A batch with no events is acknowledged as is.
 */
export function splitLineEvents(router: WebhookDispatcher): WebhookDispatcher<LineCallbackEvent> {
  return {
    async dispatch(batch) {
      for (const event of batch.data.object.events) {
        await router.dispatch({ id: event.webhookEventId, type: lineEventType(event), data: { object: event } });
      }
    },
  };
}
