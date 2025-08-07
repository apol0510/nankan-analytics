---
title: "ツール・資料"
slug: "tools"
menu:
    main: 
        weight: 5
        params:
            icon: tag
---

# 競馬AI開発ツール・資料

競馬AI・機械学習モデルを開発するためのツールや資料を公開しています。

## 📦 Pythonライブラリ

### keiba-analytics
競馬データ分析に特化したPythonライブラリ

```bash
pip install keiba-analytics
```

**主な機能:**
- 競馬データの前処理ユーティリティ
- 特徴量生成パイプライン
- モデル評価指標の計算
- バックテストフレームワーク

[ドキュメントを見る](https://github.com/nankan-analytics/keiba-analytics)

## 📊 Jupyter Notebookテンプレート

### 初級者向けテンプレート

#### 1. データ分析スターター
南関競馬データの基礎分析テンプレート
- データ読み込み
- 基礎統計量の算出
- 可視化

[ダウンロード](https://github.com/nankan-analytics/templates/basic-analysis.ipynb)

#### 2. 機械学習モデル構築
シンプルな予想モデル構築テンプレート
- XGBoostによる予測
- クロスバリデーション
- ハイパーパラメータチューニング

[ダウンロード](https://github.com/nankan-analytics/templates/ml-starter.ipynb)

### 中級者向けテンプレート

#### 3. 深層学習モデル
LSTMを使った時系列予測モデル
- PyTorch実装
- 時系列データの処理
- モデルの訓練と評価

[ダウンロード](https://github.com/nankan-analytics/templates/deep-learning.ipynb)

#### 4. アンサンブル学習
複数モデルの統合テンプレート
- スタッキング
- ブレンディング
- ボーティング

[ダウンロード](https://github.com/nankan-analytics/templates/ensemble.ipynb)

## 📊 データセット

### 南関競馬データセット（2020-2024）

前処理済みの南関競馬データセットを提供しています。

**データ内容:**
- レース結果（35,000レース以上）
- 馬の成績データ
- 騎手・調教師データ
- オッズデータ
- 馬場状態データ

**ダウンロード方法:**

メルマガ登録者限定でダウンロードリンクを提供しています。

<div class="newsletter-form">
  <form name="newsletter-data" method="POST" data-netlify="true">
    <input type="email" name="email" placeholder="メールアドレスを入力" required>
    <button type="submit">データセットを取得</button>
  </form>
</div>

## 📡 APIエンドポイント

### 南関競馬データAPI

リアルタイムの競馬データを取得できるAPIを提供しています。

```python
import requests

# APIキーの取得（メルマガ登録者限定）
api_key = "YOUR_API_KEY"

# レースデータの取得
response = requests.get(
    "https://api.nankan-analytics.com/v1/races",
    headers={"X-API-Key": api_key},
    params={
        "date": "2024-01-01",
        "track": "oi"  # 大井競馬場
    }
)

data = response.json()
```

[ドキュメントを見る](https://api.nankan-analytics.com/docs)

## 📖 チュートリアルビデオ

### YouTubeチャンネル

競馬AI開発の実演動画をYouTubeで公開しています。

- [初心者向け：Pythonで始める競馬データ分析](https://youtube.com/playlist?list=PLxxxxxx)
- [実践：XGBoostで競馬予想モデルを作る](https://youtube.com/playlist?list=PLxxxxxx)
- [上級編：深層学習で精度向上](https://youtube.com/playlist?list=PLxxxxxx)

## 📊 スライド資料

### 勉強会資料

過去に開催した勉強会のスライド資料を公開しています。

1. **競馬AI入門～機械学習の基礎から実装まで～**
   - 120スライド / PDF
   - [ダウンロード](https://speakerdeck.com/nankan/ai-intro)

2. **特徴量エンジニアリング実践ガイド**
   - 80スライド / PDF
   - [ダウンロード](https://speakerdeck.com/nankan/feature-engineering)

3. **モデル評価とバックテストの正しい方法**
   - 60スライド / PDF
   - [ダウンロード](https://speakerdeck.com/nankan/backtesting)

## 🎯 実践的なサンプルプロジェクト

### 1. シンプル予想システム

基本的な競馬AI予想システムの完全実装

```bash
git clone https://github.com/nankan-analytics/simple-predictor
cd simple-predictor
pip install -r requirements.txt
python main.py
```

**機能:**
- データ収集
- 特徴量生成
- モデル訓練
- 予測結果出力

### 2. リアルタイム予想API

Flaskを使ったリアルタイム予想APIサーバー

```bash
git clone https://github.com/nankan-analytics/realtime-api
cd realtime-api
docker-compose up
```

**機能:**
- REST API
- WebSocket対応
- キャッシュ機能
- 負荷分散

## 📧 メルマガ限定コンテンツ

メルマガ登録者限定で以下のコンテンツを配信しています：

- 📦 **完全版コードセット**: 実戦で使える予想モデルの完全ソースコード
- 📊 **精度レポート**: 最新モデルの精度検証結果（週次更新）
- 🎯 **有料AI予想の一部無料提供**: 毎週土日の重賞レース予想
- 📡 **API優先アクセス**: 通常より高速なレスポンス

<div class="newsletter-form highlight">
  <h3>🎁 今すぐ登録して特典を受け取ろう！</h3>
  <form name="newsletter-tools" method="POST" data-netlify="true">
    <input type="email" name="email" placeholder="メールアドレスを入力" required>
    <button type="submit" class="cta-button">無料でメルマガ登録</button>
  </form>
  <p class="note">※ 登録後、すぐに特典ダウンロードリンクをお送りします</p>
</div>

## 🔗 関連リンク

- [GitHub Organization](https://github.com/nankan-analytics)
- [Qiita](https://qiita.com/nankan-analytics)
- [Zenn](https://zenn.dev/nankan-analytics)
- [note](https://note.com/nankan-analytics)

## 📝 ライセンス

提供するコード・ツールはMITライセンスで公開しています。商用利用も可能です。

ただし、予想結果による損失について一切責任を負いません。投購は自己責任でお願いします。