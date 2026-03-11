# CLAUDE.md - NANKAN Analytics

## Project Overview

```
Project: nankan-analytics
Repository: https://github.com/apol0510/nankan-analytics.git
Working Directory: /Users/apolon/Projects/nankan-analytics/astro-site
Production URL: https://nankan-analytics.keiba.link/
```

**Stack:**
- Astro + Sass (SSG)
- Netlify Pro (Functions)
- Airtable Pro (Customer DB)
- BlastMail (Newsletter)
- SendGrid (Email)

---

## Session Start Checklist

1. Read this file (CLAUDE.md)
2. Verify working directory:
   ```bash
   pwd  # Expected: /Users/apolon/.../nankan-analytics/astro-site
   git remote -v  # Expected: apol0510/nankan-analytics.git
   ```
3. If wrong, move immediately:
   ```bash
   cd "/Users/apolon/Projects/nankan-analytics/astro-site"
   ```

---

## Task-Document Mapping

| Task | Read This First | Required |
|------|----------------|----------|
| 予想更新 | DAILY_UPDATE_PROCEDURES.md | ✅ |
| 穴馬更新 | DAILY_UPDATE_PROCEDURES.md | ✅ |
| 馬単結果更新 | DAILY_UPDATE_PROCEDURES.md | ✅ |
| 三連複結果更新 | DAILY_UPDATE_PROCEDURES.md | ✅ |
| 画像更新 | DAILY_UPDATE_PROCEDURES.md | ✅ |
| 月替わり処理 | MONTHLY_ARCHIVE_GUIDE.md | ✅ |
| 会員関連 | docs/MEMBER_TIERS.md | ✅ |
| 決済関連 | docs/PAYMENT_SYSTEM.md | ✅ |

---

## Critical Rules

### Repository Restrictions

**Allowed:**
- `/Users/apolon/Projects/nankan-analytics/` only

**Forbidden:**
- `/Users/apolon/Projects/Keiba review platform/`
- `/Users/apolon/Projects/nankan-analytics-pro/`
- `/Users/apolon/Projects/` (parent search)
- Other nankan-* projects

**Search Example:**
```bash
# ❌ Wrong
grep -r "pattern" /Users/apolon/Projects/

# ✅ Correct
grep -r "pattern" /Users/apolon/Projects/nankan-analytics/astro-site/
```

### Data File Rules

| Action | Correct | Wrong |
|--------|---------|-------|
| Read | `/src/data/` | ❌ `/public/data/` |
| Write | `/src/data/` | ❌ `/public/data/` |
| Sync | `cp src/data/* public/data/` | - |

**Workflow:**
1. Read from `src/data/archiveResults_2026-03.json`
2. Update `src/data/archiveResults_2026-03.json`
3. Copy to `public/data/archiveResults_2026-03.json`

**Reason:**
- `src/data/` = Master data (build-time import)
- `public/data/` = Copy (browser fetch)

---

## Member Tiers

```
Free → Premium (Standard含む) → Sanrenpuku (Combo含む) → Plus (単品)
```

**Critical:**
1. Premium Plus = 単品商品（会員プランではない）
2. 三連複買い切り = Premium有効期間内のみ閲覧可能
3. 段階的にしか利用できない（飛び級不可）

Detail: [docs/MEMBER_TIERS.md](./docs/MEMBER_TIERS.md)

---

## Pricing (2026-02-09)

**Main Plans (/pricing/):**
- Standard: ¥5,980/月（一時非表示）
- Premium 買い切り: ¥78,000（永久）
- Premium 年払い: ¥68,000/年
- Premium 月払い: ¥18,000/月

**Upgrade Plans (既存会員):**
- Sanrenpuku 買い切り: ¥78,000（永久・Premium有効期間内のみ）
- Combo 買い切り: ¥78,000（永久・Premium有効期間内のみ）

**Single Product (Sanrenpuku/Combo会員):**
- Premium Plus: ¥68,000（単品）

Detail: [docs/PAYMENT_SYSTEM.md](./docs/PAYMENT_SYSTEM.md)

---

## Payment Methods

### Bank Transfer (Main)
- **Account:** 三井住友銀行 洲本支店 普通 5338892
- **Automation:** bank-transfer-application.js → send-payment-confirmation-auto.js
- **Process:** Form submit → Airtable/BlastMail → Status:active → Email

### Paddle (Approved, Not Integrated)
- Approved: 2026-01-26
- Site: https://payment.tirol.link
- TODO: Payment Links, Webhook, Integration

---

## Commands

### Daily Operations
```bash
cd "/Users/apolon/Projects/nankan-analytics/astro-site"
npm run dev
npm run build
node scripts/fetch-from-keiba-data-shared.js
```

### Git
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

**Netlify (Site settings → Environment variables):**
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

### Daily Operations
- [DAILY_UPDATE_PROCEDURES.md](./DAILY_UPDATE_PROCEDURES.md) - 予想・穴馬・結果・画像更新
- [MONTHLY_ARCHIVE_GUIDE.md](./MONTHLY_ARCHIVE_GUIDE.md) - 月替わり処理（未作成）

### System Specs
- [docs/MEMBER_TIERS.md](./docs/MEMBER_TIERS.md) - 会員階層・ページ対応表
- [docs/PAYMENT_SYSTEM.md](./docs/PAYMENT_SYSTEM.md) - 決済・価格・銀行振込
- [docs/MAINTENANCE_HISTORY.md](./docs/MAINTENANCE_HISTORY.md) - 過去実装記録

---

## Current Priorities

**High:**
1. SendGrid Marketing Campaigns移行（BlastMail API制約対応）
2. MONTHLY_ARCHIVE_GUIDE.md作成

**Medium:**
3. Paddle決済統合（Payment Links・Webhook）
4. 2場開催対応定常化（現在は手動コピー）
