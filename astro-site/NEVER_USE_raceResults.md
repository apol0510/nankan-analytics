# 🚨 復活防止ドキュメント

## ❌ 絶対に使用してはいけないファイル・パターン

### 1. raceResults.json
- **問題**: 古いデータ構造、手動更新が必要
- **代替**: `standard-predictions.astro`の`yesterdayResults`を使用
- **復活パターン**: 新しく作業する人が`import raceResults`と書いてしまう

### 2. race.status === 'hit' 判定
- **問題**: 新しいデータ構造では`result === 'win'`
- **復活パターン**: 古いコードをコピペしてしまう

### 3. ハードコーディングされた日付・競馬場
- **問題**: 毎回手動更新が必要
- **代替**: `yesterdayResults.date` `yesterdayResults.track`を使用

## ✅ 正しい実装パターン

```javascript
// ✅ 正しい
import { yesterdayResults } from './standard-predictions.astro';
const currentResults = yesterdayResults;

// ❌ 絶対禁止
import raceResults from '../data/raceResults.json';
const currentResults = raceResults;
```

```javascript
// ✅ 正しい
race.result === 'win'

// ❌ 絶対禁止
race.status === 'hit'
```

```astro
<!-- ✅ 正しい -->
<p>{yesterdayResults.date} {yesterdayResults.track}での予想成績</p>

<!-- ❌ 絶対禁止 -->
<p>9/16 大井競馬での予想成績</p>
```

## 🔒 復活防止チェックリスト

作業開始時に必ず実行：

```bash
# 1. 禁止パターンの検出
grep -r "raceResults.json" src/
grep -r "race.status" src/
grep -r "大井競馬での予想成績" src/

# 2. 正しいパターンの確認
grep -r "yesterdayResults" src/
grep -r "race.result" src/
```

## 🚨 緊急復旧手順

もし問題が復活した場合：

1. `git checkout HEAD -- src/pages/index.astro`
2. 最新の修正を再適用
3. このドキュメントを再確認