// メルマガ登録フォーム JavaScript

// Exit Intent Detection
let exitIntentTriggered = false;
const exitIntentDelay = 2000; // 2秒後に有効化

document.addEventListener('DOMContentLoaded', function() {
    // Exit Intent Popupの初期化
    initExitIntentPopup();
    
    // フォーム送信の処理
    initNewsletterForms();
    
    // スクロール位置での記事中CTA表示
    initScrollCTA();
});

// Exit Intent Popup初期化
function initExitIntentPopup() {
    // ポップアップHTML作成
    const popup = document.createElement('div');
    popup.id = 'exit-intent-popup';
    popup.className = 'exit-intent-popup';
    popup.innerHTML = `
        <div class="exit-intent-content">
            <button class="exit-intent-close" onclick="closeExitIntentPopup()">&times;</button>
            <h3>🎁 特典を受け取りませんか？</h3>
            <p>競馬AI構築完全マニュアル（Python実装コード付き）をプレゼント！</p>
            <form name="exit-intent-newsletter" method="POST" data-netlify="true" onsubmit="handleNewsletterSubmit(event)">
                <input type="hidden" name="form-name" value="exit-intent-newsletter">
                <input type="email" name="email" placeholder="メールアドレスを入力" required>
                <button type="submit" class="cta-button">今すぐ無料で受け取る</button>
            </form>
        </div>
    `;
    document.body.appendChild(popup);
    
    // Exit Intentイベントリスナー
    setTimeout(() => {
        document.addEventListener('mouseleave', function(e) {
            if (e.clientY < 0 && !exitIntentTriggered) {
                showExitIntentPopup();
            }
        });
        
        // モバイル用：スクロールアップ検知
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', function() {
            if (window.scrollY < lastScrollY && window.scrollY < 100 && !exitIntentTriggered) {
                showExitIntentPopup();
            }
            lastScrollY = window.scrollY;
        });
    }, exitIntentDelay);
}

// Exit Intent Popup表示
function showExitIntentPopup() {
    if (localStorage.getItem('newsletter-subscribed') || localStorage.getItem('exit-popup-closed')) {
        return;
    }
    
    exitIntentTriggered = true;
    const popup = document.getElementById('exit-intent-popup');
    if (popup) {
        popup.style.display = 'flex';
        // アニメーション
        setTimeout(() => {
            popup.style.opacity = '1';
        }, 10);
        
        // Google Analytics イベント
        if (typeof gtag !== 'undefined') {
            gtag('event', 'popup_shown', {
                'event_category': 'Newsletter',
                'event_label': 'Exit Intent'
            });
        }
    }
}

// Exit Intent Popup閉じる
function closeExitIntentPopup() {
    const popup = document.getElementById('exit-intent-popup');
    if (popup) {
        popup.style.display = 'none';
        localStorage.setItem('exit-popup-closed', 'true');
        
        // Google Analytics イベント
        if (typeof gtag !== 'undefined') {
            gtag('event', 'popup_closed', {
                'event_category': 'Newsletter',
                'event_label': 'Exit Intent'
            });
        }
    }
}

// フォーム送信処理
function initNewsletterForms() {
    const forms = document.querySelectorAll('form[name*="newsletter"]');
    forms.forEach(form => {
        form.addEventListener('submit', handleNewsletterSubmit);
    });
}

// Newsletter フォーム送信処理
function handleNewsletterSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    const formName = form.getAttribute('name');
    
    // バリデーション
    if (!isValidEmail(email)) {
        showMessage('有効なメールアドレスを入力してください', 'error');
        return;
    }
    
    // 送信ボタン無効化
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = '送信中...';
    
    // Netlify Forms に送信
    fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encode({
            'form-name': formName,
            'email': email
        })
    })
    .then(() => {
        // 成功処理
        showMessage('登録ありがとうございます！特典をメールでお送りします。', 'success');
        form.reset();
        localStorage.setItem('newsletter-subscribed', 'true');
        
        // Exit Intent Popup閉じる
        if (formName.includes('exit-intent')) {
            closeExitIntentPopup();
        }
        
        // Google Analytics イベント
        if (typeof gtag !== 'undefined') {
            gtag('event', 'newsletter_signup', {
                'event_category': 'Newsletter',
                'event_label': formName
            });
        }
        
        // 配配メールAPI連携（実装が必要な場合）
        sendToHaihaiMail(email);
    })
    .catch(() => {
        showMessage('エラーが発生しました。しばらく経ってから再度お試しください。', 'error');
    })
    .finally(() => {
        // 送信ボタン復元
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    });
}

