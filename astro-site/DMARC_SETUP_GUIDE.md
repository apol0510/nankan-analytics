# 📧 DMARC設定修正ガイド - NANKANアナリティクス

## 🎯 目的
メール到達率を向上させるため、DNS設定のDMARCレコードを修正します。

## ⚠️ 現在の問題
Brevoで「Multiple DMARC records detected」が表示されています。
これは複数のDMARCレコードが設定されており、メールの信頼性に影響する可能性があります。

---

## 🛠️ 修正手順

### 1️⃣ **現在のDNSレコード確認**
```bash
# DMARCレコードをチェック
dig TXT _dmarc.nankan-analytics.keiba.link

# 結果例（問題がある場合）
_dmarc.nankan-analytics.keiba.link. 300 IN TXT "v=DMARC1; p=none; rua=mailto:dmarc@keiba.link"
_dmarc.nankan-analytics.keiba.link. 300 IN TXT "v=DMARC1; p=quarantine; rua=mailto:admin@keiba.link"
```

### 2️⃣ **推奨DMARC設定**
**DNS設定で以下の1つのレコードのみを設定：**

```
タイプ: TXT
名前: _dmarc.nankan-analytics.keiba.link
値: v=DMARC1; p=none; rua=mailto:info@nankan-analytics.keiba.link; ruf=mailto:info@nankan-analytics.keiba.link; fo=1
```

**設定内容説明：**
- `v=DMARC1` - DMARCバージョン1
- `p=none` - 最初は監視のみ（スパム判定はしない）
- `rua=mailto:info@nankan-analytics.keiba.link` - 集計レポート送信先
- `ruf=mailto:info@nankan-analytics.keiba.link` - 詳細レポート送信先
- `fo=1` - 認証失敗時にレポート送信

### 3️⃣ **段階的改善計画**
```
フェーズ1: p=none （監視・データ収集）
    ↓ 1-2週間後、問題なければ
フェーズ2: p=quarantine （疑わしいメールを迷惑メールフォルダに）
    ↓ 1-2週間後、問題なければ  
フェーズ3: p=reject （認証失敗メールを拒否）
```

---

## 🔧 DNS管理者向け設定手順

### A) **お名前.com の場合**
1. DNS設定画面にログイン
2. 「DNSレコード設定」を選択
3. 既存の `_dmarc` TXTレコードを**全て削除**
4. 新しいTXTレコードを追加：
   - **ホスト名**: `_dmarc.nankan-analytics.keiba.link`
   - **TYPE**: TXT
   - **VALUE**: `v=DMARC1; p=none; rua=mailto:info@nankan-analytics.keiba.link; ruf=mailto:info@nankan-analytics.keiba.link; fo=1`

### B) **Cloudflare の場合**
1. Cloudflareダッシュボード → DNS管理
2. 既存の `_dmarc` レコードを削除
3. 「Add record」をクリック：
   - **Type**: TXT
   - **Name**: `_dmarc.nankan-analytics.keiba.link`
   - **Content**: `v=DMARC1; p=none; rua=mailto:info@nankan-analytics.keiba.link; ruf=mailto:info@nankan-analytics.keiba.link; fo=1`

### C) **その他のDNSプロバイダー**
- **Route 53** (AWS)
- **Google Cloud DNS**
- **さくらインターネット**
- 同様の手順で、TXTレコードの重複削除 → 新レコード追加

---

## 📊 設定後の確認方法

### 1️⃣ **DMARCレコード確認**
```bash
# 設定から1-2時間後に確認
dig TXT _dmarc.nankan-analytics.keiba.link

# 正しい結果例（1つのレコードのみ）
_dmarc.nankan-analytics.keiba.link. 300 IN TXT "v=DMARC1; p=none; rua=mailto:info@nankan-analytics.keiba.link; ruf=mailto:info@nankan-analytics.keiba.link; fo=1"
```

### 2️⃣ **Brevo設定再確認**
- Brevo → Settings → Senders, domains, IPs
- 「Multiple DMARC records detected」の警告が消えることを確認

### 3️⃣ **メール送信テスト**
- NANKANアナリティクス管理画面でテストメール送信
- 受信箱への到達率を確認

---

## 🚨 注意事項

### ❌ **やってはいけないこと**
- いきなり `p=reject` に設定（メールが届かなくなる可能性）
- 複数のDMARCレコードを並存させる
- SPF・DKIMの設定を変更する（Brevoが管理）

### ✅ **推奨アクション**
1. まず `p=none` で開始
2. 1-2週間データを収集
3. 問題がなければ段階的に厳しく設定
4. レポートメールを定期的にチェック

---

## 📈 期待効果

### **メール到達率向上**
- 迷惑メールフォルダ行きを減少
- 受信箱への直接配信率向上
- メール認証の信頼性向上

### **ブランド保護**
- なりすましメール防止
- ドメインの信頼性向上
- 顧客との信頼関係強化

---

## ❓ トラブルシューティング

### Q: 設定後もBrevoで警告が出る
A: DNS反映に最大48時間かかる場合があります。24-48時間後に再確認してください。

### Q: メールが届かなくなった
A: `p=none` に戻して、SPF・DKIM設定を確認してください。

### Q: レポートメールが大量に来る
A: 正常です。週1回程度のチェックで十分です。

---

**設定完了後、マコちゃんにご連絡ください！** 🎉

**Last Updated**: 2025-09-04
**Priority**: 高（メール到達率向上のため）