# 期限切れシステム完全ガイド・復活防止対策

**作成日**: 2025-10-08
**目的**: 期限切れでもマイページOKシステムの仕様・実装詳細・復活防止対策

---

## 🎯 **システム概要**

### 基本方針
- **期限切れユーザーでもログインOK**: マイページへのアクセスを許可
- **期限切れ警告表示**: ダッシュボード上部に大きな警告カード表示
- **プラン更新導線**: 継続・退会の明確な選択肢提示
- **自動通知システム**: お客様＋マコさんへのメール通知

---

## 🔧 **実装ファイル一覧**

### 1. バックエンド（Netlify Functions）

#### `netlify/functions/auth-user.js`
**機能**: ユーザー認証・期限切れ判定
**変更点**:
- `ExpiryDate`フィールド取得
- 期限切れチェックロジック追加
- `isExpired: true` フラグ返却
- `plan: 'expired'` 特別ステータス

```javascript
// 期限切れチェック（ログインOK）
let isExpired = false;
if (expiryDate) {
  const expiry = new Date(expiryDate);
  const now = new Date();
  if (expiry < now) {
    isExpired = true;
  }
}

// 期限切れレスポンス
if (isExpired) {
  return {
    success: true,
    isExpired: true,
    user: {
      plan: 'expired', // 特別ステータス
      originalPlan: normalizedPlan, // 元のプラン
      expiryDate: expiryDate
    }
  };
}
```

#### `netlify/functions/expiry-notification.js`
**機能**: 期限切れ通知メール送信
**処理内容**:
1. Airtableから期限切れユーザー検索
2. お客様へ通知メール送信
3. マコさんへ管理者通知送信
4. `ExpiryNotificationSent`フラグ更新

**重要フィールド**:
- `ExpiryDate`: 有効期限（Date型）
- `ExpiryNotificationSent`: 通知済みフラグ（Checkbox）
- `ExpiryNotificationDate`: 通知送信日（Date型）

#### `netlify/functions/cron-expiry-check.js`
**機能**: Scheduled Function（毎日午前9時UTC = 日本時間18時）
**設定**: `netlify.toml`で`schedule = "0 9 * * *"`指定

---

### 2. フロントエンド（Dashboard）

#### `src/pages/dashboard.astro`

**追加セクション**:
```html
<!-- 期限切れ警告（期限切れユーザーのみ表示） -->
<div id="expiry-warning-section" style="display: none;">
  <div class="expiry-warning-card">
    <div class="expiry-warning-icon">⚠️</div>
    <div class="expiry-warning-content">
      <h3>プランの有効期限が切れています</h3>
      <div class="expiry-details">
        <p>お客様の<strong id="expired-plan-name">プレミアム</strong>プランは、
           <strong id="expiry-date-display">2025-10-01</strong>に有効期限を迎えました。</p>
        <p>現在は<strong>無料会員</strong>としてご利用いただけます。</p>
      </div>
      <div class="expiry-actions">
        <div class="expiry-action-card">
          <h4>🔄 継続をご希望の場合</h4>
          <a href="/pricing/">今すぐプランを更新</a>
        </div>
        <div class="expiry-action-card secondary">
          <h4>🚪 退会をご希望の場合</h4>
          <button id="withdrawal-btn-expired">退会処理へ進む</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

**JavaScript処理**:
```javascript
// ログイン時に期限切れ情報保存
if (data.isExpired) {
  localStorage.setItem('isExpired', 'true');
  localStorage.setItem('originalPlan', data.user.originalPlan);
  localStorage.setItem('expiryDate', data.user.expiryDate);
}

