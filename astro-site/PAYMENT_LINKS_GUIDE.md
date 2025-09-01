# 💳 Stripe Payment Links 完全設定ガイド

## なぜPayment Linksなのか？

**従来の問題点:**
- ❌ API統合でエラーが頻発
- ❌ Webhook署名検証が複雑
- ❌ 環境変数の管理が大変
- ❌ コードのデバッグに時間がかかる

**Payment Linksのメリット:**
- ✅ **コード不要** - URLを貼るだけ
- ✅ **エラーゼロ** - Stripeが全て処理
- ✅ **即座に稼働** - 5分で設定完了
- ✅ **プロ仕様** - Stripeの決済画面

---

## 📝 事前準備

### Stripeアカウント情報
- ログインURL: https://dashboard.stripe.com/
- テストモード/本番モード切り替え確認

### 価格設定の確認
```
Standard会員: ¥2,980/月（税込）
Premium会員: ¥9,800/月（税込）
```

---

## 🚀 STEP 1: 商品作成

### 1-1. 商品カタログへアクセス
1. Stripeダッシュボード → 「商品カタログ」
2. 「商品を追加」をクリック

### 1-2. Standard会員商品
```yaml
商品名: NANKANアナリティクス Standard会員
説明: 後半3レースの予想データ + 基礎分析コンテンツ
画像: ロゴ画像をアップロード（オプション）

料金設定:
  価格: 2980
  通貨: JPY
  請求期間: 月次
  
税金:
  税込み価格として設定: オン

メタデータ:
  plan_type: standard
  access_level: standard_races
```

### 1-3. Premium会員商品
```yaml
商品名: NANKANアナリティクス Premium会員
説明: 全レース予想データ + 全コンテンツアクセス
画像: プレミアムロゴ画像（オプション）

料金設定:
  価格: 9800
  通貨: JPY
  請求期間: 月次
  
税金:
  税込み価格として設定: オン

メタデータ:
  plan_type: premium
  access_level: all_races
```

---

## 🔗 STEP 2: Payment Links作成

### 2-1. リンク作成画面へ
1. 「Payment Links」タブ
2. 「リンクを作成」

### 2-2. Standard会員リンク設定

#### 基本設定
```yaml
商品選択: NANKANアナリティクス Standard会員
数量: 固定（1）
```

#### 顧客情報収集
```yaml
メールアドレス: 必須
名前: 必須
電話番号: オプション
住所: 不要
配送先住所: 不要
```

#### 支払い方法
```yaml
カード決済: 有効
コンビニ決済: 有効（日本のみ）
銀行振込: 無効（サブスクには非対応）
```

#### 成功後の動作
```yaml
タイプ: リダイレクト
URL: https://nankan-analytics.keiba.link/welcome?plan=standard&session_id={CHECKOUT_SESSION_ID}
```

#### 高度な設定
```yaml
プロモーションコード: 有効（初月無料など）
利用規約: https://nankan-analytics.keiba.link/terms
カスタムフィールド:
  - user_nickname（オプション）
  - referral_code（オプション）
```

### 2-3. Premium会員リンク設定
（Standard設定をコピーして、以下を変更）
```yaml
商品選択: NANKANアナリティクス Premium会員
成功URL: https://nankan-analytics.keiba.link/welcome?plan=premium&session_id={CHECKOUT_SESSION_ID}
```

---

## 🎨 STEP 3: リンクのカスタマイズ

### ブランディング設定
```yaml
ロゴ: 企業ロゴアップロード
ブランドカラー: #3b82f6
ボタンテキスト: "会員登録を完了する"
```

### 言語設定
```yaml
デフォルト言語: 日本語
```

### QRコード生成
各Payment LinkのQRコードを生成して保存
- 印刷物での利用
- イベントでの配布
- 店頭掲示

---

## 🧪 STEP 4: テスト手順

### 4-1. テストカード情報
```
カード番号: 4242 4242 4242 4242
有効期限: 任意の将来日付
CVC: 任意の3桁
```

### 4-2. テストフロー
1. Payment Linkをクリック
2. テストカードで決済
3. 成功ページへリダイレクト確認
4. Stripeダッシュボードで支払い確認

### 4-3. エラーテスト
```
残高不足: 4000 0000 0000 9995
カード拒否: 4000 0000 0000 0002
```

---

## 📊 STEP 5: 分析設定

### コンバージョン追跡
```javascript
// welcome.astro に追加
<script>
  // Google Analytics
  gtag('event', 'purchase', {
    value: plan === 'premium' ? 9800 : 2980,
    currency: 'JPY',
    items: [{
      item_name: `${plan}会員`,
    }]
  });
  
  // Facebook Pixel
  fbq('track', 'Subscribe', {
    value: plan === 'premium' ? 9800 : 2980,
    currency: 'JPY',
    predicted_ltv: plan === 'premium' ? 117600 : 35760,
  });
</script>
```

---

## 💰 STEP 6: 価格戦略オプション

### 初回割引設定
```yaml
プロモーションコード: WELCOME50
割引: 50% OFF（初月のみ）
有効期限: 30日間
```

### 年間プラン追加
```yaml
Standard年間: ¥29,800/年（2ヶ月分お得）
Premium年間: ¥98,000/年（2ヶ月分お得）
```

### アップセル設定
StandardからPremiumへのアップグレードリンク作成

---

## 🔐 STEP 7: セキュリティ設定

### 不正利用防止
```yaml
カード認証: 3Dセキュア有効
重複防止: 同一メールアドレスチェック
IPアドレス: 日本国内のみ許可（オプション）
```

### 返金ポリシー
```yaml
返金期間: 7日間
自動返金: 無効（手動審査）
```

---

## 📱 STEP 8: モバイル最適化

### レスポンシブテスト
- iPhone Safari
- Android Chrome
- タブレット表示

### Apple Pay / Google Pay
自動的に対応（設定不要）

---

## 🚀 STEP 9: 本番移行

### チェックリスト
- [ ] テストモードで全機能確認
- [ ] 本番モードに切り替え
- [ ] 本番用Payment Links作成
- [ ] URLをサイトに反映
- [ ] 実際に少額決済してテスト
- [ ] 返金処理のテスト

### 本番URL保存
```
Standard: https://buy.stripe.com/live_xxxxx
Premium: https://buy.stripe.com/live_yyyyy
```

---

## 📈 STEP 10: 運用管理

### 日次確認
- 新規登録数
- 解約数
- 売上高

### 月次レポート
- MRR（月間経常収益）
- チャーンレート
- LTV（顧客生涯価値）

### カスタマーサポート
```yaml
問い合わせ対応:
  - 決済失敗 → カード会社確認案内
  - プラン変更 → カスタマーポータル案内
  - 解約 → カスタマーポータルから
```

---

## ⚠️ よくある質問

### Q: 決済が失敗する
A: 
- カード限度額確認
- 3Dセキュア認証完了確認
- 別のカードで試す

### Q: サブスクリプション管理
A: Stripeカスタマーポータルを有効化
```
設定 → Billing → カスタマーポータル → 有効化
```

### Q: 複数プラン切り替え
A: カスタマーポータルでプラン変更可能

### Q: 領収書発行
A: 自動メール送信設定で対応

---

## 🎉 完成！

これで**コーディング不要**で決済システムが完成です！

### 次のステップ
1. Zapier連携でAirtableに顧客データ自動登録
2. ウェルカムメール自動送信
3. 会員ダッシュボード構築

---

**Payment Linksなら、今日から収益化開始できます！** 💪