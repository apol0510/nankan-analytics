#!/bin/bash
echo "🚀 Netlify環境変数設定スクリプト"
echo "使用するメールサービスを選択してください:"
echo "1) SendGrid (推奨)"
echo "2) Gmail"
read -p "選択 (1-2): " choice

case $choice in
    1)
        echo "📧 SendGrid設定"
        read -p "SendGridのAPIキーを入力: " api_key
        netlify env:set SMTP_HOST smtp.sendgrid.net
        netlify env:set SMTP_PORT 587
        netlify env:set SMTP_USER apikey
        netlify env:set SMTP_PASS "$api_key"
        ;;
    2)
        echo "📧 Gmail設定"
        read -p "Gmailアドレスを入力: " gmail
        read -p "アプリパスワードを入力: " app_pass
        netlify env:set SMTP_HOST smtp.gmail.com
        netlify env:set SMTP_PORT 587
        netlify env:set SMTP_USER "$gmail"
        netlify env:set SMTP_PASS "$app_pass"
        ;;
    *)
        echo "無効な選択です"
        exit 1
        ;;
esac

echo "✅ 環境変数設定完了"
echo "🔄 再デプロイを実行中..."
netlify deploy --prod
echo "🎉 設定完了！お問い合わせフォームが本番環境で動作します。"
