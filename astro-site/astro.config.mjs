// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://nankan-analytics.keiba.link',
  base: '/',
  output: 'static',
  adapter: netlify(),

  // インテグレーション
  integrations: [
    sitemap()
  ],

  // ビルド設定
  build: {
    assets: 'assets'
  },

  // SEO設定
  trailingSlash: 'ignore'
});
