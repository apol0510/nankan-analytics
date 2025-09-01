# 🚀 NANKANアナリティクス - 最小構成セットアップガイド

## 📌 はじめに

このガイドは、複雑な技術スタックを排除し、**Stripe Payment Links + Zapier + Airtable**を使った最小構成でサービスを構築する手順書です。

**メリット:**
- ✅ コーディング不要
- ✅ エラーが起きにくい
- ✅ 今日中に完成可能
- ✅ メンテナンスが簡単

---

## 📋 必要なアカウント

1. **Stripe** - 決済処理
2. **Zapier** - 自動化処理
3. **Airtable** - 顧客データベース
4. **Brevo** - メール配信
5. **Netlify** - サイトホスティング（既存）

---

## 🎯 STEP 1: Stripe Payment Links作成

### 1-1. Stripeダッシュボードにログイン
```
https://dashboard.stripe.com/
```

### 1-2. Payment Links作成

#### Standard会員用リンク
1. 「製品カタログ」→「Payment Links」→「リンクを作成」
2. 商品情報:
   - 名前: `NANKANアナリティクス Standard会員`
   - 価格: `¥2,980/月`（税込）
   - 課金: `月次サブスクリプション`
3. カスタマイズ:
   - 成功URL: `https://nankan-analytics.keiba.link/thank-you?plan=standard`
   - メタデータ追加: `plan: standard`

#### Premium会員用リンク
1. 同様に作成
2. 商品情報:
   - 名前: `NANKANアナリティクス Premium会員`
   - 価格: `¥9,800/月`（税込）
   - 課金: `月次サブスクリプション`
3. カスタマイズ:
   - 成功URL: `https://nankan-analytics.keiba.link/thank-you?plan=premium`
   - メタデータ追加: `plan: premium`

### 1-3. リンクURL保存
```
Standard: https://buy.stripe.com/xxxxx
Premium: https://buy.stripe.com/yyyyy
```

---

## 🔗 STEP 2: Zapier自動化設定

### 2-1. 新規Zap作成

#### Trigger設定（Stripe）
1. App: `Stripe`
2. Event: `New Payment`
3. Test: Stripeアカウント接続

#### Action 1: Airtableに顧客追加
1. App: `Airtable`
2. Event: `Create or Update Record`
3. 設定:
   ```
   Base: NANKANアナリティクス顧客
   Table: 会員管理
   
   フィールドマッピング:
   - Email: {{Stripe Customer Email}}
   - 顧客ID: {{Stripe Customer ID}}
   - プラン: {{Stripe Metadata Plan}}
   - 開始日: {{Stripe Created Date}}
   - 有効期限: {{Stripe Current Period End}}
   - ステータス: アクティブ
   ```

#### Action 2: ウェルカムメール送信
1. App: `Brevo` または `Gmail`
2. Event: `Send Email`
3. 設定:
   ```
   To: {{Stripe Customer Email}}
   Subject: NANKANアナリティクスへようこそ！
   
   本文:
   {{Customer Name}}様
   
   NANKANアナリティクス{{Plan}}会員にご登録いただき、
   ありがとうございます。
   
   【ログインURL】
   https://nankan-analytics.keiba.link/login?token={{Generated_Token}}
   
   【会員ダッシュボード】
   {{Airtable_Dashboard_URL}}
   ```

### 2-2. テスト実行
1. Stripeでテスト決済実行
2. Zapが正しく動作するか確認
3. Airtableにデータが入るか確認
4. メールが届くか確認

---

## 📊 STEP 3: Airtable設定

### 3-1. Base作成
名前: `NANKANアナリティクス顧客`

### 3-2. テーブル構造
```
会員管理テーブル:
- Email (Email型)
- 顧客ID (Text)
- プラン (Single Select: Free/Standard/Premium)
- 開始日 (Date)
- 有効期限 (Date)
- ステータス (Single Select: アクティブ/休止/解約)
- 登録日時 (Created Time)
- 更新日時 (Last Modified)
```

### 3-3. Interface作成

#### 管理者ダッシュボード
1. 「Interfaces」→「Create interface」
2. Grid viewで全顧客一覧
3. フィルター機能追加（プラン別、ステータス別）
4. 統計ウィジェット追加（会員数、売上など）

