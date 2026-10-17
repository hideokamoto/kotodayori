import { WebhookRouter } from '@kotodayori/core';
import type { CircleCIEventMap } from './circleci.js';
import type { LineEventMap } from './line.js';

/** Lines written by the middleware and handlers, shown in the demo page. */
export const activity: string[] = [];

export function log(line: string) {
  activity.push(line);
  console.log(line);
}

// ---------------------------------------------------------------------------
// CircleCI: one request = one event, routed by the `circleci-event-type` header
// ---------------------------------------------------------------------------
export const circleciRouter = new WebhookRouter<CircleCIEventMap>();

circleciRouter.use(async (event, next) => {
  log(`→ [circleci] ${event.type} (${event.id})`);
  await next();
});

// `event.data.object` is typed as WorkflowCompletedPayload here
circleciRouter.on('workflow-completed', async (event) => {
  const { workflow, project, pipeline } = event.data.object;
  const icon = workflow.status === 'success' ? '✅' : '❌';
  log(`  ${icon} workflow "${workflow.name}" ${workflow.status} on ${project.slug} (${pipeline.vcs?.branch ?? 'no branch'})`);
});

// ...and as JobCompletedPayload here
circleciRouter.on('job-completed', async (event) => {
  const { job, workflow } = event.data.object;
  log(`  🔧 job "${job.name}" #${job.number} ${job.status} in workflow "${workflow.name}"`);
});

// ---------------------------------------------------------------------------
// LINE: one request = a batch of events, split by splitLineEvents() in line.ts
// ---------------------------------------------------------------------------
export const lineRouter = new WebhookRouter<LineEventMap>();

lineRouter.use(async (event, next) => {
  log(`→ [line] ${event.type} (${event.id})`);
  await next();
});

// `event.data.object.message` is typed as TextMessageContent here
lineRouter.on('message.text', async (event) => {
  log(`  💬 text from ${event.data.object.source?.type ?? 'unknown'}: "${event.data.object.message.text}"`);
});

lineRouter.on('message.sticker', async (event) => {
  const { packageId, stickerId } = event.data.object.message;
  log(`  🧸 sticker ${packageId}/${stickerId}`);
});

lineRouter.on(['follow', 'unfollow'], async (event) => {
  log(`  👋 ${event.type}`);
});

// Uncomment to see a type error: `packageId` exists on sticker messages, not on TextMessageContent
// lineRouter.on('message.text', async (event) => {
//   console.log(event.data.object.message.packageId);
// });
