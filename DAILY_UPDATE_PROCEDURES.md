# 📅 **日常更新作業手順マニュアル**

## ⚠️ **🚨 削除厳禁・超重要ファイル 🚨**

**このファイルは絶対に削除してはいけません！**

- ✅ マコさんとクロちゃんの日常業務の根幹
- ✅ 5つの更新作業（馬単・三連複・予想・穴馬・画像）の完全手順
- ✅ バックアップファイル: `DAILY_UPDATE_PROCEDURES.BACKUP.md`
- ✅ CLAUDE.md軽量化のためにアーカイブ分割したもの
- ✅ 2026-01-18に復元・作成された重要資産

**削除・変更する場合は必ずマコさんに確認すること！**

---

## 📋 **概要**

マコさん（プロダクトオーナー）がクロちゃん（Claude）に指示する日常更新作業の定型フロー集です。

**5つの更新作業：**
1. 🔮 予想更新
2. 🐴 穴馬更新
3. 📊 馬単結果更新
4. 📊 三連複結果更新
5. 📸 画像更新

---

## 🔮 **予想更新の手順**

**マコさんが「予想更新コミットプッシュ」と指示したら：**

### **Step 1: ファイル確認**
```bash
# allRacesPrediction.json の先頭部分を確認
Read src/data/allRacesPrediction.json (limit: 50)
```

### **Step 2: public/dataに同期（必須・スキップ禁止）**
```bash
cp src/data/allRacesPrediction.json public/data/
```
- ✅ **既存ファイルがあっても必ず実行**

### **Step 2.5: 無料予想アーカイブ自動保存（必須・スキップ禁止）** 🆕
```bash
python3 scripts/archive-free-prediction.py
```
- ✅ **allRacesPrediction.jsonを日別ファイルとして自動保存**
- ✅ **src/data/free-predictions/YYYY-MM-DD.json に保存**
- ✅ **public/data/free-predictions/YYYY-MM-DD.json に同期**
- ✅ **SEO効果：日別アーカイブページ自動生成（/free-prediction/YYYY/MM/DD/）**

**⚠️ 重要：**
- 毎日の予想更新時に必ず実行
- スキップすると、過去の予想が消える
- アーカイブファイルも自動的にGitに追加される

### **Step 3: JSON検証**
```bash
python3 -c "
import json
with open('src/data/allRacesPrediction.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    main_race = next((r for r in data['races'] if r.get('isMainRace')), None)
    print(f'✅ レース日: {data[\"raceDate\"]}')
    print(f'✅ 会場: {data[\"track\"]}')
    print(f'✅ レース数: {data[\"totalRaces\"]}')
    if main_race:
        print(f'✅ メインレース: {main_race[\"raceNumber\"]} {main_race[\"raceInfo\"][\"raceName\"]}')
"
```

### **Step 4: コミット・プッシュ（必須・スキップ禁止）**
```bash
# 予想データ + 無料予想アーカイブを同時にコミット
git add src/data/allRacesPrediction.json public/data/allRacesPrediction.json src/data/free-predictions/ public/data/free-predictions/

git commit -m "$(cat <<'EOF'
🔮 予想更新・YYYY-MM-DD

- 会場: ○○競馬
- レース数: ○R
- メインレース: ○○賞
- 無料予想アーカイブ保存 ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git push origin main
```

**用途：**
- `/premium-predictions/`（全レース予想・馬単買い目）
- `/standard-predictions/`（後半3レース・三連複買い目）
- `/free-prediction/`（全レース予想・買い目なし）
- トップページ（メインレースプレビュー）

---

## 🐴 **穴馬更新の手順**

**マコさんが「穴馬更新コミットプッシュ」と指示したら：**

### **Step 1: ファイル確認**
```bash
# darkHorseData.json の先頭部分を確認
Read src/data/darkHorseData.json (limit: 50)
```

### **Step 2: public/dataに同期（必須・スキップ禁止）**
```bash
cp src/data/darkHorseData.json public/data/
```
- ✅ **既存ファイルがあっても必ず実行**

