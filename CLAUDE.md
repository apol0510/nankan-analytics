# CLAUDE.md

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

## Repository Rule

Allowed


/Users/apolon/Projects/nankan-analytics


Forbidden


/Users/apolon/Projects/Keiba review platform
/Users/apolon/Projects/nankan-analytics-pro
/Users/apolon/Projects/*


Correct search


grep -r "pattern" /Users/apolon/Projects/nankan-analytics/astro-site


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

## Rule

このファイルは **司令塔のみ**

長文説明  
履歴  
哲学  

は禁止

詳細は docs に書く
