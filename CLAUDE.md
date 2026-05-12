# CLAUDE.md

## 【開発実行ルール】

> このプロジェクトでは、ユーザーが「claude.mdを読んで」と指示した時点で、以後の作業に必要な初期確認を自動で進めること。

### 1. 作業開始時
- package.json が存在するディレクトリを自動検出する
- ルート直下にない場合は、astro-site、apps、packages、frontend、admin などのサブディレクトリを探索する
- package.json が複数存在する場合は、プロジェクトの主目的に最も適した実行対象を選ぶ

### 2. 実行ディレクトリ
- 必ず package.json のある適切なディレクトリに自動で移動する
- ユーザーに cd を要求しない
- 現在地が不適切な場合は、自動で正しいディレクトリを特定して以後の案内を行う

### 3. 依存関係
- 初回または node_modules が存在しない場合は依存関係の導入要否を確認する
- pnpm-lock.yaml があれば pnpm を優先
- package-lock.json があれば npm を使用
- yarn.lock があれば yarn を使用
- 依存関係未導入が原因で作業不能な場合は、その旨を明示して必要コマンドを提示する

### 4. 開発サーバー起動判定
- package.json の scripts を確認する
- dev があれば dev を優先
- dev がない場合は start を確認
- build、preview、lint など他の主要スクリプトも確認し、利用可能コマンドを把握する
- ユーザーに毎回スクリプト名を覚えさせない

### 5. モノレポ対応
- モノレポの場合は、どのワークスペースが主実行対象かを判断する
- astro-site や apps/web などがある場合は、それらを優先候補として確認する
- 複数候補がある場合は、用途別に「本体」「管理画面」「決済関連」などを整理して把握する

### 6. ユーザー対応ルール
- ユーザーはコマンドを覚えていない前提で対応する
- ユーザーに cd や詳細コマンドの暗記を要求しない
- 「claude.mdを読んで」と言われたら、必要な作業ディレクトリ特定まで自動で行う
- 起動コマンド実行前に、対象ディレクトリと利用可能スクリプトを簡潔に把握する

### 7. 最終目標
- このプロジェクトでは、ユーザーが VSCode で対象プロジェクトを開き、Claude を起動して「claude.mdを読んで」と入力するだけで、以後の開発作業にスムーズに入れる状態を標準とする

---


## Project

Project: nankan-analytics  
Repo: https://github.com/apol0510/nankan-analytics.git  

Working Directory:
`/Users/apolon/Projects/nankan-analytics/astro-site`

Production:
https://nankan-analytics.keiba.link/

Stack
- Astro
- Netlify
- Airtable
- SendGrid
- BlastMail

---

## Session Start Checklist

1 Read CLAUDE.md  
2 Confirm directory  


pwd
git remote -v


Expected


/Users/apolon/Projects/nankan-analytics/astro-site


If wrong


cd /Users/apolon/Projects/nankan-analytics/astro-site


---

## Task → Document

| Task | Read |
|-----|------|
予想更新 | DAILY_UPDATE_PROCEDURES.md
穴馬更新 | DAILY_UPDATE_PROCEDURES.md
馬単結果 | DAILY_UPDATE_PROCEDURES.md
三連複結果 | DAILY_UPDATE_PROCEDURES.md
画像更新 | DAILY_UPDATE_PROCEDURES.md
月替処理 | MONTHLY_ARCHIVE_GUIDE.md
会員 | docs/MEMBER_TIERS.md
決済 | docs/PAYMENT_SYSTEM.md
Standard買い目 | 下記参照

---

## Standard会員 買い目ロジック

メインレース馬単買い目（1段構成）

**ルール**
- 対抗：必ず含める
- 単穴・連下：馬番順で5頭以内なら含まれる
- 押さえ：除外
- 表示：馬番順ソート（最大5頭）

**例**
軸4番 対抗11番 単穴2番 連下3,6番 押さえ8番
→ 4 ⇔ 1 . 2 . 3 . 6 . 11

**対象ファイル**
- src/pages/standard-predictions.astro
- src/pages/standard-predictions-funabashi.astro
- src/pages/standard-predictions-urawa.astro

---

## Data Rule

Master


src/data


Public copy


public/data


Workflow

1 update src/data  
2 copy → public/data  

Example


cp src/data/archiveResults_2026-03.json public/data/
cp src/data/archiveSanrenpukuResults_2026-03.json public/data/


Never

- public/data を直接編集しない
- public/dataだけ見て判断しない

---

## Member Rules

Structure

Free → Standard → Premium → Sanrenpuku/Combo → Plus

Important

- Standard: ライトプラン（募集中）
- Premium Plus は単品商品
- 三連複は Premium 有効期間内のみ
- 飛び級不可

Detail


docs/MEMBER_TIERS.md


---

## Payment

Main

銀行振込

Details


docs/PAYMENT_SYSTEM.md


---

## Commands

Start dev


cd /Users/apolon/Projects/nankan-analytics/astro-site
npm run dev


Build


npm run build


Fetch data


node scripts/fetch-from-keiba-data-shared.js


Git


git status
git diff
git add .
git commit -m "update"
git push origin main


---

## Env

Netlify variables

- AIRTABLE_API_KEY
- AIRTABLE_BASE_ID
- SENDGRID_API_KEY
- BLASTMAIL_API_KEY
- BLASTMAIL_API_SECRET
- BLASTMAIL_USER_CODE
- BLASTMAIL_LIST_ID
- BASIC_AUTH_USER
- BASIC_AUTH_PASS

---

## Docs

Core


DAILY_UPDATE_PROCEDURES.md
MONTHLY_ARCHIVE_GUIDE.md


System


docs/MEMBER_TIERS.md
docs/PAYMENT_SYSTEM.md
docs/MAINTENANCE_HISTORY.md


---

## Python実行ルール

- `python3 -c "..."` の複数行実行は禁止
- Python は必ず heredoc 形式で実行する: `python3 <<'PY' ... PY`
- Bash文字列内に `#` コメントを入れない

## 結果更新ルール

- 「馬単結果更新」「三連複結果更新」と指示されたら確認を求めず即座に全手順を実行する
- 月別ファイル内の最新日をそのまま採用する
- 月替わりでも確認を求めず自動で対象月を判定する

## Rule

このファイルは **司令塔のみ**

長文説明  
履歴  
哲学  

は禁止

詳細は docs に書く
