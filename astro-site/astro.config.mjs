// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://nankan-analytics.keiba.link',
  base: '/',
  output: 'static',

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
