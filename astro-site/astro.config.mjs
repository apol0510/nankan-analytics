// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath, URL } from 'node:url';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://nankan-analytics.keiba.link',
  base: '/',

  // インテグレーション
  integrations: [
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
