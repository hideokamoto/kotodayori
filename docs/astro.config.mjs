import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';
import starlightChangelogs, { makeChangelogsSidebarLinks } from 'starlight-changelogs';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';
import { remarkMermaid } from './src/lib/remark-mermaid.mjs';

export default defineConfig({
  site: 'https://tayori-docs.workers.dev',
  markdown: {
    remarkPlugins: [remarkMermaid],
  },
  integrations: [
    starlight({
      title: 'Kotodayori',
      description: 'A Hono-inspired, type-safe webhook routing library for TypeScript.',
      components: {
        Head: './src/components/Head.astro',
      },
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        ja:   { label: '日本語',  lang: 'ja' },
      },
      head: [
        {
          tag: 'script',
          content: `(function(){try{if(localStorage.getItem('lang-preference'))return;var lang=(navigator.language||'').toLowerCase();var path=location.pathname;var isJa=/^\\/ja(\\/|$)/.test(path);var pref=lang.startsWith('ja')?'ja':'en';localStorage.setItem('lang-preference',pref);if(pref==='ja'&&!isJa){location.replace('/ja'+path+location.search+location.hash);}}catch(e){}})();`,
        },
      ],
      plugins: [
        starlightBlog({
          title: 'Blog',
          authors: {
            hideokamoto: {
              name: 'Hideoki Amamoto',
              url: 'https://github.com/hideokamoto',
              picture: 'https://avatars.githubusercontent.com/u/1578452?v=4',
            },
          },
        }),
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
            { label: 'Overview',             translations: { ja: '概要' },                 slug: 'getting-started/overview' },
            { label: 'Quick Start',          translations: { ja: 'クイックスタート' },     slug: 'getting-started/quick-start' },
            { label: 'Add to an Existing App', translations: { ja: '既存アプリへの追加' }, slug: 'getting-started/add-to-existing-app' },
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
            { label: 'Stripe Webhooks',      translations: { ja: 'Stripe Webhooks' },      slug: 'guides/stripe-webhooks' },
            { label: 'Cloudflare Workers',   translations: { ja: 'Cloudflare Workers' },   slug: 'guides/cloudflare-workers' },
            { label: 'Custom Webhooks',      translations: { ja: 'カスタム Webhook' },      slug: 'guides/custom-webhooks' },
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
