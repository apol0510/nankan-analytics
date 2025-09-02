決済フロー完全版（Astro / TypeScript）
0) 前提と全体像

ログイン必須（未ログインは /auth/loginへ）

権限の唯一の真実は Stripe Webhook（フロントの成功ページは“仮”）

主要イベント：

checkout.session.completed（初回補助）

customer.subscription.created/updated/deleted

invoice.paid / invoice.payment_failed

アップ/ダウンは Stripe カスタマーポータル 基本運用

冪等性：stripe_eventsでevent_idをPK格納し二重処理防止

[料金ページ]→[プラン選択]→[create-checkout(API)]→[Stripe Checkout]
→(成功)→/payment/success (仮表示)
→(裏) Webhook 受信→DB更新→profilesへスナップショット反映

1) .env（本番/テスト分離）
# ---- Stripe ----
STRIPE_MODE=live                   # test / live
STRIPE_SECRET_KEY=sk_live_xxxxx
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxxxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxx
STRIPE_STANDARD_PRICE_ID_LIVE=price_xxxxx
STRIPE_PREMIUM_PRICE_ID_LIVE=price_xxxxx
STRIPE_STANDARD_PRICE_ID_TEST=price_xxxxx
STRIPE_PREMIUM_PRICE_ID_TEST=price_xxxxx
STRIPE_BILLING_PORTAL_RETURN_URL=https://keiba.link/account

# ---- Supabase ----
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx   # サーバのみ

# ---- SendGrid ----
SENDGRID_API_KEY=SG.xxxxx

# ---- App ----
SITE_URL=https://keiba.link

2) DBスキーマ（Supabase / SQL）
2-1. 既存 profiles の拡張
-- プラン＆ステータス
CREATE TYPE subscription_plan   AS ENUM ('free','standard','premium');
CREATE TYPE subscription_status AS ENUM ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused');

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS active_plan subscription_plan DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS active_status subscription_status DEFAULT 'incomplete',
  ADD COLUMN IF NOT EXISTS active_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_uidx ON profiles(user_email);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_customer_uidx ON profiles(stripe_customer_id);


profiles は「現在の見やすいスナップショット」。権限制御はここを見る。

2-2. サブスクリプション本体
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,                         -- stripe_subscription_id
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  customer_id TEXT NOT NULL,
  price_id TEXT NOT NULL,
  plan subscription_plan NOT NULL,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at            TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  default_payment_method TEXT,
  latest_invoice TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscriptions_profile_idx ON subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);

2-3. Webhook冪等 & 監査
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL
);

3) RLS（Row Level Security）とポリシー

重要：profiles の「課金系カラム」はクライアント更新禁止。
Service Role（サーバ）だけが更新できる設計にします。

-- 有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- 読み取り：本人のみ
CREATE POLICY "profiles_select_self"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- 更新：本人は “課金系フィールド以外” を更新可
CREATE POLICY "profiles_update_self_non_billing"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (stripe_customer_id IS NOT DISTINCT FROM OLD.stripe_customer_id)
  AND (active_plan IS NOT DISTINCT FROM OLD.active_plan)
  AND (active_status IS NOT DISTINCT FROM OLD.active_status)
  AND (active_subscription_id IS NOT DISTINCT FROM OLD.active_subscription_id)
  AND (subscription_current_period_end IS NOT DISTINCT FROM OLD.subscription_current_period_end)
);

-- subscriptions / stripe_events は Service Roleのみ（=RLSで一般ユーザは不可）
-- Service RoleはRLSをバイパスするため、追加ポリシーは不要です。

4) 価格ID→プラン マッピング（サーバ共通ユーティリティ）

src/lib/billing/plan.ts

export type Plan = 'standard' | 'premium';

export const getEnv = (key: string) => {
  const v = process.env[key] ?? import.meta.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
};

const isLive = (getEnv('STRIPE_MODE') ?? 'test') === 'live';

export const PRICE = {
  standard: isLive ? getEnv('STRIPE_STANDARD_PRICE_ID_LIVE') : getEnv('STRIPE_STANDARD_PRICE_ID_TEST'),
  premium : isLive ? getEnv('STRIPE_PREMIUM_PRICE_ID_LIVE')  : getEnv('STRIPE_PREMIUM_PRICE_ID_TEST'),
} as const;

