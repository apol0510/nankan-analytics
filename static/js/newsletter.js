// NANKANアナリティクス - メルマガ・UI機能

// メルマガフォーム機能
document.addEventListener('DOMContentLoaded', function() {
    // スムーススクロール
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // アニメーション効果
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // 要素にアニメーションを適用
    document.querySelectorAll('.article-card, .sidebar-card, .stat-card, .model-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // メルマガフォーム送信処理
    const newsletterForms = document.querySelectorAll('.newsletter-form');
    newsletterForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const email = form.querySelector('input[name="mailaddr"]').value;
            
            // 簡単なバリデーション
            if (!email || !isValidEmail(email)) {
                e.preventDefault();
                alert('有効なメールアドレスを入力してください。');
                return false;
            }

            // 送信中の表示
            const submitButton = form.querySelector('.newsletter-button');
            const originalText = submitButton.textContent;
            submitButton.textContent = '登録中...';
            submitButton.disabled = true;

            // フォームが配配メールに送信される前にユーザーフィードバック
            setTimeout(() => {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }, 3000);
        });
    });

    // メールアドレス検証関数
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // カードホバー効果の強化
    document.querySelectorAll('.article-card, .model-card, .stat-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            if (this.classList.contains('article-card')) {
                this.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.2)';
            }
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });

    // スクロールアニメーションの調整（最適化版）
    let ticking = false;
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('.hero-section');
        if (parallax) {
            const speed = scrolled * 0.5;
            parallax.style.transform = `translateY(${speed}px)`;
        }
        ticking = false;
    }
    
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    });

    // レスポンシブメニューの処理
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // 統計数値のカウントアップアニメーション
    function countUp(element, target, suffix, duration = 2000) {
        const increment = target / (duration / 20);
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            // 表示フォーマット
            if (suffix === '%') {
                if (target >= 100) {
                    element.textContent = Math.floor(current) + suffix;
                } else {
                    element.textContent = current.toFixed(1) + suffix;
                }
            } else if (target >= 1000) {
                element.textContent = Math.floor(current).toLocaleString() + suffix;
            } else {
                element.textContent = Math.floor(current) + suffix;
            }
        }, 20);
    }

    // 統計カードが見えたときにアニメーション開始
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumber = entry.target.querySelector('.stat-number');
                const text = statNumber.textContent;
                
                // 数値を抽出してアニメーション
                if (text.includes('87.3%')) {
                    countUp(statNumber, 87.3, '%');
                } else if (text.includes('156%')) {
                    countUp(statNumber, 156, '%');
                } else if (text.includes('10,000+')) {
                    countUp(statNumber, 10000, '+');
                } else if (text.includes('50+')) {
                    countUp(statNumber, 50, '+');
                }
                
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.stat-card').forEach(card => {
        statsObserver.observe(card);
    });

    // タイピング効果（無効化）
    // function typeWriter(element, text, speed = 100) {
    //     let i = 0;
    //     element.textContent = '';
    //     
    //     function type() {
    //         if (i < text.length) {
    //             element.textContent += text.charAt(i);
    //             i++;
    //             setTimeout(type, speed);
    //         }
    //     }
    //     
    //     type();
    // }

    // ページロード時のヒーロータイトルアニメーション（無効化）
    // const heroTitle = document.querySelector('.hero-title');
    // if (heroTitle) {
    //     const originalText = heroTitle.textContent;
    //     setTimeout(() => {
    //         typeWriter(heroTitle, originalText, 150);
    //     }, 500);
    // }
});