#### 顧客用ダッシュボード
1. Record Picker → Email検索
2. 表示項目:
   - 現在のプラン
   - 有効期限
   - 利用開始日
3. 共有リンク生成

---

## 📧 STEP 4: Brevo設定

### 4-1. リスト作成
1. 「Contacts」→「Lists」
2. 3つのリスト作成:
   - 無料会員
   - Standard会員
   - Premium会員

### 4-2. Zapier連携
1. Airtableのプラン変更をトリガーに
2. Brevoのリスト更新を自動化

### 4-3. メルマガテンプレート
- 無料会員向け：週1回の予想ヒント
- Standard会員向け：週2回の詳細分析
- Premium会員向け：毎日の全レース分析

---

## 🌐 STEP 5: サイト更新

### 5-1. pricing.astroの更新
```html
<div class="pricing-cards">
  <!-- Standard会員 -->
  <div class="card">
    <h3>Standard会員</h3>
    <p>月額 ¥2,980</p>
    <a href="https://buy.stripe.com/xxxxx" class="btn">
      今すぐ登録
    </a>
  </div>
  
  <!-- Premium会員 -->
  <div class="card">
    <h3>Premium会員</h3>
    <p>月額 ¥9,800</p>
    <a href="https://buy.stripe.com/yyyyy" class="btn">
      今すぐ登録
    </a>
  </div>
</div>
```

### 5-2. thank-you.astroの作成
```javascript
// URLパラメータからプラン取得
const urlParams = new URLSearchParams(window.location.search);
const plan = urlParams.get('plan');

// LocalStorageに保存
localStorage.setItem('userPlan', plan);
localStorage.setItem('planExpiry', new Date(Date.now() + 30*24*60*60*1000));

// メッセージ表示
document.getElementById('message').innerHTML = 
  `${plan}会員へのご登録ありがとうございます！`;
```

### 5-3. アクセス制御の簡素化
```javascript
// plan-checker.js
function checkAccess() {
  const plan = localStorage.getItem('userPlan');
  const expiry = localStorage.getItem('planExpiry');
  
  if (!plan || new Date() > new Date(expiry)) {
    return 'free';
  }
  
  return plan;
}

// レース表示制御
function showRaceContent(raceNumber) {
  const plan = checkAccess();
  
  if (plan === 'premium') {
    // 全レース表示
    return true;
  } else if (plan === 'standard') {
    // 後半3レース
    return [10, 11, 12].includes(raceNumber);
  } else {
    // 無料はメインレースのみ
    return raceNumber === 11;
  }
}
```

---

## ⚡ STEP 6: デプロイ

### 6-1. ビルド&デプロイ
```bash
cd astro-site
npm run build
git add .
git commit -m "🚀 最小構成への移行完了"
git push
```

### 6-2. Netlifyで自動デプロイ
- GitHubプッシュで自動的にデプロイ
- 環境変数は不要（全て外部サービスで管理）

---

## ✅ チェックリスト

### 初期設定
- [ ] Stripe Payment Links作成（2種類）
- [ ] Zapier Zap作成&テスト
- [ ] Airtableベース&Interface作成
- [ ] Brevoリスト&テンプレート作成
- [ ] サイトにPayment Links埋め込み
- [ ] thank-youページ作成
- [ ] アクセス制御JS実装

### テスト
- [ ] テスト決済実行
- [ ] Airtableにデータ登録確認
- [ ] ウェルカムメール受信確認
- [ ] プラン別コンテンツ表示確認
- [ ] 有効期限チェック動作確認

### 運用準備
- [ ] 本番用Payment Links作成
- [ ] カスタマーポータル設定
- [ ] 返金ポリシー設定
- [ ] サポート連絡先設定

---

## 🆘 トラブルシューティング

### Q: Zapierが動作しない
A: Stripe WebhookではなくPollingモードに切り替え

### Q: メールが届かない
A: Brevoの送信者認証を確認

### Q: プラン判定が効かない
A: LocalStorageをクリアして再テスト

### Q: Airtableの容量制限
A: 有料プランへアップグレード（月$20〜）

---

## 📞 サポート

問題が発生した場合：
1. 各サービスのサポートに問い合わせ
2. Zapierコミュニティフォーラム
3. Airtableヘルプセンター

---

**これで複雑なコーディングなしで、今日中に動くシステムが完成します！** 🎉