export function planFromPriceId(priceId: string): Plan {
  if (priceId === PRICE.standard) return 'standard';
  if (priceId === PRICE.premium)  return 'premium';
  throw new Error(`Unknown priceId: ${priceId}`);
}

5) サーバAPI（Astro API Routes / TypeScript）
5-1. Stripe 初期化（共通）

src/lib/stripe.ts

import Stripe from 'stripe';
import { getEnv } from './billing/plan';

export const stripe = new Stripe(getEnv('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

5-2. Supabase サーバクライアント（Service Role）

src/lib/supabaseAdmin.ts

import { createClient } from '@supabase/supabase-js';

const url = process.env.PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

5-3. Checkout作成

src/pages/api/stripe/create-checkout.ts

import type { APIRoute } from 'astro';
import { stripe } from '@/lib/stripe';
import { PRICE } from '@/lib/billing/plan';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { plan, userId, email } = await request.json() as { plan: 'standard'|'premium'; userId: string; email: string; };
    if (!plan || !userId || !email) return new Response('Bad Request', { status: 400 });

    // 既存customer紐付け（あれば）
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICE[plan], quantity: 1 }],
      customer: profile?.stripe_customer_id || undefined,
      customer_creation: 'if_required',
      customer_email: profile?.stripe_customer_id ? undefined : email,
      success_url: `${process.env.SITE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/payment/cancel`,
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { plan, supabase_uid: userId },
        payment_settings: { save_default_payment_method: 'on_subscription' },
      },
      metadata: { plan, supabase_uid: userId },
    }, {
      idempotencyKey: `checkout:${userId}:${plan}`  // 冪等
    });

    return new Response(JSON.stringify({ id: session.id, url: session.url }), { status: 200 });
  } catch (e: any) {
    console.error(e);
    return new Response('Internal Error', { status: 500 });
  }
};

5-4. Billing ポータル

src/pages/api/stripe/portal.ts

import type { APIRoute } from 'astro';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { userId } = await request.json() as { userId: string };
    const { data: profile, error } = await supabaseAdmin.from('profiles')
      .select('stripe_customer_id').eq('id', userId).single();
    if (error || !profile?.stripe_customer_id) return new Response('No customer', { status: 400 });

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: process.env.STRIPE_BILLING_PORTAL_RETURN_URL!,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response('Internal Error', { status: 500 });
  }
};

5-5. Webhook（最重要）

src/pages/api/stripe/webhook.ts

import type { APIRoute } from 'astro';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { planFromPriceId } from '@/lib/billing/plan';

export const prerender = false; // 必須（サーバで実行）

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature') || '';
  const secret = process.env.STRIPE_MODE === 'live'
    ? process.env.STRIPE_WEBHOOK_SECRET_LIVE!
    : process.env.STRIPE_WEBHOOK_SECRET_TEST!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return new Response('Bad signature', { status: 400 });
  }

  // 冪等 (挿入で重複エラーなら既処理)
  try {
    await supabaseAdmin.from('stripe_events').insert({
      event_id: event.id, type: event.type, payload: event
    });
  } catch(_) {
    return new Response('Already processed', { status: 200 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // 顧客IDが付与されたらprofilesへ保存（初回補助）
        if (session.customer && session.metadata?.supabase_uid) {
          await supabaseAdmin.from('profiles')
            .update({ stripe_customer_id: String(session.customer) })
            .eq('id', session.metadata.supabase_uid);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscriptionAndSnapshot(sub);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(invoice.subscription));
          await upsertSubscriptionAndSnapshot(sub);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(invoice.subscription));
          await upsertSubscriptionAndSnapshot(sub);
        }
        break;
      }

      default:
        // 監視用に残すだけ
        break;
    }

    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error('Webhook processing error:', e);
    return new Response('Webhook error', { status: 500 });
  }
};

// ---- helpers ----
import StripeNS from 'stripe';
type Stripe = StripeNS; // 型 alias