### **Step 3: JSON検証**
```bash
python3 -c "
import json
with open('src/data/darkHorseData.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    race_count = len(set([r['raceNumber'] for r in data['races']]))
    horse_count = len(data['races'])
    print(f'✅ レース日: {data[\"date\"]}')
    print(f'✅ 会場: {data[\"track\"]}')
    print(f'✅ レース数: {race_count}R')
    print(f'✅ 穴馬候補数: {horse_count}頭')
"
```

### **Step 4: STORAGE_VERSION更新（必須・スキップ禁止）**
```bash
# dark-horse-picks.astro のSTORAGE_VERSIONを更新日付に変更
Edit src/pages/dark-horse-picks.astro

# Line 396 と Line 435 の2箇所を更新
# const STORAGE_VERSION = 'YYYY-MM-DD'; ← 更新日付に変更
```

**⚠️ 重要：**
- darkHorseData.jsonの `"date": "2025-12-04"` と同じ日付に更新
- **2箇所（Line 396, Line 435）両方とも更新すること**
- この更新を忘れると「穴馬を見る」ボタンが「再確認する」のままになる

### **Step 5: コミット・プッシュ（必須・スキップ禁止）**
```bash
# データファイルのコミット
git add src/data/darkHorseData.json public/data/darkHorseData.json

git commit -m "$(cat <<'EOF'
🐴 穴馬データ更新・YYYY-MM-DD

- 会場: ○○競馬
- レース数: ○R
- 穴馬候補数: ○頭

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git push origin main

# STORAGE_VERSIONのコミット（別コミット）
git add src/pages/dark-horse-picks.astro

git commit -m "$(cat <<'EOF'
🔧 STORAGE_VERSION更新・YYYY-MM-DD

- dark-horse-picks.astro: STORAGE_VERSION更新
- キャッシュバスティング対応
- 穴馬を見るボタン正常表示対応

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git push origin main
```

**用途：**
- `/premium-predictions/`（穴馬情報表示）
- `/standard-predictions/`（穴馬情報表示）
- `/dark-horse-picks/`（穴馬ピック専用ページ）
- 管理画面（/admin/dark-horse-finder/）

**注意：**
- STORAGE_VERSIONは**手動更新必須**（自動管理ではない）
- 更新を忘れるとブラウザキャッシュが残り、ボタン表示が正常にならない

---

## 📊 **馬単結果更新の手順**

**マコさんが「馬単結果更新コミットプッシュ」と指示したら：**

### **🚨 重要：クロちゃん（Claude）への指示 🚨**

**絶対に「更新不要」判定をしないこと！**

- ❌ 「12/01, 02, 03のデータは存在しています、更新不要です」と言ってはいけない
- ✅ **常に以下の手順を実行する**（既存データの有無に関わらず）
- ✅ マコさんが貼り付けたデータを信頼し、必ず同期・コミット・プッシュする

**理由：**
- 月別ファイル（archiveResults_2025-12.json）にデータが存在しても
- トップページ用ファイル（archiveResults.json）が古い可能性がある
- public/data/が古い可能性がある
- **→ 毎回必ず全ての同期処理を実行する**

---

### **Step 1: 月別ファイル確認**
```bash
# archiveResults_2025-12.json を確認
Read src/data/archiveResults_2025-12.json
```

### **Step 2: トップページ用ファイル更新（必須・スキップ禁止）**
```bash
# 月別ファイルから最新1日分のみ抽出してarchiveResults.jsonに保存
python3 -c "
import json

# 月別ファイル読み込み
with open('src/data/archiveResults_2025-12.json', 'r', encoding='utf-8') as f:
    monthly_data = json.load(f)

# 最新1日分のみ抽出
year = '2025'
month = '12'
days = sorted(monthly_data[year][month].keys(), reverse=True)
latest_day = days[0]
latest_day_data = monthly_data[year][month][latest_day]

# トップページ用ファイル作成（最新1日分のみ）
top_page_data = {
    year: {
        month: {
            latest_day: latest_day_data
        }
    }
}

# 保存
with open('src/data/archiveResults.json', 'w', encoding='utf-8') as f:
    json.dump(top_page_data, f, ensure_ascii=False, indent=2)

print(f'✅ 最新日: {latest_day}')
print(f'✅ 会場: {latest_day_data[\"venue\"]}')
print(f'✅ 的中: {latest_day_data[\"hitRaces\"]}/{latest_day_data[\"totalRaces\"]}')
print(f'✅ 回収率: {latest_day_data[\"recoveryRate\"]}%')
"
```
- ✅ **既存データがあっても必ず実行**
- ✅ **最新1日分のみ抽出**（1年後もファイルサイズ1.8KB維持）
- ✅ 編集ミス防止のため手動編集なし

