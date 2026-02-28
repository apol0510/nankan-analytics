# 強制ログアウト機能ガイド

## 📋 **概要**

**目的:** ユーザーと連絡が取れない場合に、サーバーサイドで強制的にセッションを無効化し、再ログインを促す機能

**導入日:** 2026年2月28日

**対象ケース:**
- ✅ Status が "active" になっているが、ユーザーがログアウト→再ログインしていない
- ✅ プラン変更後にセッション情報が古いまま
- ✅ メール連絡が取れず、手動でログアウトさせたい

---

## 🚀 **使用方法（3ステップ）**

### **Step 1: Airtable Customers テーブルに ForceLogout フィールドを追加（初回のみ）**

**Airtable 管理画面での作業:**

1. **Customers テーブルを開く**
   - https://airtable.com/

2. **新しいフィールドを追加**
   - 右上の「+」ボタンをクリック
   - フィールドタイプ: **Checkbox**
   - フィールド名: **ForceLogout**
   - 説明: 強制ログアウトフラグ（チェック時に次回アクセスで強制ログアウト）

3. **保存**

---

### **Step 2: 対象ユーザーの ForceLogout フィールドにチェックを入れる**

**Airtable 管理画面での作業:**

1. **Customers テーブルを開く**

2. **対象ユーザー（例: シミズさん）を検索**
   - メールアドレスまたは名前で検索

3. **ForceLogout フィールドにチェックを入れる**
   - レコードを開く
   - ForceLogout フィールドにチェック ✅
   - 保存

**所要時間: 10秒**

---

### **Step 3: ユーザーが次回アクセスした際に自動的にログアウト**

**自動処理:**

1. **ユーザーが dashboard にアクセス**
   - または次回ログイン試行時

2. **auth-user.js が ForceLogout フラグを検知**
   - ✅ ForceLogout = true → 強制ログアウト
   - ✅ Airtable の ForceLogout フラグを自動的に false にリセット
   - ✅ クライアントサイドで LocalStorage をクリア

3. **ユーザーにメッセージ表示**
   - 「プランが更新されました。再度ログインしてください。」

4. **ユーザーが再ログイン**
   - → 最新の Status（active）が反映される
   - → Premium プランに正しく切り替わる ✅

---

## 🔧 **技術実装の詳細**

### **サーバーサイド（netlify/functions/auth-user.js）**

```javascript
// 強制ログアウトチェック
const forceLogout = user.get('ForceLogout') === true || user.get('ForceLogout') === 1;
if (forceLogout) {
  console.log(`🚨 強制ログアウトフラグ検出: ${email}`);

  // フラグをリセット
  await base('Customers').update(user.id, {
    'ForceLogout': false
  });

  return {
    statusCode: 401,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: false,
      forceLogout: true,
      message: 'セッションが無効化されました。再度ログインしてください。'
    })
  };
}
```

### **クライアントサイド（dashboard.astro）**

```javascript
// 強制ログアウトチェック
if (data.forceLogout) {
  console.log('🚨 強制ログアウト検出');
  // LocalStorageをクリア
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userPlan');
  localStorage.removeItem('user-plan');

  showError('プランが更新されました。再度ログインしてください。');
  return;
}
```

---

## 📊 **動作フロー図**

```
マコさんの作業:
  ↓
1. Airtable で ForceLogout にチェック ✅
  ↓

ユーザーの次回アクセス:
  ↓
2. dashboard にアクセス（またはログイン試行）
  ↓
3. auth-user.js が ForceLogout = true を検知
  ↓
4. Airtable の ForceLogout を false にリセット
  ↓
5. クライアントに "forceLogout: true" を返す
  ↓
6. dashboard.astro が LocalStorage をクリア
  ↓
7. ユーザーにエラーメッセージ表示
  ↓
8. ユーザーが再ログイン
  ↓
9. 最新の Status（active）が反映される ✅
  ↓
10. Premium プランに正しく切り替わる ✅
```

---

## ✅ **シミズさん対応の具体的手順**

**現状:**
- ✅ Status は "active"
- ✅ 入金確認済み
- ❌ シミズさんと連絡が取れない
- ❌ ログアウト→再ログインしていない

**対応手順:**

### **Step 1: Airtable で ForceLogout にチェック（10秒）**

```
1. Airtable Customers テーブルを開く
2. シミズさんのレコードを検索
3. ForceLogout フィールドにチェック ✅
4. 保存
```

### **Step 2: シミズさんが次回アクセス（自動）**

```
シミズさんが次回サイトにアクセス
  ↓
強制ログアウト
  ↓
「プランが更新されました。再度ログインしてください。」表示
  ↓
シミズさんが再ログイン
  ↓
Premium プランに正しく反映 ✅
```

---

## 🚨 **重要な注意事項**

### **1. ForceLogout フラグは自動的にリセットされる**
- ✅ 一度強制ログアウトが実行されると、Airtable の ForceLogout フラグは自動的に false になる
- ✅ 同じユーザーに対して複数回強制ログアウトを実行したい場合は、再度チェックを入れる

### **2. 他のページ（premium-predictions, standard-predictions など）も自動的にログアウト**
- ✅ dashboard.astro で LocalStorage がクリアされる
- ✅ LocalStorage ベースの認証を使用している全ページで自動的にログアウト状態になる

### **3. セッションが完全にクリアされる**
- ✅ isLoggedIn
- ✅ userEmail
- ✅ userPlan
- ✅ user-plan（プラン詳細データ）

---

## 📝 **トラブルシューティング**

### **Q1: ForceLogout にチェックを入れたが、ユーザーがログアウトされない**

**A1: ユーザーがまだアクセスしていない可能性があります**
- 強制ログアウトは次回アクセス時に実行されます
- ユーザーに「一度サイトにアクセスしてください」と連絡する

### **Q2: ForceLogout フラグが false に戻らない**

**A2: auth-user.js の処理が正しく実行されていない可能性があります**
- Netlify Functions のログを確認
- エラーがないか確認

### **Q3: ユーザーが再ログインしても Premium に反映されない**

**A3: Status が "active" になっているか確認**
- Airtable Customers テーブルで Status を確認
- pending → active に変更されているか確認

---

## 🎯 **まとめ**

**強制ログアウト機能の利点:**
- ✅ **連絡が取れないユーザーにも対応可能**（メール不要）
- ✅ **サーバーサイドで確実に実行**（クライアント依存なし）
- ✅ **自動的にフラグリセット**（手動リセット不要）
- ✅ **所要時間: 10秒**（Airtable でチェックを入れるだけ）

**使用タイミング:**
- ✅ Status が "active" だが、ユーザーがログアウト→再ログインしていない
- ✅ プラン変更後にセッション情報が古いまま
- ✅ メール連絡が取れず、手動でログアウトさせたい

**次回同様のケースが発生した場合:**
1. Airtable で ForceLogout にチェック ✅
2. ユーザーが次回アクセスするまで待機
3. 自動的にログアウト→再ログイン→Premium 反映 ✅

**これで完了です！** 🎉
