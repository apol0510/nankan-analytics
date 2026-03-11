# CLAUDE.md

## Project

```
nankan-analytics
Repository: https://github.com/apol0510/nankan-analytics.git
Working Dir: /Users/apolon/Projects/nankan-analytics/astro-site
Production: https://nankan-analytics.keiba.link/
```

**Stack:** Astro (SSG) / Netlify Pro / Airtable / BlastMail / SendGrid

---

## Session Start

1. Read CLAUDE.md
2. Verify working directory:
   ```bash
   pwd  # /Users/apolon/.../nankan-analytics/astro-site
   git remote -v  # apol0510/nankan-analytics.git
   ```
3. If wrong, move: `cd "/Users/apolon/Projects/nankan-analytics/astro-site"`

---

## Task-Document Map

| Task | Document | Required |
|------|----------|----------|
| 予想更新 | DAILY_UPDATE_PROCEDURES.md | ✅ |
| 穴馬更新 | DAILY_UPDATE_PROCEDURES.md | ✅ |
| 馬単結果更新 | DAILY_UPDATE_PROCEDURES.md | ✅ |
| 三連複結果更新 | DAILY_UPDATE_PROCEDURES.md | ✅ |
| 画像更新 | DAILY_UPDATE_PROCEDURES.md | ✅ |
| 月替わり処理 | astro-site/MONTHLY_ARCHIVE_GUIDE.md | ✅ |
| 会員関連 | docs/MEMBER_TIERS.md | ✅ |
| 決済関連 | docs/PAYMENT_SYSTEM.md | ✅ |

---

## Repository Rules

**Allowed:** `/Users/apolon/Projects/nankan-analytics/` only

**Forbidden:**
- `/Users/apolon/Projects/Keiba review platform/`
- `/Users/apolon/Projects/nankan-*/` (other nankan projects)
- `/Users/apolon/Projects/` (parent search)

**Search:**
```bash
# ❌ Wrong
grep -r "pattern" /Users/apolon/Projects/

# ✅ Correct
grep -r "pattern" /Users/apolon/Projects/nankan-analytics/astro-site/
```

---

## Data File Rules

| Action | Correct | Wrong |
|--------|---------|-------|
| Read | `src/data/` | ❌ `public/data/` |
| Write | `src/data/` | ❌ `public/data/` |
| Sync | `cp src/data/* public/data/` | - |

**Workflow:**
1. Read `src/data/archiveResults_2026-03.json`
2. Update `src/data/archiveResults_2026-03.json`
3. Copy: `cp src/data/archiveResults_2026-03.json public/data/`

**Reason:** `src/data/` = Master (build-time), `public/data/` = Copy (fetch)

---

## Member Tiers

```
Free → Premium (Standard含) → Sanrenpuku (Combo含) → Plus (単品)
```

**Critical:**
- Premium Plus = 単品商品（会員プランではない）
- 三連複買い切り = Premium有効期間内のみ閲覧可
- 段階的のみ（飛び級不可）

Detail: [docs/MEMBER_TIERS.md](./docs/MEMBER_TIERS.md)

---

## Pricing

See: [docs/PAYMENT_SYSTEM.md](./docs/PAYMENT_SYSTEM.md)

**Summary (2026-02-09):**
- Standard: ¥5,980/月（一時非表示）
- Premium: ¥78,000（買切）/ ¥68,000（年払）/ ¥18,000（月払）
- Sanrenpuku/Combo: ¥78,000（買切・Premium有効期間内のみ）
- Plus: ¥68,000（単品）

---

## Payment

See: [docs/PAYMENT_SYSTEM.md](./docs/PAYMENT_SYSTEM.md)

**Current:**
- Bank Transfer (Main): 自動化済み (bank-transfer-application.js)
- Paddle (Approved 2026-01-26): 未統合

---

## Commands

**Daily:**
```bash
cd "/Users/apolon/Projects/nankan-analytics/astro-site"
npm run dev
npm run build
node scripts/fetch-from-keiba-data-shared.js
```

**Git:**
```bash
git status
git diff
git add [files]
git commit -m "🎨 [subject]

[detail]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

---

## Environment Variables

Netlify: Site settings → Environment variables

```bash
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
SENDGRID_API_KEY=SG...
BLASTMAIL_API_KEY=...
BLASTMAIL_API_SECRET=...
BLASTMAIL_USER_CODE=...
BLASTMAIL_LIST_ID=...
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=...
```

---

## Documents

**Daily:**
- [DAILY_UPDATE_PROCEDURES.md](./DAILY_UPDATE_PROCEDURES.md) - 予想・穴馬・結果・画像
- [astro-site/MONTHLY_ARCHIVE_GUIDE.md](./astro-site/MONTHLY_ARCHIVE_GUIDE.md) - 月替わり

**System:**
- [docs/MEMBER_TIERS.md](./docs/MEMBER_TIERS.md) - 会員階層・ページ対応
- [docs/PAYMENT_SYSTEM.md](./docs/PAYMENT_SYSTEM.md) - 決済・価格・銀行振込
- [docs/MAINTENANCE_HISTORY.md](./docs/MAINTENANCE_HISTORY.md) - 実装履歴

---

## Priorities

**High:**
1. SendGrid Marketing Campaigns移行
2. Paddle決済統合

**Medium:**
3. 2場開催対応定常化
