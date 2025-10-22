# ポイント交換システム Airtableセットアップガイド

## 📋 必要なテーブル

### PointExchangeRequestsテーブル

Airtableベースに以下のテーブルを作成してください。

**テーブル名**: `PointExchangeRequests`

**フィールド一覧**:

| フィールド名 | タイプ | 説明 |
|------------|-------|------|
| Email | Single line text | 申請者メールアドレス |
| Name | Single line text | 申請者名 |
| Plan | Single select | プラン（Free/Standard/Premium） |
| CurrentPoints | Number | 申請時の保有ポイント |
| RequiredPoints | Number | 必要ポイント |
| RewardName | Long text | 交換特典名 |
| Status | Single select | ステータス（Pending/Processing/Completed） |
| RequestDate | Date | 申請日時 |
| ProcessedDate | Date | 処理完了日時 |
| Notes | Long text | メモ・備考 |

## 🔧 Single Selectの選択肢設定

### Plan フィールド
- Free
- Standard
- Premium

### Status フィールド
- Pending（未処理）- デフォルト
- Processing（処理中）
- Completed（完了）

## 📊 推奨ビュー設定

### 1. すべての申請（All Requests）
- ソート: RequestDate（降順）
- すべてのレコードを表示

### 2. 未処理（Pending）
- フィルター: Status = "Pending"
- ソート: RequestDate（昇順）

### 3. 処理完了（Completed）
- フィルター: Status = "Completed"
- ソート: ProcessedDate（降順）

## 🚀 運用フロー

### 1. 申請受付
- ユーザーがdashboardで「交換申請」ボタンをクリック
- Airtableに自動的にレコード作成
- Status = "Pending"で保存

### 2. 処理開始
- 管理者がAirtableで申請内容を確認
- Statusを"Processing"に変更
- 特典情報を準備

### 3. 特典送付
- 管理者がユーザーにメールで特典送付
- Customersテーブルでポイント残高を更新（-必要ポイント）
- Statusを"Completed"に変更
- ProcessedDateに完了日時を入力

### 4. 履歴管理
- 完了したレコードは削除せず保管
- 統計データとして活用
- トラブル時の証跡として保管

## 🔗 管理画面URL

**管理画面**: `/admin/point-exchange-requests`

- 申請データ一覧表示
- ステータス別フィルタリング
- Airtableへの直接リンク

## ✅ セットアップ確認

以下を確認してください：

- [ ] PointExchangeRequestsテーブルが作成されている
- [ ] 全フィールドが正しく設定されている
- [ ] Single Selectの選択肢が設定されている
- [ ] ビューが作成されている
- [ ] 環境変数が設定されている（AIRTABLE_API_KEY, AIRTABLE_BASE_ID）

## 🎯 利点

### Airtable方式の利点
1. **履歴管理**: 全申請データが永続的に保存
2. **可視化**: 統計データ・グラフ作成が容易
3. **柔軟性**: フィールド追加・変更が容易
4. **共同作業**: 複数の管理者で同時編集可能
5. **セキュリティ**: メール送信不要でプライバシー保護

### メール方式の問題点（解決済み）
- ❌ メールが届かないリスク
- ❌ 履歴管理が困難
- ❌ 統計データ取得が不可能
- ❌ メールクライアント選択ポップアップ問題
- ❌ ユーザー体験の悪化

## 📧 任意：メール通知追加

必要に応じて、Airtable Automationを使用してメール通知を追加できます：

1. Trigger: When record created
2. Action: Send email
3. 管理者宛に通知メール送信

これにより、リアルタイム通知が可能になります。
