// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://nankan-analytics.keiba.link',
  base: '/',
  output: 'static', // 静的サイトモードでFunctionsを独立実行

  // インテグレーション
  integrations: [
    sitemap()
    // netlify() // 静的モードでは不要
  ],
  
  // ビルド設定
  build: {
    assets: 'assets'
  },

  // SEO設定
  trailingSlash: 'ignore'
});
