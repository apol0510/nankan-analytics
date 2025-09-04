# 🎯 keiba.link DNS設定ガイド (Resend)

## 📋 DNSレコード設定内容

以下のレコードをDNS管理画面で設定してください：

### 1️⃣ **MXレコード（メール受信用）**
```
タイプ: MX
名前: keiba.link (または @ または空欄)
値: feedback-smtp.ap-northeast-1.amazonses.com
優先度: 10
TTL: Auto
```

### 2️⃣ **SPFレコード（送信認証）**
```
タイプ: TXT
名前: keiba.link (または @ または空欄)
値: v=spf1 include:amazonses.com ~all
TTL: Auto
```

### 3️⃣ **DKIMレコード（署名認証）**
```
タイプ: TXT
名前: resend._domainkey.keiba.link (またはサブドメイン: resend._domainkey)
値: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDk7J+0cPVrdcf4y0axzhyHp90VQABBTBD/Mri5rmGFkXY/wpPANd/y3wOv+ycE1tt3+JCnpuKF9rzvRyeNhczr78icGFgq3qVhIqD1sXl/5C2ZXiGjbcD1/wj1lY3jjg90XDb/vhDy/g2uow9oSUciwtKwdPJGzDl3YA+g28Y3YwIDAQAB
TTL: Auto
```

### 4️⃣ **DMARCレコード（推奨）**
```
タイプ: TXT
名前: _dmarc.keiba.link (またはサブドメイン: _dmarc)
値: v=DMARC1; p=none; rua=mailto:nankan.analytics@gmail.com; fo=1
TTL: Auto
```

---

## 🔧 DNS管理画面での設定方法

### **お名前.com の場合**
1. DNS設定 → DNSレコード設定
2. keiba.link を選択
3. 各レコードを追加：
   - **ホスト名**: 上記の「名前」部分（@は空欄に）
   - **TYPE**: TXT または MX
   - **VALUE**: 上記の「値」部分
   - **優先度**: MXレコードのみ「10」

### **Cloudflare の場合**
1. DNS → Records
2. Add record で追加：
   - **Type**: TXT または MX
   - **Name**: @ は keiba.link に自動変換
   - **Content/Mail server**: 値を入力
   - **Priority**: MXレコードのみ「10」

### **重要な注意点**
- **既存のSPFレコード**がある場合は、統合が必要です
  例: `v=spf1 include:amazonses.com include:_spf.google.com ~all`
- **既存のMXレコード**と競合しないよう確認してください

---

## ✅ 設定後の確認

### 1️⃣ **DNS反映待ち**（5分〜48時間）
```bash
# SPF確認
dig TXT keiba.link | grep spf

# DKIM確認
dig TXT resend._domainkey.keiba.link

# MX確認
dig MX keiba.link
```

### 2️⃣ **Resendで認証確認**
1. [https://resend.com/domains](https://resend.com/domains) にアクセス
2. keiba.link の横にある **「Verify DNS records」**をクリック
3. 全て✅になれば認証完了！

### 3️⃣ **テストメール送信**
```bash
curl -X POST https://nankan-analytics.keiba.link/.netlify/functions/debug-email \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 🎉 認証完了後

以下のメールアドレスが使用可能になります：
- ✅ `nankan-analytics@keiba.link`
- ✅ `support@keiba.link`
- ✅ `info@keiba.link`
- ✅ `noreply@keiba.link`

---

## ⚠️ トラブルシューティング

### Q: Verifyしてもエラーが出る
- DNS反映に時間がかかる場合があります（最大48時間）
- TTL値を300秒に設定すると反映が早くなります

### Q: SPFレコードが複数ある
- 1つのドメインにSPFレコードは1つだけです
- 複数のサービスを使う場合は統合します：
  `v=spf1 include:amazonses.com include:_spf.google.com ~all`

---

**設定完了したらマコちゃんに報告してください！** 🚀

**Last Updated**: 2025-09-04
**Priority**: 🔥 最高（メール機能の根幹）