async function upsertSubscriptionAndSnapshot(sub: Stripe.Subscription) {
  const customerId = String(sub.customer);
  // profilesを取得（customer_id経由）
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id').eq('stripe_customer_id', customerId).single();

  // 見つからない場合、checkout.metadataの supabase_uid を頼るケースもあり得るが、
  // 通常は先にprofilesへcustomer_idを保存できている想定
  if (!profile) return;

  // plan解決
  const priceId = (sub.items.data[0]?.price?.id) as string;
  const plan = planFromPriceId(priceId);

  // subscriptions upsert
  await supabaseAdmin.from('subscriptions').upsert({
    id: sub.id,
    profile_id: profile.id,
    customer_id: customerId,
    price_id: priceId,
    plan,
    status: sub.status as any,
    current_period_start: toTs(sub.current_period_start),
    current_period_end: toTs(sub.current_period_end),
    cancel_at: toTs(sub.cancel_at),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    default_payment_method: String(sub.default_payment_method ?? ''),
    latest_invoice: String(sub.latest_invoice ?? '')
  });

  // profilesへスナップショット反映（権限制御はここだけ）
  const snapshot = {
    active_plan: plan,
    active_status: sub.status as any,
    active_subscription_id: sub.id,
    subscription_current_period_end: toTs(sub.current_period_end),
    updated_at: new Date().toISOString()
  };
  // 解約・未払い等の反映ルール（お好みで微調整）
  await supabaseAdmin.from('profiles').update(snapshot).eq('id', profile.id);
}

function toTs(unixOrNull?: number | null) {
  return unixOrNull ? new Date(unixOrNull * 1000).toISOString() : null;
}

6) フロント実装（Astro）
6-1. 料金ページ（ボタン〜Checkout遷移）

src/pages/pricing.astro

---
import { getSupabase } from '@supabase/auth-helpers-astro'; // 使っている場合
const { session, user } = await getSupabase(Astro) ?? {};
const email = user?.email;
const userId = user?.id;
---

<section class="max-w-xl mx-auto">
  <h1>プラン選択</h1>
  {user ? (
    <>
      <button id="btn-standard">Standard ¥5,980/月</button>
      <button id="btn-premium">Premium ¥9,980/月</button>
      <button id="btn-portal">お支払い管理</button>
    </>
  ) : (
    <a href="/auth/login">ログインして購入</a>
  )}
</section>

<script>
async function go(plan){
  const res = await fetch('/api/stripe/create-checkout', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ plan, userId: '{{userId}}', email: '{{email}}' })
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}
document.getElementById('btn-standard')?.addEventListener('click', ()=>go('standard'));
document.getElementById('btn-premium')?.addEventListener('click', ()=>go('premium'));

document.getElementById('btn-portal')?.addEventListener('click', async ()=>{
  const res = await fetch('/api/stripe/portal', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ userId: '{{userId}}' })
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
});
</script>

6-2. 成功ページ（仮表示→Webhook反映までポーリング）

src/pages/payment/success.astro

---
const sessionId = Astro.url.searchParams.get('session_id');
---

<h1>決済処理中…</h1>
<p>権限付与の最終反映は数十秒〜最大2〜3分です。</p>
<p>このままお待ちいただくか、<a href="/account">アカウント</a>を開き直してください。</p>


フロントでは最終確定しない。DBはWebhookで更新され、UIはprofilesを再読込して反映。

7) アクセス制御（SSR/コンポーネント）
7-1. サーバ側ユーティリティ

src/lib/access.ts

type AccessMatrix = {
  [section: string]: { free: boolean; standard: boolean; premium: boolean };
};

export const ACCESS: AccessMatrix = {
  '11R':     { free: true,  standard: true,  premium: true  },
  '10R_12R': { free: false, standard: true,  premium: true  },
  '1R_9R':   { free: false, standard: false, premium: true  },
  'detail':  { free: false, standard: true,  premium: true  },  // 「詳細分析」はpremiumのみなら false/true/true に
};

export function canAccess(plan: 'free'|'standard'|'premium', section: keyof typeof ACCESS) {
  const row = ACCESS[section];
  if (!row) return false;
  if (plan === 'premium') return row.premium;
  if (plan === 'standard') return row.standard;
  return row.free;
}

