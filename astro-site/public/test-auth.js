// テスト用認証関数
window.setTestAuth = function(plan = 'premium') {
    // user-planデータを設定
    const userData = {
        email: 'test@example.com',
        plan: plan,
        name: 'テストユーザー',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30日後
    };

    localStorage.setItem('user-plan', JSON.stringify(userData));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userPlan', plan);

    console.log(`✅ テスト認証設定完了: ${plan}会員`);
    console.log('userData:', userData);

    // ページをリロードして変更を反映
    setTimeout(() => {
        location.reload();
    }, 100);
};

// 認証をクリアする関数
window.clearTestAuth = function() {
    localStorage.removeItem('user-plan');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userPlan');

    // test_subscriptionも削除
    const testKeys = Object.keys(localStorage).filter(key => key.startsWith('test_subscription_'));
    testKeys.forEach(key => localStorage.removeItem(key));

    console.log('🗑️ テスト認証データをクリアしました');

    // ページをリロードして変更を反映
    setTimeout(() => {
        location.reload();
    }, 100);
};

console.log('📝 テスト認証関数を読み込みました');
console.log('使い方: setTestAuth("premium") または setTestAuth("standard") または setTestAuth("free")');
console.log('クリア: clearTestAuth()');