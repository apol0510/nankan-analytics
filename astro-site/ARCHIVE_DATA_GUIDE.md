# アーカイブデータ管理ガイド

## 🚨 2026-01-12事故の教訓

### 何が起きたか
- `/archive/` ページで2026年リンクが表示されなかった
- ローカルビルドでは正常、Netlifyでのみ発生
- 原因：**データ追加とキャッシュクリアのタイミングがずれた**

### 根本原因
```
commit 16f2902: キャッシュクリア（v8）+ コードは2025年のみ
  ↓ Netlifyビルド: 2025年のみ表示
commit dcd2873d: 2026年データ追加 + キャッシュクリアなし
  ↓ Netlifyビルド: 古いキャッシュ使用（2025年のみ）
commit d8f8e7da: 再キャッシュクリア（v9）
  ↓ Netlifyビルド: ようやく2026年表示
```

---

## ✅ 再発防止策

### 1. 自動整合性チェック導入
**ファイル:** `scripts/validate-archive-data.js`

**チェック内容:**
- ✅ src/dataのファイルが全てインポートされているか
- ✅ 存在しないファイルへのインポートがないか
- ✅ 年データが正しく統合されているか

**使い方:**
```bash
# 手動実行
npm run validate

# ビルド時自動実行（デフォルト）
npm run build

# バリデーションスキップ（緊急時のみ）
npm run build:skip-validation
```

### 2. 新年度データ追加時の手順（必須）

#### ❌ NG例（今回の事故パターン）
```bash
# 間違った手順
git add netlify.toml  # キャッシュクリアだけ先に
git commit -m "キャッシュクリア"
git push

# 後から2026年データ追加
git add src/pages/archive/index.astro
git commit -m "2026年データ追加"
git push  # ← Netlifyは古いキャッシュを使う
```

#### ✅ OK例（正しい手順）
```bash
# 1. データファイル配置
cp ~/path/to/archiveResults_2026-01.json src/data/
cp ~/path/to/archiveResults_2026-01.json public/data/

# 2. ページにインポート追加
# src/pages/archive/index.astro を編集
# import archiveData2026_01 from '../../data/archiveResults_2026-01.json';
# '2026': { ...archiveData2026_01['2026'] }

# 3. バリデーション実行（必須）
npm run validate
# → ✅ 整合性チェック成功

# 4. ローカルビルド確認（必須）
npm run build
# → dist/archive/index.html で2026年表示確認

# 5. 全部まとめて1回でコミット
git add src/data/ public/data/ src/pages/archive/
git commit -m "2026年データ統合"

# 6. キャッシュクリア（最後に）
# netlify.toml の NETLIFY_CACHE_VERSION を更新
git add netlify.toml
git commit -m "キャッシュクリア"

# 7. プッシュ
git push origin main
```

### 3. チェックリスト（印刷推奨）

**新年度データ追加時:**
- [ ] データファイルを src/data/ と public/data/ に配置
- [ ] ページにimport文追加
- [ ] 年データを archiveData オブジェクトに追加
- [ ] `npm run validate` 実行 → ✅成功確認
- [ ] `npm run build` 実行 → dist/で表示確認
- [ ] grep -c "YYYY年" dist/archive/index.html → 1以上
- [ ] 全ファイルを1回でコミット
- [ ] netlify.toml でキャッシュクリア
- [ ] プッシュ後、Netlifyデプロイ完了まで待機
- [ ] 本番URLで表示確認

**月別データ更新時:**
- [ ] データファイル更新（既存ファイルの中身のみ変更）
- [ ] public/data/ に同期
- [ ] `npm run build` 実行
- [ ] コミット・プッシュ
- [ ] キャッシュクリア不要（データ内容のみ変更のため）

---

## 📁 ファイル構成

### 馬単アーカイブ
```
src/data/
  ├── archiveResults.json              # トップページ用（最新1日分）
  ├── archiveResults_2025-10.json      # 2025年10月分
  ├── archiveResults_2025-11.json      # 2025年11月分
  ├── archiveResults_2025-12.json      # 2025年12月分
  └── archiveResults_2026-01.json      # 2026年1月分

src/pages/archive/
  ├── index.astro                      # 年別一覧（全年度）
  ├── 2025/
  │   ├── index.astro                  # 2025年月別一覧
  │   ├── 10.astro                     # 2025年10月詳細
  │   ├── 11.astro                     # 2025年11月詳細
  │   └── 12.astro                     # 2025年12月詳細
  └── 2026/
      ├── index.astro                  # 2026年月別一覧
      └── 01.astro                     # 2026年1月詳細
```

