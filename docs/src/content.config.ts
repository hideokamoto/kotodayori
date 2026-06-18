import { defineCollection, z } from 'astro:content';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { changelogsLoader } from 'starlight-changelogs/loader';
import { blogSchema } from 'starlight-blog/schema';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: (context) => blogSchema(context) }) }),
  i18n: defineCollection({
    loader: i18nLoader(),
    // Extend Starlight's i18n schema with starlight-blog's UI string keys so we can
    // provide Japanese translations (the plugin only bundles de/en/fr/it).
    schema: i18nSchema({
      extend: z
        .object({
          'starlightBlog.authors.count_one': z.string(),
          'starlightBlog.authors.count_other': z.string(),
          'starlightBlog.metrics.readingTime.minutes': z.string(),
          'starlightBlog.metrics.words_one': z.string(),
          'starlightBlog.metrics.words_other': z.string(),
          'starlightBlog.pagination.prev': z.string(),
          'starlightBlog.pagination.next': z.string(),
          'starlightBlog.post.lastUpdate': z.string(),
          'starlightBlog.post.draft': z.string(),
          'starlightBlog.post.featured': z.string(),
          'starlightBlog.post.tags': z.string(),
          'starlightBlog.sidebar.all': z.string(),
          'starlightBlog.sidebar.featured': z.string(),
          'starlightBlog.sidebar.recent': z.string(),
          'starlightBlog.sidebar.tags': z.string(),
          'starlightBlog.sidebar.authors': z.string(),
          'starlightBlog.sidebar.rss': z.string(),
          'starlightBlog.tags.count_one': z.string(),
          'starlightBlog.tags.count_other': z.string(),
        })
        .partial(),
    }),
  }),
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
