// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://nankan-analytics.keiba.link',
  base: '/',
  output: 'static', // 静的サイト生成に戻す（Netlify Functionsエラー回避）

  // インテグレーション
  integrations: [
    sitemap()
    // netlify() // 一時的に無効化（ESModuleエラー回避）
  ],
  
  // ビルド設定
  build: {
    assets: 'assets'
  },

  // SEO設定
  trailingSlash: 'ignore'
});