### **Step 3: JSON検証**
```bash
# データ構造が正しいか確認
python3 -c "
import json
with open('src/data/archiveResults.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    days = list(data['2025']['12'].keys())
    latest_day = days[0]
    latest_data = data['2025']['12'][latest_day]
    print(f'Days: {days}')
    print(f'Latest Day: {latest_day}')
    print(f'Venue: {latest_data[\"venue\"]}')
    print(f'HitRaces: {latest_data[\"hitRaces\"]} / {latest_data[\"totalRaces\"]}')
    print(f'Recovery: {latest_data[\"recoveryRate\"]} %')
"
```

### **Step 4: public/dataに同期（必須・スキップ禁止）**
```bash
cp src/data/archiveResults_2025-12.json public/data/
cp src/data/archiveResults.json public/data/
```
- ✅ **既存ファイルがあっても必ず実行**

### **Step 5: コミット・プッシュ（必須・スキップ禁止）**
```bash
# 月別ファイル + トップページ用ファイルを同時にコミット
git add src/data/archiveResults_2025-12.json src/data/archiveResults.json public/data/archiveResults_2025-12.json public/data/archiveResults.json

git commit -m "$(cat <<'EOF'
📊 馬単結果更新・YYYY-MM-DD

- MM/DD（会場）: 的中○/12レース
- 回収率: ○○%
- 総払戻: ○○,○○○円
- 月別ファイル + トップページ用ファイル同時更新

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git push origin main
```

- ✅ **月別ファイルとトップページ用ファイルを1回のコミットで同時更新**
- ✅ データの整合性を保証
- ✅ コミット漏れを防止

---

## 📊 **三連複結果更新の手順**

**マコさんが「三連複結果更新コミットプッシュ」と指示したら：**

### **🚨 重要：三連複は馬単と違う運用方法 🚨**

**三連複結果の用途：**
1. `/archive-sanrenpuku/2025/11/`（11月全日分）
2. `/archive-sanrenpuku/2025/12/`（12月全日分）
3. `/standard-predictions/`（最新日のみ使用）
4. `/premium-predictions/`（最新日のみ使用）

**→ archiveSanrenpukuResults.jsonには11月全日分+12月全日分が必要！**

---

### **Step 1: 月別ファイル確認**
```bash
# archiveSanrenpukuResults_2025-12.json を確認
Read src/data/archiveSanrenpukuResults_2025-12.json
```

### **Step 2: 11月分+12月分を統合（必須・スキップ禁止）**
```bash
# 11月分 + 12月分を結合してarchiveSanrenpukuResults.jsonに保存
python3 -c "
import json

# 11月分の月別ファイルを読み込み
with open('src/data/archiveSanrenpukuResults_2025-11.json', 'r', encoding='utf-8') as f:
    nov_data = json.load(f)

# 12月分の月別ファイルを読み込み
with open('src/data/archiveSanrenpukuResults_2025-12.json', 'r', encoding='utf-8') as f:
    dec_data = json.load(f)

# 11月分 + 12月分を結合
combined_data = {
    '2025': {
        '11': nov_data['2025']['11'],
        '12': dec_data['2025']['12']
    }
}

# archiveSanrenpukuResults.jsonに保存
with open('src/data/archiveSanrenpukuResults.json', 'w', encoding='utf-8') as f:
    json.dump(combined_data, f, ensure_ascii=False, indent=2)

# 確認
nov_days = list(nov_data['2025']['11'].keys())
dec_days = list(dec_data['2025']['12'].keys())
print(f'✅ 11月: {len(nov_days)}日分')
print(f'✅ 12月: {len(dec_days)}日分')
print(f'✅ 合計: {len(nov_days) + len(dec_days)}日分')
"
```
- ✅ **既存データがあっても必ず実行**
- ✅ **11月全日分 + 12月全日分を統合**
- ✅ /archive-sanrenpuku/ で全日分表示

