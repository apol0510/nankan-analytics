// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath, URL } from 'node:url';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://nankan-analytics.keiba.link',
  base: '/',
  output: 'server',
  adapter: netlify(),

  // インテグレーション
  integrations: [
    mdx(),
    sitemap()
  ],
  
  // ビルド設定
  build: {
    assets: 'assets'
  },

  // マークダウン設定
  markdown: {
    shikiConfig: {
      theme: 'monokai',
      wrap: true
    },
    remarkPlugins: [],
    rehypePlugins: []
  },

  // SEO設定
  trailingSlash: 'ignore',
  
  // 日本語URL対応
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja']
  },

  // ビルド設定
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
});
