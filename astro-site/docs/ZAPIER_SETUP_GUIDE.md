# Zapier自動化セットアップガイド

## 必要なZap（自動化）一覧

### 1. 🎯 **ポイント付与自動化**
的中結果に応じてポイントを自動付与

### 2. 🎁 **特典申請処理**
顧客からの特典申請を管理者に通知

### 3. 📧 **マジックリンク認証**
メールアドレス入力で認証リンク送信

---

## Zap 1: ポイント付与自動化

### Trigger: Webhook by Zapier
```json
{
  "customer_email": "test@example.com",
  "race_result": "hit", // "hit" or "miss"
  "points_earned": 50,
  "race_number": "11R",
  "date": "2025-09-03"
}
```

### Action 1: Airtable - Find Record
- **Base**: NANKANアナリティクス顧客管理
- **Table**: Customers
- **Field**: Email
- **Value**: `{customer_email}`

### Action 2: Airtable - Update Record
- **Record ID**: 前のステップのRecord ID
- **ポイント**: `{現在のポイント} + {points_earned}`

### Action 3: Brevo - Send Email
- **To**: `{customer_email}`
- **Subject**: `🎯 ポイント獲得のお知らせ`
- **Body**:
```html
<h2>的中おめでとうございます！</h2>
<p>{points_earned}ポイントを獲得しました。</p>
<p>累計ポイント: {新しいポイント}pt</p>
<a href="https://nankan-analytics.com/dashboard">マイページで確認</a>
```

---

## Zap 2: 特典申請処理

### Trigger: Webhook by Zapier
```json
{
  "customer_email": "test@example.com",
  "points": 1250,
  "request_type": "reward_claim",
  "timestamp": "2025-09-03T12:00:00Z"
}
```

### Action 1: Airtable - Update Record
- **Base**: NANKANアナリティクス顧客管理
- **Table**: Customers
- **Field**: Email = `{customer_email}`
- **特典申請済み**: ✅ チェック

### Action 2: Gmail - Send Email（管理者宛）
- **To**: mako@example.com（管理者メール）
- **Subject**: `🎁 新しい特典申請 - {customer_email}`
- **Body**:
```
特典申請が届きました。

顧客: {customer_email}
ポイント: {points}pt
申請時刻: {timestamp}

Airtableで詳細確認:
https://airtable.com/your-base-url
```

### Action 3: Brevo - Send Email（顧客宛）
- **To**: `{customer_email}`
- **Subject**: `特典申請を受け付けました`
- **Body**:
```html
<h2>特典申請ありがとうございます</h2>
<p>申請を受け付けました。3営業日以内にご連絡いたします。</p>
<p>ポイント: {points}pt</p>
```

---

## Zap 3: マジックリンク認証

### Trigger: Webhook by Zapier
```json
{
  "email": "test@example.com",
  "action": "send_magic_link",
  "timestamp": "2025-09-03T12:00:00Z"
}
```

### Action 1: Airtable - Find Record
- **Base**: NANKANアナリティクス顧客管理
- **Table**: Customers
- **Field**: Email
- **Value**: `{email}`

### Action 2: Code by Zapier（認証トークン生成）
```javascript
// 30分有効なトークン生成
const token = Math.random().toString(36).substring(2, 15) + 
              Math.random().toString(36).substring(2, 15);
const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30分後

output = [{
  token: token,
  expiry: expiry.toISOString(),
  magic_link: `https://nankan-analytics.com/dashboard?token=${token}&email=${encodeURIComponent(inputData.email)}`
}];
```

### Action 3: Brevo - Send Email
- **To**: `{email}`
- **Subject**: `NANKANアナリティクス - ログインリンク`
- **Body**:
```html
<h2>マイページへのログインリンク</h2>
<p>以下のリンクをクリックしてマイページにアクセスしてください。</p>
<a href="{magic_link}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
  マイページにアクセス
</a>
<p>※このリンクは30分間有効です。</p>
```

---

## Webhook URL設定

各Zapの「Webhook by Zapier」で生成されたURLを環境変数に設定：

```env
# .env
ZAPIER_POINTS_WEBHOOK=https://hooks.zapier.com/hooks/catch/xxxxx/xxxxx/
ZAPIER_REWARD_CLAIM_WEBHOOK=https://hooks.zapier.com/hooks/catch/xxxxx/xxxxx/
ZAPIER_MAGIC_LINK_WEBHOOK=https://hooks.zapier.com/hooks/catch/xxxxx/xxxxx/
```

---

## テスト方法

### 1. ポイント付与テスト
```bash
curl -X POST "ZAPIER_POINTS_WEBHOOK" \
-H "Content-Type: application/json" \
-d '{
  "customer_email": "test@example.com",
  "race_result": "hit",
  "points_earned": 50
}'
```

### 2. 特典申請テスト
```bash
curl -X POST "ZAPIER_REWARD_CLAIM_WEBHOOK" \
-H "Content-Type: application/json" \
-d '{
  "customer_email": "test@example.com",
  "points": 1250,
  "request_type": "reward_claim"
}'
```

### 3. マジックリンクテスト
```bash
curl -X POST "ZAPIER_MAGIC_LINK_WEBHOOK" \
-H "Content-Type: application/json" \
-d '{
  "email": "test@example.com",
  "action": "send_magic_link"
}'
```

---

## 注意事項

### セキュリティ
- Webhook URLは秘匿情報として管理
- 本番環境では認証を追加推奨

### エラーハンドリング
- Zapierの履歴で失敗を確認
- 自動リトライが3回実行される

### 運用
- 月1回、Zapierの実行履歴を確認
- Airtableの容量制限に注意