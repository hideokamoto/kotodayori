import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightChangelogs, { makeChangelogsSidebarLinks } from 'starlight-changelogs';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';

export default defineConfig({
  site: 'https://tayori-docs.workers.dev',
  integrations: [
    starlight({
      title: 'Kotodayori',
      description: 'A Hono-inspired, type-safe webhook routing library for TypeScript.',
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        ja:   { label: '日本語',  lang: 'ja' },
      },
      plugins: [
        starlightChangelogs(),
        starlightLlmsTxt(),
        starlightTypeDoc({
          entryPoints: [
            '../packages/core/src/index.ts',
            '../packages/stripe/src/index.ts',
            '../packages/zod/src/index.ts',
            '../packages/hono/src/index.ts',
            '../packages/express/src/index.ts',
            '../packages/lambda/src/index.ts',
            '../packages/eventbridge/src/index.ts',
          ],
          tsconfig: '../tsconfig.typedoc.json',
          sidebar: {
            label: 'API Reference',
            collapsed: true,
          },
          typeDoc: {
            excludeExternals: true,
          },
        }),
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/hideokamoto/stripe-webhook-router' },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          translations: { ja: 'はじめに' },
          items: [
            { label: 'Overview',     translations: { ja: '概要' },         slug: 'getting-started/overview' },
            { label: 'Installation', translations: { ja: 'インストール' }, slug: 'getting-started/installation' },
          ],
        },
        {
          label: 'Packages',
          translations: { ja: 'パッケージ' },
          items: [
            { label: 'Core',               translations: { ja: 'Core' },               slug: 'packages/core' },
            { label: 'Stripe',             translations: { ja: 'Stripe' },             slug: 'packages/stripe' },
            { label: 'Zod',                translations: { ja: 'Zod' },                slug: 'packages/zod' },
            { label: 'Hono',               translations: { ja: 'Hono' },               slug: 'packages/hono' },
            { label: 'Express',            translations: { ja: 'Express' },            slug: 'packages/express' },
            { label: 'Lambda',             translations: { ja: 'Lambda' },             slug: 'packages/lambda' },
            { label: 'EventBridge',        translations: { ja: 'EventBridge' },        slug: 'packages/eventbridge' },
            { label: 'create-kotodayori',  translations: { ja: 'create-kotodayori' },  slug: 'packages/create-kotodayori' },
          ],
        },
        {
          label: 'Guides',
          translations: { ja: 'ガイド' },
          items: [
            { label: 'Stripe Webhooks',  translations: { ja: 'Stripe Webhooks' },    slug: 'guides/stripe-webhooks' },
            { label: 'Custom Webhooks',  translations: { ja: 'カスタム Webhook' },  slug: 'guides/custom-webhooks' },
            { label: 'Middleware',       translations: { ja: 'ミドルウェア' },       slug: 'guides/middleware' },
            { label: 'Routing',          translations: { ja: 'ルーティング' },       slug: 'guides/routing' },
          ],
        },
        {
          label: 'Changelog',
          translations: { ja: '変更履歴' },
          items: [
            ...makeChangelogsSidebarLinks([
              { type: 'latest', label: '@kotodayori/core',        base: 'changelog/core' },
              { type: 'latest', label: '@kotodayori/stripe',      base: 'changelog/stripe' },
              { type: 'latest', label: '@kotodayori/zod',         base: 'changelog/zod' },
              { type: 'latest', label: '@kotodayori/hono',        base: 'changelog/hono' },
              { type: 'latest', label: '@kotodayori/express',     base: 'changelog/express' },
              { type: 'latest', label: '@kotodayori/lambda',      base: 'changelog/lambda' },
              { type: 'latest', label: '@kotodayori/eventbridge', base: 'changelog/eventbridge' },
              { type: 'latest', label: 'create-kotodayori',       base: 'changelog/create-kotodayori' },
            ]),
          ],
        },
        typeDocSidebarGroup,
      ],
    }),
  ],
});
