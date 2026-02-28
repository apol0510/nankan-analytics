# プラン変更時の自動強制ログアウト設定ガイド

## 📋 **概要**

**目的:** Status が "active" になった時に ForceLogout フラグをセットし、次回アクセス時に強制的に再ログインさせる

**効果:**
- ✅ 新規購入・プラン変更時に ForceLogout = true
- ✅ 次回アクセス時に自動的にログアウト→再ログイン
- ✅ 最新のプランに自動反映
- ✅ 顧客からの「プランが切り替わらない」問い合わせゼロ

---

## 🎯 **マコさんの運用方法（銀行振込のみ）**

**銀行振込の場合は、Airtable Automation は不要です。**

### **運用フロー（3ステップ・30秒）**

**Step 1: 入金確認**
```
三井住友銀行 洲本支店で入金確認
```

**Step 2: Airtableで2箇所更新**
```
1. Customers テーブルで該当レコードを開く
2. Status を "pending" → "active" に変更
3. ForceLogout にチェック ✅（+5秒だけ）
4. 保存
```

**Step 3: 顧客が次回アクセス（自動）**
```
顧客が次回アクセス
  ↓
強制ログアウト
  ↓
「プランが更新されました。再度ログインしてください。」表示
  ↓
再ログイン
  ↓
Premium プランに反映 ✅
```

**所要時間: 30秒（+5秒だけ）**

---

## ⚠️ **重要：銀行振込の場合は手動更新でOK**

**理由:**
- ✅ Status を手動で "active" に変更するタイミングで、ForceLogout にもチェックを入れればOK
- ✅ Paddle などの自動決済を使用していない
- ✅ Airtable Automation を設定する必要なし

**運用ポイント:**
- ✅ 入金確認時に Status と ForceLogout を同時に更新
- ✅ 「プランが切り替わらない」問い合わせゼロ
- ✅ 顧客は次回アクセス時に自動的に再ログイン促進

---

## 📚 **参考：Paddle など自動決済を使用する場合**

**Paddle を使用する場合のみ、Airtable Automation が必要です。**

Paddle Webhook → Airtable Status 自動更新 → Automation で ForceLogout 自動セット

---

## 🚀 **設定手順（5分）**

### **Step 1: Airtable Automation を開く**

1. **Airtable にログイン**
   - https://airtable.com/

2. **Customers テーブルのベースを開く**

3. **左上の「Automations」をクリック**
   - または右上の「⚡ Automations」ボタン

4. **「Create automation」をクリック**

---

### **Step 2: Trigger 設定（Status 変更を検知）**

1. **Trigger タイプを選択**
   - 「When a record is updated」を選択

2. **テーブルを選択**
   - Table: **Customers**

3. **フィールドを選択**
   - Field: **Status**

4. **「Done」をクリック**

---

### **Step 3: Condition 設定（Status = "active" の時のみ実行）**

1. **「Add advanced logic or action」をクリック**

2. **「Add condition」を選択**

3. **Condition を設定**
   ```
   If: Status
   is: active
   ```

4. **「Done」をクリック**

---

### **Step 4: Action 設定（ForceLogout = true に更新）**

1. **「Add action」をクリック**

2. **Action タイプを選択**
   - 「Update record」を選択

3. **テーブルを選択**
   - Table: **Customers**
   - Record ID: **Automation output → Record ID**（Trigger で取得したレコード）

4. **フィールドを更新**
   - Field: **ForceLogout**
   - Value: **true**（チェックボックスにチェック）

5. **「Done」をクリック**

---

### **Step 5: Automation 名前を設定して有効化**

1. **Automation 名前を設定**
   - 名前: **「プラン変更時の自動強制ログアウト」**

2. **「Turn on」をクリック**（右上）

3. **✅ 完了！**

---

## 🔧 **最終的な Automation 構成**

```
Trigger:
  When a record is updated
  → Table: Customers
  → Field: Status

Condition:
  If Status is "active"

Action:
  Update record
  → Table: Customers
  → Record ID: [Trigger output]
  → ForceLogout = true
```

