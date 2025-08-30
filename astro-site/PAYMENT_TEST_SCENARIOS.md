ローカル（開発機）チェックリスト

目的：コードとDB連携／Webhook処理が通ることを確認

 .env：STRIPE_MODE=test、test用 PriceID/whsec を設定（liveを混在させない）

 Webhook：stripe listen --forward-to http://localhost:4321/api/stripe/webhook

 Astro起動：npm run dev（webhook.ts は export const prerender = false 済み）

 DBスキーマ：profiles/subscriptions/stripe_events 3テーブル＆RLS反映済み

 料金ページから Standard / Premium → Stripe Checkout → 成功ページ表示（成功ページは“反映待ち”の仮表示でOK）

 Supabase：profiles.active_plan と active_status が更新（active/trialing）

 Portal ボタンで課金ポータルに遷移できる（customer作成済み）

 Stripe CLIでイベント注入：customer.subscription.updated / invoice.paid / invoice.payment_failed → いずれも DBが最新状態に上書きされる

参考：標準フローの手順・失敗時の切り分け視点は、あなたのテスト仕様と一致（Checkout→Webhook→DB更新・UI確認）。

テスト環境（ステージング / Testモード）

目的：本番と同じデプロイ基盤で“本番さながら”の動作保証

 環境変数：すべてtest用（pk_test_… / sk_test_… / whsec_test… / *_PRICE_ID_TEST）

 デプロイ先のランタイムが raw body を渡す設定（Netlify/Cloudflare Functionsの既定でOKか要確認）

 デプロイURLで Webhookエンドポイントを登録（例：https://stg.example.com/api/stripe/webhook）

 Checkout→成功→Webhook 2xx をStripeダッシュボードで確認（エラーログ0）

 stripe_events にイベント記録（重複時は「Already processed」になる）

 Portalで価格変更（Standard→Premium）→ customer.subscription.updated で profiles.active_plan='premium'

 想定異常系：invoice.payment_failed 注入 → active_status='past_due' になりUIが制限表示に切替

 メール送信（任意）：SendGridのサンドボックスまたはテスト受信箱で到達を確認

Go/No-Go判定：

Webhook 失敗率 0%、DB反映まで 3分以内、UIで権限が期待どおりなら Go。

1件でも欠落がある場合は No-Go（本番に進まない）。

本番（Live）切替チェックリスト

目的：テスト→本番で“混在事故”を防ぐ

切替前（前日まで）

 .env を 全部 Live用に差し替え：STRIPE_MODE=live / pk_live / sk_live / whsec_live / *_PRICE_ID_LIVE

 Stripeダッシュボードで Live用 Price を再確認（通貨・税率・金額）

 Webhook（Live） を 本番ドメインに登録（https://keiba.link/api/stripe/webhook）

 STRIPE_BILLING_PORTAL_RETURN_URL が本番URLか確認

 キャッシュ/CDNの無効化/パージ計画（APIルートはキャッシュしない）

切替当日（リリース時）

 本番デプロイ & 環境変数の反映確認（ダッシュボードとビルドログで二重チェック）

 Stripeダッシュボード Liveのイベントが来ているか（checkout.session.completed など）

 「有料お試し・超低額プラン」（例：¥100）で実トランザクション1件通す

 profiles が更新（active_plan / active_status）

 subscriptions にレコード作成

 stripe_events にEvent保存（重複なし）

 Portalでアップグレード1回 → Premium反映

 UI全ページで権限制御が正しい（11R無料 / 10R,12R Standard / 1R-9R Premium）

切替後（初週の運用）

 監視：Webhook 2xx率、API 5xx、past_due 件数、返金/チャージバック

 サポート導線：カード更新は /billing（ポータル） を案内

 障害時：stripe_events.payload をもとに再現・復旧（必要なら 日次同期ジョブで補正）

本番で転びやすい“混入”チェック（最重要8項目）

TestのPrice IDが混ざっている（price_test_…）

Webhook Secret（whsec）がTestのまま

成功ページでDBを直接更新している（禁止。最終更新はWebhookのみ）

idempotencyKey未設定で二重課金/二重イベント

customer未指定で再購入時に重複顧客発生

Functionsでraw body未取得 → 署名検証エラー

RLSが甘い：クライアントから課金カラム更新できてしまう

Portal未導線：問い合わせで作業が人手に

失敗時の即時トリアージ手順

 Stripeダッシュボード → イベントの種類・順序を確認（customer.subscription.updated 到来の有無）

 Supabase → stripe_events に該当 event_id があるか

 subscriptions の status/current_period_end/price_id が正しいか

 profiles.active_plan/active_status が最新に上書きされているか

 もしWebhookが一度も来ていなければ whsec と エンドポイントURL を再確認

 一時回避はあなたの仕様の“緊急時対応”に沿って実施（ただし恒久対応はWebhook修正）

最後に：進め方のコツ

一度に変えない：本番で問題が出たら“1つの変更→再テスト”

真実はWebhook：UIや成功ページの状態表示は当てにしない

監査ログを使う：stripe_events がある限り、原因追跡と再処理は必ずできる