### **Step 3: JSON検証**
```bash
# データ構造が正しいか確認
python3 -c "
import json
with open('src/data/archiveSanrenpukuResults.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    nov_days = len(data['2025']['11'].keys()) if '11' in data['2025'] else 0
    dec_days = len(data['2025']['12'].keys()) if '12' in data['2025'] else 0
    print(f'11月: {nov_days}日分')
    print(f'12月: {dec_days}日分')
    print(f'合計: {nov_days + dec_days}日分')
"
```

### **Step 4: public/dataに同期（必須・スキップ禁止）**
```bash
cp src/data/archiveSanrenpukuResults_2025-12.json public/data/
cp src/data/archiveSanrenpukuResults.json public/data/
```
- ✅ **既存ファイルがあっても必ず実行**

### **Step 5: コミット・プッシュ（必須・スキップ禁止）**
```bash
# 月別ファイル + アーカイブファイルを同時にコミット
git add src/data/archiveSanrenpukuResults_2025-12.json src/data/archiveSanrenpukuResults.json public/data/archiveSanrenpukuResults_2025-12.json public/data/archiveSanrenpukuResults.json

git commit -m "$(cat <<'EOF'
📊 三連複結果更新・YYYY-MM-DD

- MM/DD（会場）: 的中○/12レース
- 回収率: ○○%
- 月別ファイル + 11月全日分+12月全日分統合

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

git push origin main
```

- ✅ **月別ファイルとアーカイブファイルを1回のコミットで同時更新**
- ✅ データの整合性を保証
- ✅ コミット漏れを防止

---

## 📸 **画像更新の手順**

**マコさんが「画像更新コミットプッシュ」と指示したら：**

### **🎯 更新される3箇所**

