// デモ用サブスクリプション更新API
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

export const prerender = false;

export async function POST({ request }) {
  try {
    // リクエストボディの取得
    const body = await request.json()
    const { userId, planType } = body

    if (!userId || !planType) {
      return new Response(JSON.stringify({
        error: '必要なパラメータが不足しています'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // デモモード: Supabaseが利用できない場合はモック応答を返す
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('Demo mode: Supabase not available, returning mock response')
      return new Response(JSON.stringify({
        success: true,
        message: 'デモモードでサブスクリプション情報を更新しました（実際のDBは更新されません）',
        planType: planType,
        demo: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // プロファイルの更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: planType.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return new Response(JSON.stringify({
        error: 'プロファイル更新に失敗しました'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // サブスクリプション情報の挿入/更新
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_subscription_id: `demo_${planType.toLowerCase()}_${Date.now()}`,
        status: 'active',
        plan_id: planType.toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (subscriptionError) {
      console.error('Subscription update error:', subscriptionError)
      return new Response(JSON.stringify({
        error: 'サブスクリプション更新に失敗しました'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'サブスクリプション情報を更新しました',
      planType: planType
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Demo subscription update error:', error)
    return new Response(JSON.stringify({
      error: 'サーバーエラーが発生しました'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}