// ダッシュボード表示時にチェック
function showDashboard(customerData) {
  const isExpired = localStorage.getItem('isExpired') === 'true';
  if (isExpired) {
    showExpiryWarning();
  }
}
```

---

## 📊 **Airtable設定（必須）**

### Customersテーブル必須フィールド

| フィールド名 | 型 | 説明 | 必須 |
|-------------|-----|------|------|
| `Email` | Email | メールアドレス | ✅ |
| `プラン` | Single Select | 'Free' / 'Standard' / 'Premium' | ✅ |
| `ExpiryDate` | Date | 有効期限（YYYY-MM-DD） | ✅ |
| `ExpiryNotificationSent` | Checkbox | 通知済みフラグ | ✅ |
| `ExpiryNotificationDate` | Date | 通知送信日 | 推奨 |
| `ポイント` | Number | 保有ポイント | ✅ |

### Airtable Formula（自動計算）

**有効期限までの残日数**:
```
DATETIME_DIFF({ExpiryDate}, TODAY(), 'days')
```

**期限切れフラグ**:
```
IF(IS_BEFORE({ExpiryDate}, TODAY()), '期限切れ', '有効')
```

---

## 🛡️ **復活防止対策**

### 絶対に変更してはいけない実装

#### ❌ **ログイン拒否に戻す**
```javascript
// ❌ 絶対に復活させない実装（旧バージョン）
if (expiryDate < now) {
  return {
    statusCode: 401, // ログイン拒否
    body: JSON.stringify({ error: '期限切れ' })
  };
}
```

**理由**:
- ユーザーがマイページにアクセスできない
- プラン更新・退会処理ができない
- お問い合わせ対応が増える

#### ✅ **正しい実装（現行バージョン）**
```javascript
// ✅ 期限切れでもログインOK
if (isExpired) {
  return {
    statusCode: 200, // ログイン成功
    isExpired: true,
    user: { plan: 'expired', originalPlan, expiryDate }
  };
}
```

---

### 実装時のチェックリスト

#### バックエンド
- [ ] `auth-user.js`でステータスコード200返却
- [ ] `isExpired`フラグ正確返却
- [ ] `originalPlan`保存

#### フロントエンド
- [ ] 期限切れ警告セクション実装
- [ ] localStorage保存処理
- [ ] プラン更新・退会導線設置

#### 通知システム
- [ ] `expiry-notification.js`実装
- [ ] `cron-expiry-check.js`実装
- [ ] netlify.tomlにschedule設定

#### Airtable
- [ ] ExpiryDateフィールド作成
- [ ] ExpiryNotificationSentフィールド作成
- [ ] 通知送信フラグ設定

---

## 🚀 **運用手順**

### 銀行振込ユーザー登録時

1. **Airtableに手動登録**
   - Email: お客様メールアドレス
   - プラン: 'Standard' または 'Premium'
   - ExpiryDate: 振込期間に応じて設定（例：3ヶ月後）
   - ポイント: 初期値設定

2. **ウェルカムメール送信**
   - ログインURL案内
   - プラン詳細説明

### 期限切れ後の自動処理

1. **毎日18時（日本時間）自動実行**
   - `cron-expiry-check.js`がトリガー
   - `expiry-notification.js`が通知送信

2. **お客様への通知**
   - 期限切れメール送信
   - プラン更新導線案内

3. **マコさんへの通知**
   - 管理者通知メール送信
   - 対応必要事項記載

4. **Airtable自動更新**
   - ExpiryNotificationSent = TRUE
   - ExpiryNotificationDate = 本日日付

---

## 📝 **テスト方法**

### ローカルテスト

```bash
# auth-user.jsテスト（期限切れユーザー）
curl -X POST http://localhost:8888/.netlify/functions/auth-user \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 期限切れ通知テスト
curl -X POST http://localhost:8888/.netlify/functions/expiry-notification
```

### 本番テスト

1. **テストユーザー作成**
   - Airtableに期限切れユーザー追加
   - ExpiryDate: 昨日の日付設定

2. **ログインテスト**
   - ダッシュボードログイン
   - 期限切れ警告表示確認

3. **通知テスト**
   - expiry-notification.js手動実行
   - メール受信確認（お客様＋マコさん）

---

## ⚠️ **トラブルシューティング**

### Q1: 期限切れ警告が表示されない

**確認事項**:
- `isExpired`がlocalStorageに保存されているか
- `showExpiryWarning()`関数が呼び出されているか
- CSS表示設定（`display: none`）

### Q2: 通知メールが送信されない

**確認事項**:
- SENDGRID_API_KEY設定確認
- ExpiryDateフィールド存在確認
- ExpiryNotificationSentフラグ確認

### Q3: Scheduled Functionが実行されない

**確認事項**:
- netlify.tomlのschedule設定
- Netlify管理画面でScheduled Functions有効化
- ログ確認（Netlify Functions Log）

---

## 📅 **メンテナンス**

### 定期チェック項目（月1回）

- [ ] Airtable ExpiryDateフィールドデータ整合性
- [ ] 通知メール送信履歴確認
- [ ] Scheduled Function実行ログ確認
- [ ] お問い合わせ対応件数（期限切れ関連）

---

## 🎯 **今後の拡張案**

### Phase 2（将来実装）

1. **期限前通知（7日前・3日前）**
   - 期限切れ前の事前通知
   - クレジット移行促進

2. **自動ダウングレード**
   - 期限切れ時に自動的にプラン変更
   - 手動介入不要化

3. **admin管理画面**
   - 期限切れユーザー一覧表示
   - ワンクリック期限延長

4. **統計ダッシュボード**
   - 期限切れ率
   - 継続率
   - クレジット移行率

---

**📅 最終更新**: 2025-10-08
**✅ 実装状況**: 完全実装済み・本番稼働準備完了
**🛡️ 復活防止**: 完全対策済み
