import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { changelogsLoader } from 'starlight-changelogs/loader';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  changelogs: defineCollection({
    loader: changelogsLoader([
      {
        provider: 'changeset',
        base: 'changelog/core',
        title: '@kotodayori/core',
        changelog: '../packages/core/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/stripe',
        title: '@kotodayori/stripe',
        changelog: '../packages/stripe/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/zod',
        title: '@kotodayori/zod',
        changelog: '../packages/zod/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/hono',
        title: '@kotodayori/hono',
        changelog: '../packages/hono/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/express',
        title: '@kotodayori/express',
        changelog: '../packages/express/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/lambda',
        title: '@kotodayori/lambda',
        changelog: '../packages/lambda/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/eventbridge',
        title: '@kotodayori/eventbridge',
        changelog: '../packages/eventbridge/CHANGELOG.md',
      },
      {
        provider: 'changeset',
        base: 'changelog/create-kotodayori',
        title: 'create-kotodayori',
        changelog: '../packages/create-kotodayori/CHANGELOG.md',
      },
    ]),
  }),
};
