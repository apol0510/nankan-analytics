# 🎯 Resendドメイン認証ガイド - keiba.link

## 📋 手順概要
1. Resend Dashboardでドメイン追加
2. DNS設定でSPF・DKIMレコード追加
3. ドメイン認証完了
4. メール送信テスト

---

## 1️⃣ **Resend Dashboard設定**

### アクセス
🔗 **[https://resend.com/domains](https://resend.com/domains)**

### ドメイン追加手順
1. **「Add Domain」**ボタンをクリック
2. ドメイン名: `keiba.link` を入力
3. **「Add Domain」**で追加

---

## 2️⃣ **DNS設定レコード**

Resendで表示されるDNSレコードを追加してください：

### A) **SPFレコード** (TXT)
```
名前: keiba.link
種類: TXT
値: v=spf1 include:_spf.resend.com ~all
```

### B) **DKIMレコード** (TXT) 
```
名前: resend._domainkey.keiba.link
種類: TXT
値: [Resendで表示される長い値をコピー]
```

### C) **DMARCレコード** (推奨)
```
名前: _dmarc.keiba.link
種類: TXT
値: v=DMARC1; p=none; rua=mailto:nankan.analytics@gmail.com; fo=1
```

---

## 3️⃣ **DNS管理画面での設定**

### お名前.comの場合
1. DNS設定 → DNSレコード設定
2. 上記3つのTXTレコードを順番に追加
3. 設定を保存

### Cloudflareの場合
1. DNS → Records → Add record
2. Type: TXT を選択
3. Name・Content を入力して保存

---

## 4️⃣ **認証確認**

### Resendでの確認
- Domain設定画面で **「Verify」**ボタンをクリック
- 緑色の✅が表示されれば認証完了

### コマンドでの確認
```bash
# SPF確認
dig TXT keiba.link

# DKIM確認  
dig TXT resend._domainkey.keiba.link

# DMARC確認
dig TXT _dmarc.keiba.link
```

---

## 5️⃣ **認証後のテスト**

### メール送信テスト
```bash
curl -X POST https://nankan-analytics.keiba.link/.netlify/functions/debug-email \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 期待する結果
```json
{
  "success": true,
  "message": "デバッグメール送信成功",
  "emailId": "xxxxx-xxxx-xxxx"
}
```

---

## ⚠️ 重要ポイント

### DNS反映時間
- **1-48時間**かかる場合があります
- 5-10分で反映される場合もあります

### 認証のサイン
- Resend Dashboard: ✅ Verified
- Status: Active

### トラブルシューティング
- DNS設定が正しいかダブルチェック
- TTL値を短く設定（300秒など）
- 設定後は少し時間を置いて確認

---

## 📧 認証完了後の設定

### 送信者アドレス
- `nankan-analytics@keiba.link` ✅
- `info@keiba.link` ✅
- `noreply@keiba.link` ✅

### 返信機能
- Gmail転送設定で `nankan.analytics@gmail.com` に転送

---

**設定完了したらマコちゃんに報告してください！** 🎉

**Priority**: 🔥 最高（メール機能の根幹）
**Last Updated**: 2025-09-04