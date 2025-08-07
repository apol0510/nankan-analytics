---
title: "お問い合わせ"
slug: "contact"
---

# お問い合わせ

NANKANアナリティクスに関するご質問、ご意見、ご要望などがございましたら、以下のフォームよりお気軽にお問い合わせください。

## お問い合わせ内容

以下のようなお問い合わせを承っております：

- 📝 **記事に関するご質問**: 技術的な質問、コードの不具合など
- 📧 **メルマガに関するお問い合わせ**: 登録・解除、配信内容について
- 🤝 **コラボレーションのご提案**: 共同研究、記事執筆など
- 🎯 **技術相談**: AIモデル開発、データ分析のコンサルティング
- 📈 **ビジネス提携**: 法人向けサービス、API提供など

## お問い合わせフォーム

<div class="contact-form">
  <form name="contact" method="POST" data-netlify="true" data-netlify-honeypot="bot-field">
    <input type="hidden" name="form-name" value="contact">
    <p class="hidden">
      <label>Don't fill this out if you're human: <input name="bot-field" /></label>
    </p>
    
    <div class="form-group">
      <label for="name">お名前 <span class="required">*</span></label>
      <input type="text" id="name" name="name" required>
    </div>
    
    <div class="form-group">
      <label for="email">メールアドレス <span class="required">*</span></label>
      <input type="email" id="email" name="email" required>
    </div>
    
    <div class="form-group">
      <label for="category">お問い合わせ種別 <span class="required">*</span></label>
      <select id="category" name="category" required>
        <option value="">選択してください</option>
        <option value="article">記事に関する質問</option>
        <option value="technical">技術的な相談</option>
        <option value="newsletter">メルマガについて</option>
        <option value="business">ビジネス提携</option>
        <option value="other">その他</option>
      </select>
    </div>
    
    <div class="form-group">
      <label for="subject">件名 <span class="required">*</span></label>
      <input type="text" id="subject" name="subject" required>
    </div>
    
    <div class="form-group">
      <label for="message">お問い合わせ内容 <span class="required">*</span></label>
      <textarea id="message" name="message" rows="8" required></textarea>
    </div>
    
    <div class="form-group">
      <label>
        <input type="checkbox" name="newsletter" value="yes">
        メルマガ登録を希望する
      </label>
    </div>
    
    <button type="submit" class="submit-button">送信する</button>
  </form>
</div>

## よくあるご質問

### Q: メルマガの配信頻度は？
**A:** 週に2回（水曜日・土曜日）配信しています。重賞レースがある場合は臨時配信を行うこともあります。

### Q: コードの商用利用は可能ですか？
**A:** はい、公開しているコードはMITライセンスのため商用利用可能です。ただし、予想結果による損失については一切責任を負いません。

### Q: 有料サービスはありますか？
**A:** 現在、法人向けAPIサービスとコンサルティングサービスを提供しています。詳細はお問い合わせください。

### Q: 初心者でも学べますか？
**A:** はい、初心者向けのコンテンツも多数用意しています。Pythonの基礎から段階的に学べるよう構成しています。

### Q: データはどこから取得できますか？
**A:** メルマガ登録者限定で前処理済みデータセットを提供しています。また、データ収集方法についても記事で解説しています。

## 返信について

- 通常、2営業日以内に返信いたします
- 技術的なお問い合わせの場合、調査に時間を要する場合があります
- 土日祝日は返信が遅れる場合があります

## SNSでも情報発信中

最新情報は各種SNSでも発信しています：

- Twitter: [@nankan_analytics](https://twitter.com/nankan_analytics)
- GitHub: [nankan-analytics](https://github.com/nankan-analytics)
- Qiita: [nankan-analytics](https://qiita.com/nankan-analytics)

<style>
.contact-form {
  max-width: 600px;
  margin: 2rem auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.form-group input[type="text"],
.form-group input[type="email"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  background-color: #1e293b;
  color: #e2e8f0;
  font-size: 1rem;
}

.form-group input[type="checkbox"] {
  margin-right: 0.5rem;
}

.required {
  color: #ef4444;
}

.submit-button {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
}

.hidden {
  display: none;
}
</style>