| ページ | 更新対象 | 表示枚数 | 更新方法 |
|--------|----------|----------|----------|
| **/premium-plus/** | Line 1367-1383 | 直近5戦 | 手動更新必須 |
| **/premium-sanrenpuku/** | Line 401-413 | 直近3戦（CTA） | 手動更新必須 |
| **/withdrawal-upsell/** | Line 534 | 最新1枚 | **自動読み込み** ✅ |

### **Step 0: 画像ファイルのGit状態確認（必須・最優先）**
```bash
# 新しい画像ファイルがGitに追加されているか確認
git status

# Untracked filesに upsell-YYYYMMDD.png がある場合は追加
git add public/upsell-images/upsell-YYYYMMDD.png
```

**⚠️ 重要：**
- 画像ファイルがGitにコミットされていないと、Netlifyにデプロイされない
- **必ずgit statusで確認してから次のステップへ進む**

### **Step 1: premium-plus.astro（5枚更新）**
```astro
<!-- Line 1367-1383 -->
<img src="/upsell-images/upsell-YYYYMMDD.png" />  <!-- 最新日 -->
<img src="/upsell-images/upsell-YYYYMMDD.png" />  <!-- 1日前 -->
<img src="/upsell-images/upsell-YYYYMMDD.png" />  <!-- 2日前 -->
<img src="/upsell-images/upsell-YYYYMMDD.png" />  <!-- 3日前 -->
<img src="/upsell-images/upsell-YYYYMMDD.png" />  <!-- 4日前 -->
```

### **Step 2: premium-sanrenpuku.astro（3枚更新）**
```astro
<!-- Line 401-413: Premium Plus CTAセクション -->
<img src="/upsell-images/upsell-YYYYMMDD.png" />  <!-- 最新日 -->
<img src="/upsell-images/upsell-YYYYMMDD.png" />  <!-- 1日前 -->
<img src="/upsell-images/upsell-YYYYMMDD.png" />  <!-- 2日前 -->
```

### **Step 3: withdrawal-upsell.astro（自動）**
- ✅ **自動で最新画像を読み込み**（Line 534）
- ✅ 最大10日前まで遡って検索
- ✅ 手動更新不要

### **Step 4: コミット・プッシュ（画像ファイル + Astroファイル）**
```bash
# 画像ファイルがUntracked filesの場合は追加（再確認）
git add public/upsell-images/upsell-YYYYMMDD.png

# Astroファイルも追加
git add src/pages/premium-plus.astro src/pages/premium-sanrenpuku.astro

# コミット
git commit -m "📸 Premium Plus実績画像更新・YYYY-MM-DD"

# プッシュ
git push origin main
```

### **コミットメッセージ例**
```
📸 Premium Plus実績画像更新・YYYY-MM-DD

- premium-plus.astro: 直近5戦（MM/DD〜MM/DD）
- premium-sanrenpuku.astro: 直近3戦（MM/DD〜MM/DD）
- withdrawal-upsell.astro: 自動読み込み ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### **⚠️ 重要ポイント**
- 📂 画像は `/public/upsell-images/upsell-YYYYMMDD.png` に配置
- 📅 ファイル名形式: `upsell-20251128.png`（8桁日付）
- 🔄 withdrawal-upsellは自動読み込みのため更新不要

---

## ✅ **チェックリスト（絶対に忘れない）**

### **予想更新時：**
- [ ] マコさんが管理画面でallRacesPrediction.json生成・配置
- [ ] クロちゃんが public/data/ に同期（**必須・スキップ禁止**）
- [ ] クロちゃんが 無料予想アーカイブ保存実行（**必須・スキップ禁止**）
- [ ] クロちゃんが JSON検証
- [ ] クロちゃんが コミット・プッシュ（**必須・スキップ禁止**）
- [ ] **❌「更新不要」判定は絶対にしない**

### **穴馬更新時：**
- [ ] マコさんが管理画面でdarkHorseData.json生成・配置
- [ ] クロちゃんが public/data/ に同期（**必須・スキップ禁止**）
- [ ] クロちゃんが JSON検証（レース数・穴馬候補数）
- [ ] クロちゃんが STORAGE_VERSION更新（**2箇所・必須**）
- [ ] クロちゃんが コミット・プッシュ（**必須・スキップ禁止**）
- [ ] **❌「更新不要」判定は絶対にしない**

### **馬単結果更新時：**
- [ ] マコさんが archiveResults_2025-12.json に貼り付け
- [ ] クロちゃんが **最新1日分のみ抽出**してarchiveResults.jsonに保存（**必須・スキップ禁止**）
- [ ] クロちゃんが JSON検証
- [ ] クロちゃんが public/data/ に両方同期（**必須・スキップ禁止**）
- [ ] クロちゃんが 1回のコミットで両ファイル更新・プッシュ（**必須・スキップ禁止**）
- [ ] **❌「更新不要」判定は絶対にしない**

### **三連複結果更新時：**
- [ ] マコさんが archiveSanrenpukuResults_2025-12.json に貼り付け
- [ ] クロちゃんが **11月分+12月分を統合**してarchiveSanrenpukuResults.jsonに保存（**必須・スキップ禁止**）
- [ ] クロちゃんが JSON検証（11月○日分+12月○日分）
- [ ] クロちゃんが public/data/ に両方同期（**必須・スキップ禁止**）
- [ ] クロちゃんが コミット・プッシュ（**必須・スキップ禁止**）
- [ ] **❌「更新不要」判定は絶対にしない**
- [ ] **❌「最新1日分のみ抽出」は絶対にしない**（11月分が消える）

### **画像更新時：**
- [ ] マコさんが upsell-YYYYMMDD.png を public/upsell-images/ に配置
- [ ] クロちゃんが git status で確認（**必須**）
- [ ] クロちゃんが premium-plus.astro 5枚更新（**必須**）
- [ ] クロちゃんが premium-sanrenpuku.astro 3枚更新（**必須**）
- [ ] クロちゃんが コミット・プッシュ（**必須・スキップ禁止**）
- [ ] **❌「更新不要」判定は絶対にしない**

---

## 📊 **馬単と三連複の違い（重要）**

| 項目 | 馬単結果 | 三連複結果 |
|------|----------|------------|
| **月別ファイル** | archiveResults_2025-12.json | archiveSanrenpukuResults_2025-12.json |
| **統合ファイル** | archiveResults.json | archiveSanrenpukuResults.json |
| **統合ファイル内容** | **最新1日分のみ** | **11月全日分+12月全日分** |
| **用途1** | トップページ「昨日の結果」 | /archive-sanrenpuku/2025/11/ |
| **用途2** | /archive/2025/12/ | /archive-sanrenpuku/2025/12/ |
| **用途3** | - | /standard-predictions/（最新日のみ使用） |
| **用途4** | - | /premium-predictions/（最新日のみ使用） |
| **長期運用** | 常に1日分（2.8KB） | 月が増えるごとに増加（11月+12月=約10KB） |

**重要ポイント：**
- ✅ **馬単**：トップページで使うため、最新1日分のみ抽出（ファイルサイズ最小化）
- ✅ **三連複**：/archive-sanrenpuku/で全日分表示するため、複数月統合が必要

---

## 🗓️ **月末処理（1月1日など）**

### **🚨 重要：新月開始時の必須手順（3ステップ）**

新月開始時に以下の3つを必ず実行してください：

#### **Step 1: 新しい月別ファイルを作成**
```bash
# 例: 2026年2月開始時
cp src/data/archiveResults_2026-01.json src/data/archiveResults_2026-02.json
cp src/data/archiveSanrenpukuResults_2026-01.json src/data/archiveSanrenpukuResults_2026-02.json

# 中身を空にして新月開始（手動編集）
```

#### **Step 2: アーカイブページにインポート追加（必須・忘れるとビルドエラー）**

**⚠️ 絶対に忘れてはいけない：**
新しい月別ファイルを作成したら、**必ず**アーカイブページにインポートを追加してください。
忘れると`validate-archive-data.js`がビルドエラーを発生させます。

**馬単アーカイブ（archive/index.astro）:**
```astro
// インポート追加
import archiveData2026_02 from '../../data/archiveResults_2026-02.json';

// データ統合に追加
const archiveData = {
  '2026': {
    ...archiveData2026_01['2026'],
    ...archiveData2026_02['2026']  // ← 新月分を追加
  }
};
```

**三連複アーカイブ（archive-sanrenpuku/index.astro）:**
```astro
// インポート追加
import archiveData2026_02 from '../../data/archiveSanrenpukuResults_2026-02.json';

// データ統合に追加
const archiveSanrenpukuResults = {
  '2026': {
    ...archiveData2026_01['2026'],
    ...archiveData2026_02['2026']  // ← 新月分を追加
  }
};
```

#### **Step 3: コミット・プッシュ**
```bash
git add src/data/archiveResults_2026-02.json \
        src/data/archiveSanrenpukuResults_2026-02.json \
        src/pages/archive/index.astro \
        src/pages/archive-sanrenpuku/index.astro

git commit -m "🗓️ 2026年2月ファイル作成 + アーカイブインポート追加"
git push origin main
```

### **⚠️ よくあるミス（絶対にしないこと）**

❌ **月別ファイルだけ作成してアーカイブページを更新し忘れる**
- 結果: ビルドエラー（validate-archive-data.jsが検出）
- 修正: archive/index.astro と archive-sanrenpuku/index.astro にインポート追加

❌ **インポートだけ追加してデータ統合を忘れる**
- 結果: アーカイブページに新月データが表示されない
- 修正: `...archiveData2026_02['2026']` を統合オブジェクトに追加

✅ **正しい手順:**
1. 月別ファイル作成
2. アーカイブページにインポート追加
3. データ統合に追加
4. コミット・プッシュ

---

**最終更新**: 2026-02-02
**バージョン**: 2.1.0 - 月末処理の注意事項追加