---

## 📊 **動作フロー**

```
1. 顧客が銀行振込・Paddle で購入
   ↓
2. Airtable Status が "pending" → "active" に更新
   ↓
3. Automation が検知
   ↓
4. ForceLogout = true に自動更新 ✅
   ↓
5. 顧客が次回サイトにアクセス
   ↓
6. auth-user.js が ForceLogout = true を検知
   ↓
7. 強制ログアウト
   ↓
8. 「プランが更新されました。再度ログインしてください。」表示
   ↓
9. 顧客が再ログイン
   ↓
10. 最新のプラン（Premium など）に自動反映 ✅
```

---

## ⚠️ **重要な注意事項**

### **1. 既存の有効ユーザーには影響しない**

**Condition で Status = "active" のみをトリガー:**
- ✅ 新規購入時（pending → active）のみ実行
- ✅ 既に active のユーザーには影響なし
- ✅ プラン変更時（Status は変わらないが、プランフィールドが変わる）には実行されない

**プラン変更も検知したい場合:**
- Trigger Field を **「プラン」フィールド** に変更
- または複数の Automation を作成（Status 変更 + プラン変更）

### **2. ForceLogout フラグは自動的にリセットされる**

**auth-user.js の処理:**
```javascript
// ForceLogout = true を検知
if (forceLogout) {
  // 自動的に ForceLogout = false にリセット
  await base('Customers').update(user.id, {
    'ForceLogout': false
  });
}
```

- ✅ 一度強制ログアウトが実行されると、自動的に false になる
- ✅ 次回以降は通常ログイン可能

### **3. テスト方法**

**Step 1: テストユーザー作成**
```
1. Airtable で新規レコード作成
2. Email: test@example.com
3. Status: "pending"
4. プラン: "Free"
```

**Step 2: Status を "active" に変更**
```
1. Status を "active" に変更
2. 保存
```

**Step 3: ForceLogout フラグを確認**
```
1. ForceLogout フィールドを確認
2. ✅ true になっていれば成功
```

**Step 4: ログインテスト**
```
1. test@example.com でログイン
2. ✅ 「プランが更新されました。再度ログインしてください。」表示
3. 再ログイン
4. ✅ 最新のプランに反映
```

---

## 🎯 **運用開始後の効果**

**Before（現状）:**
- ❌ 顧客: 「プランが切り替わらない」問い合わせ
- ❌ マコさん: 「一度ログアウトしてください」メール送信
- ❌ 顧客: メールを見ない・理解しない
- ❌ マコさん: 手動で ForceLogout にチェック

**After（Automation 導入後）:**
- ✅ 顧客: 次回アクセス時に自動的に再ログイン促進
- ✅ マコさん: 問い合わせゼロ・手動作業ゼロ
- ✅ 顧客: スムーズなプラン反映体験
- ✅ マコさん: 運用工数ゼロ

---

## 📝 **トラブルシューティング**

### **Q1: Automation が実行されない**

**A1: Trigger 設定を確認**
- Field: Status になっているか確認
- Condition: Status = "active" になっているか確認

### **Q2: ForceLogout フィールドが見つからない**

**A2: ForceLogout フィールドを追加**
- FORCE_LOGOUT_GUIDE.md の Step 1 を参照
- フィールドタイプ: Checkbox
- フィールド名: ForceLogout

### **Q3: 既存のユーザーにも強制ログアウトさせたい**

**A3: 手動でチェック**
- Automation は新規購入時のみ実行
- 既存ユーザーは手動で ForceLogout にチェック

---

## ✅ **設定完了チェックリスト**

- [ ] Airtable Automation 作成
- [ ] Trigger: "When a record is updated" → Status
- [ ] Condition: Status = "active"
- [ ] Action: ForceLogout = true
- [ ] Automation 名前設定: 「プラン変更時の自動強制ログアウト」
- [ ] 「Turn on」で有効化
- [ ] テストユーザーで動作確認

**これで完了です！** 🎉
