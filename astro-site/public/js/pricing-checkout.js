// pricing-checkout.js - イベント委譲でボタンクリックを処理
(() => {
  async function subscribe(planId) {
    try {
      // ユーザー認証チェック（仮実装）
      const userEmail = prompt('メールアドレスを入力してください（本来は認証システムから取得）');
      if (!userEmail) return;

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

      const data = await response.json();

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.details || data.error || response.statusText);
      }

      if (!data.url) {
        throw new Error('Checkout URLが返りませんでした');
      }

      // Stripe Checkoutにリダイレクト
      window.location.href = data.url;

    } catch (error) {
      console.error('Subscription error:', error);
      alert('エラーが発生しました。しばらくしてからお試しください。');
    }
  }

  // クリックを一括で拾う（ボタンを後で増やしてもOK）
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-subscribe]');
    if (!btn) return;
    
    e.preventDefault(); // デフォルト動作を防ぐ
    
    const plan = btn.getAttribute('data-plan');
    if (!plan) {
      console.error('data-plan属性が見つかりません');
      return;
    }
    
    subscribe(plan);
  });
})();