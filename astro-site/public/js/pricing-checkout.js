// pricing-checkout.js - イベント委譲でボタンクリックを処理
(() => {
  console.log('[pricing] Script loaded');
  
  async function subscribe(planId) {
    console.log('[pricing] subscribe called with plan:', planId);
    try {
      // ユーザー認証チェック（仮実装）
      const userEmail = prompt('メールアドレスを入力してください（本来は認証システムから取得）');
      if (!userEmail) {
        console.log('[pricing] User cancelled email input');
        return;
      }
      
      console.log('[pricing] Creating checkout session for:', userEmail, planId);

      // Checkout Session作成
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: planId,
          email: userEmail,
          successUrl: window.location.origin + '/payment/success?session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: window.location.origin + '/pricing'
        })
      });

      console.log('[pricing] Checkout API response:', response.status);
      const data = await response.json();
      console.log('[pricing] Checkout API data:', data);

      if (!response.ok) {
        throw new Error(data.details || data.error || response.statusText);
      }

      if (!data.url) {
        throw new Error('Checkout URLが返りませんでした');
      }

      console.log('[pricing] Redirecting to checkout:', data.url);
      // Stripe Checkoutにリダイレクト
      window.location.href = data.url;

    } catch (error) {
      console.error('[pricing] Subscription error:', error);
      alert('エラー: ' + (error.message || 'しばらくしてからお試しください。'));
    }
  }

  // クリックを一括で拾う（ボタンを後で増やしてもOK）
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-subscribe]');
    if (!btn) return;
    
    console.log('[pricing] Button clicked:', btn);
    e.preventDefault(); // デフォルト動作を防ぐ
    
    const plan = btn.getAttribute('data-plan');
    if (!plan) {
      console.error('[pricing] data-plan属性が見つかりません');
      return;
    }
    
    console.log('[pricing] Plan selected:', plan);
    subscribe(plan);
  });
  
  // ボタン確認
  document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('[data-subscribe]');
    console.log('[pricing] Found subscribe buttons:', buttons.length);
    buttons.forEach((btn, i) => {
      console.log(`[pricing] Button ${i}:`, btn.getAttribute('data-plan'), btn.textContent.trim());
    });
  });
})();