// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://nankan-analytics.keiba.link',
  base: '/',
  output: 'server', // サーバーモードに変更（Functions使用可能）

  // インテグレーション
  integrations: [
    sitemap(),
    netlify() // Netlifyアダプター有効化
  ],
  
  // ビルド設定
  build: {
    assets: 'assets'
  },

  // SEO設定
  trailingSlash: 'ignore'
});