### 三連複アーカイブ
```
src/data/
  ├── archiveSanrenpukuResults.json           # 統合用（最新月）
  ├── archiveSanrenpukuResults_2025-11.json   # 2025年11月分
  ├── archiveSanrenpukuResults_2025-12.json   # 2025年12月分
  └── archiveSanrenpukuResults_2026-01.json   # 2026年1月分
  # ※ 2025-10は存在しない（三連複プランは11月開始）

src/pages/archive-sanrenpuku/
  ├── index.astro                      # 年別一覧（全年度）
  ├── 2025/
  │   ├── index.astro                  # 2025年月別一覧
  │   ├── 11.astro                     # 2025年11月詳細
  │   └── 12.astro                     # 2025年12月詳細
  └── 2026/
      ├── index.astro                  # 2026年月別一覧
      └── 01.astro                     # 2026年1月詳細
```

---

## 🔧 トラブルシューティング

### Q1: バリデーションエラーが出る
```bash
❌ 以下のデータファイルがインポートされていません:
  - archiveResults_2026-01.json
```

**解決策:**
1. `src/pages/archive/index.astro` を開く
2. import文を追加:
   ```javascript
   import archiveData2026_01 from '../../data/archiveResults_2026-01.json';
   ```
3. archiveDataオブジェクトに追加:
   ```javascript
   const archiveData = {
     '2025': { ... },
     '2026': {
       ...archiveData2026_01['2026']
     }
   };
   ```
4. `npm run validate` で再確認

### Q2: ローカルでは表示されるがNetlifyで表示されない
**原因:** キャッシュ問題

**解決策:**
1. `netlify.toml` を開く
2. `NETLIFY_CACHE_VERSION` を更新:
   ```toml
   NETLIFY_CACHE_VERSION = "v10"  # 数字をインクリメント
   ```
3. コミット・プッシュ
4. Netlifyデプロイ完了まで待機（3〜5分）

### Q3: 存在しないファイルへのインポートエラー
```bash
❌ 存在しないファイルへのインポートがあります:
  - archiveSanrenpukuResults_2025-10.json
```

**解決策:**
1. `src/pages/archive-sanrenpuku/index.astro` を開く
2. 不要なimport文を削除
3. `npm run validate` で再確認

---

## 📝 コミットメッセージ例

```bash
# 新年度追加
git commit -m "📊 2027年アーカイブデータ統合・01月分追加"

# 月別データ更新
git commit -m "📊 馬単結果更新・2026-02-15"

# キャッシュクリア
git commit -m "🔧 Netlifyキャッシュクリア・2027年表示対応"

# バリデーション修正
git commit -m "🔧 アーカイブデータインポート修正・バリデーションエラー解消"
```

---

## 🎯 重要ポイント

1. **データ追加とキャッシュクリアは分離する**
   - ❌ キャッシュクリアを先にやらない
   - ✅ データ追加を完了してからキャッシュクリア

2. **必ず npm run validate を実行**
   - ビルド前に自動実行される
   - エラーが出たら必ず修正してからコミット

3. **ローカルビルド確認を必須化**
   - dist/archive/index.html で目視確認
   - grep コマンドで年度存在確認

4. **全部まとめて1回でコミット**
   - データ + ページ + インポート文を同時に
   - 分割コミットは避ける

5. **Netlifyデプロイ完了を待つ**
   - プッシュ後、3〜5分待機
   - 本番URLで必ず確認

---

## 📚 参考コミット

**成功例:**
- `dcd2873d` - 全体メンテナンス・2026年データ統合（正しい方法）
- `a7085efc` - 2025年10月三連複データ削除（不要ファイル整理）

**失敗例（学習用）:**
- `16f2902` - キャッシュクリアのみ（データ追加なし）
- → 結果：Netlifyで2025年のみ表示

---

最終更新: 2026-01-12
作成者: Claude Code