// 配配メール API連携（プレースホルダー）
function sendToHaihaiMail(email) {
    // 配配メールAPIへの連携処理をここに実装
    // 実際の実装では、サーバーサイドでAPI連携を行うことを推奨
    console.log('配配メールに登録:', email);
}

// フォームデータエンコード
function encode(data) {
    return Object.keys(data)
        .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
        .join("&");
}

// メールアドレスバリデーション
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// メッセージ表示
function showMessage(message, type) {
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.newsletter-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // メッセージ要素作成
    const messageDiv = document.createElement('div');
    messageDiv.className = `newsletter-message newsletter-message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        font-weight: 600;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        ${type === 'success' 
            ? 'background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);' 
            : 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);'
        }
    `;
    
    document.body.appendChild(messageDiv);
    
    // 3秒後に自動削除
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// スクロール位置での記事中CTA表示
function initScrollCTA() {
    let ctaShown = false;
    
    window.addEventListener('scroll', () => {
        if (ctaShown || localStorage.getItem('newsletter-subscribed')) {
            return;
        }
        
        const scrollPercent = (window.scrollY) / (document.body.scrollHeight - window.innerHeight);
        
        // 50%スクロールした時点でCTA表示
        if (scrollPercent > 0.5) {
            showScrollCTA();
            ctaShown = true;
        }
    });
}

// スクロールCTA表示
function showScrollCTA() {
    const article = document.querySelector('.article-content, .post-content, article');
    if (!article) return;
    
    const cta = document.createElement('div');
    cta.className = 'article-cta';
    cta.innerHTML = `
        <h4>🚀 競馬AIで予想精度を向上させませんか？</h4>
        <p>Python実装コード付きの完全マニュアルを無料プレゼント中！</p>
        <form name="scroll-newsletter" method="POST" data-netlify="true" onsubmit="handleNewsletterSubmit(event)">
            <input type="hidden" name="form-name" value="scroll-newsletter">
            <input type="email" name="email" placeholder="メールアドレスを入力" required style="width: 100%; margin-bottom: 1rem; padding: 0.75rem; border: 1px solid #475569; border-radius: 0.5rem; background-color: #0f172a; color: #e2e8f0;">
            <button type="submit">今すぐ無料で受け取る</button>
        </form>
    `;
    
    // 記事の中間に挿入
    const paragraphs = article.querySelectorAll('p');
    if (paragraphs.length > 3) {
        const insertAfter = paragraphs[Math.floor(paragraphs.length / 2)];
        insertAfter.parentNode.insertBefore(cta, insertAfter.nextSibling);
    } else {
        article.appendChild(cta);
    }
    
    // Google Analytics イベント
    if (typeof gtag !== 'undefined') {
        gtag('event', 'scroll_cta_shown', {
            'event_category': 'Newsletter',
            'event_label': 'Article CTA'
        });
    }
}

// ヘッダー固定CTA（オプション）
function addHeaderCTA() {
    if (localStorage.getItem('newsletter-subscribed') || localStorage.getItem('header-cta-dismissed')) {
        return;
    }
    
    const headerCTA = document.createElement('div');
    headerCTA.className = 'header-newsletter-cta';
    headerCTA.innerHTML = `
        🎯 競馬AI完全マニュアル無料プレゼント中！
        <a href="#newsletter" onclick="scrollToNewsletter()"">今すぐ受け取る</a>
        <button onclick="dismissHeaderCTA()" style="background:none;border:none;color:white;margin-left:10px;cursor:pointer;">✕</button>
    `;
    
    document.body.insertBefore(headerCTA, document.body.firstChild);
}

// ヘッダーCTA削除
function dismissHeaderCTA() {
    const headerCTA = document.querySelector('.header-newsletter-cta');
    if (headerCTA) {
        headerCTA.remove();
        localStorage.setItem('header-cta-dismissed', 'true');
    }
}

// Newsletter セクションにスクロール
function scrollToNewsletter() {
    const newsletterSection = document.querySelector('.newsletter-form, form[name*="newsletter"]');
    if (newsletterSection) {
        newsletterSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// 外部からアクセス可能な関数をグローバル化
window.closeExitIntentPopup = closeExitIntentPopup;
window.handleNewsletterSubmit = handleNewsletterSubmit;
window.dismissHeaderCTA = dismissHeaderCTA;
window.scrollToNewsletter = scrollToNewsletter;