7-2. 例：AccessControl.astro
---
import { getSupabase } from '@supabase/auth-helpers-astro';
import { canAccess } from '@/lib/access';
const { user, supabase } = await getSupabase(Astro);
let plan: 'free'|'standard'|'premium' = 'free';
if (user) {
  const { data } = await supabase.from('profiles').select('active_plan, active_status').eq('id', user.id).single();
  if (data && ['active','trialing'].includes(data.active_status)) plan = data.active_plan;
}
const section = Astro.props.section as '11R'|'10R_12R'|'1R_9R'|'detail';
const allowed = canAccess(plan, section);
---
{allowed ? <slot /> : <a href="/pricing">このコンテンツは有料です</a>}

8) メール（SendGrid）
8-1. 送信用ユーティリティ

src/lib/mail.ts

import sg from '@sendgrid/mail';
sg.setApiKey(process.env.SENDGRID_API_KEY!);

type Mail = { to: string, subject: string, html: string };

export async function sendMail({to, subject, html}: Mail) {
  await sg.send({ to, from: 'support@keiba.link', subject, html });
}

8-2. Webhook内での送信ポイント

customer.subscription.created / invoice.paid（初回） → ウェルカム

invoice.payment_failed → カード更新導線（/billing）

customer.subscription.deleted → 解約確認

※請求書・領収書はStripe側メール配信ONが楽です。SendGridは会員向けコミュニケーション用に。

9) エラーハンドリング／運用

冪等性：stripe_events(event_id PK)とidempotencyKeyで二重抑止

順不同：invoice.paid→customer.subscription.updated の順差異は upsertSubscriptionAndSnapshot の再実行で上書き整合

失敗時：Webhook内で500ならStripeが再送。アプリ側ログ監視で検知

過去回復：subscriptions履歴があるため、障害時も復旧容易

10) プラン変更・解約

基本：ユーザーは /billing（カスタマーポータル）で自己完結

アップグレード即時適用、ダウングレードは cancel_at_period_end=true（期末）運用が無難

日割り：デフォルトはcreate_prorations（推奨）

11) セキュリティ

Webhook署名検証 + タイムスキュー許容

本番/テストキー完全分離・ローテーション

Service Role Keyはサーバ専用（クライアントに絶対出さない）

ログにPII/カード情報を出さない

12) テスト（Stripe CLI）
# 1) Webhook受信（ローカル）
stripe listen --forward-to localhost:4321/api/stripe/webhook

# 2) トリガ
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.paid
stripe trigger invoice.payment_failed


確認ポイント

stripe_events に event が挿入される（重複不可）

subscriptions が upsert される

profiles.active_plan / active_status が期待値

UIでアクセス範囲が即時反映（再読込）

13) 監視（最低限）

Webhook 2xx 率（エラー閾値でアラート）

subscriptions.status の遷移分布（past_due 増加検知）

メール送信失敗率

API 5xx（create-checkout / portal / webhook）

14) 失敗時のリカバリ／フォールバック

日次同期ジョブ（任意）：前日更新のsubscriptionsをStripe APIで再取得し、profilesへ再スナップショット（万一Webhook欠落時の保険）

手動再実行：stripe_events.payload から再処理スクリプトを走らせる運用フックを用意しておくと◎

15) 既存仕様からの差分（あなたの原案に対する補強）

追加イベント網羅 (customer.subscription.*, invoice.*)

subscriptions / stripe_events の正規化と冪等

RLSで課金カラムのクライアント更新封じ

カスタマーポータル導線

フロントは仮表示、最終判断はWebhook由来に統一

✔ 導入手順（最短）

.env 設定（live/test 両方）

SQL を Supabase で実行（型・テーブル・RLS）

src/lib/* と src/pages/api/stripe/* を配置

料金・成功ページを配置、リンク導線設置

Stripeダッシュボードで Price と Webhook endpoint を設定

Stripe CLIでイベントを流しDB反映とUIを確認

**この仕様書に基づいて実装を確認・修正していきます。**
