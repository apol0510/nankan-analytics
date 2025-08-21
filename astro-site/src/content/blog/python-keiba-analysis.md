---
title: "Pythonで始める競馬データ分析 - pandas基礎からXGBoostまで"
description: "機械学習初心者向けに、Pythonを使った競馬データ分析の基礎から実践的なXGBoostモデル構築まで、コード例とともに解説します。"
pubDate: 2024-01-15
tags: ["Python", "pandas", "XGBoost", "機械学習", "データ分析"]
category: "機械学習"
featured: true
heroImage: "/img/blog/python-keiba.jpg"
---

## はじめに

競馬予想において、感覚的な予想から脱却し、データに基づいた科学的アプローチを取り入れることで、より安定した結果を得ることができます。

本記事では、Pythonを使った競馬データ分析の基礎から、実際にXGBoostを用いた予想モデル構築まで、実践的なコードとともに解説します。

## 必要なライブラリのインストール

```bash
pip install pandas numpy scikit-learn xgboost matplotlib seaborn
```

## データの準備と前処理

### 1. データの読み込み

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import roc_auc_score
import xgboost as xgb
import matplotlib.pyplot as plt
import seaborn as sns

# 競馬データの読み込み
race_data = pd.read_csv('race_results.csv')
print(race_data.head())
print(f"データ形状: {race_data.shape}")
```

### 2. 基本的な特徴量の作成

```python
def create_basic_features(df):
    """基本的な特徴量を作成"""
    
    # 騎手・調教師の勝率計算
    jockey_win_rate = df.groupby('騎手名')['着順'].apply(lambda x: (x == 1).mean())
    trainer_win_rate = df.groupby('調教師名')['着順'].apply(lambda x: (x == 1).mean())
    
    # 勝率を元データにマージ
    df['騎手勝率'] = df['騎手名'].map(jockey_win_rate)
    df['調教師勝率'] = df['調教師名'].map(trainer_win_rate)
    
    # 馬齢による補正
    df['馬齢補正'] = df['馬齢'].apply(lambda x: 1.0 if x == 4 else 0.9 if x == 3 else 0.8)
    
    # 距離適性の計算
    df['距離カテゴリ'] = pd.cut(df['距離'], 
                          bins=[0, 1200, 1600, 2000, 3000], 
                          labels=['短距離', 'マイル', '中距離', '長距離'])
    
    return df

# 特徴量作成の実行
race_data = create_basic_features(race_data)
```

## XGBoostモデルの構築

### 1. データの前処理

```python
def prepare_ml_data(df):
    """機械学習用のデータ準備"""
    
    # カテゴリカル変数のエンコーディング
    label_encoders = {}
    categorical_columns = ['騎手名', '調教師名', '馬場状態', '距離カテゴリ']
    
    for col in categorical_columns:
        le = LabelEncoder()
        df[f'{col}_encoded'] = le.fit_transform(df[col].astype(str))
        label_encoders[col] = le
    
    # 特徴量の選択
    features = [
        '馬番', '馬齢', '体重', '馬体重変化', '騎手勝率', '調教師勝率',
        '騎手名_encoded', '調教師名_encoded', '馬場状態_encoded', 
        '距離カテゴリ_encoded', '馬齢補正'
    ]
    
    X = df[features].fillna(0)
    y = (df['着順'] == 1).astype(int)  # 1着を1、それ以外を0
    
    return X, y, label_encoders

X, y, encoders = prepare_ml_data(race_data)
```

### 2. モデルの学習

```python
# 訓練・テストデータの分割
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# XGBoostモデルの定義
xgb_model = xgb.XGBClassifier(
    objective='binary:logistic',
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42
)

# モデルの学習
xgb_model.fit(X_train, y_train)

# 予測と評価
train_pred = xgb_model.predict_proba(X_train)[:, 1]
test_pred = xgb_model.predict_proba(X_test)[:, 1]

print(f"学習データAUC: {roc_auc_score(y_train, train_pred):.3f}")
print(f"テストデータAUC: {roc_auc_score(y_test, test_pred):.3f}")
```

### 3. 特徴量重要度の分析

```python
# 特徴量重要度の可視化
feature_importance = xgb_model.feature_importances_
feature_names = X.columns

plt.figure(figsize=(10, 8))
indices = np.argsort(feature_importance)[::-1]

plt.title("特徴量重要度")
plt.bar(range(len(feature_importance)), feature_importance[indices])
plt.xticks(range(len(feature_importance)), 
           [feature_names[i] for i in indices], rotation=45)
plt.tight_layout()
plt.show()

# 重要度の数値表示
for i in range(len(feature_importance)):
    print(f"{feature_names[indices[i]]}: {feature_importance[indices[i]]:.3f}")
```

## 予想精度の向上テクニック

### 1. ハイパーパラメータチューニング

```python
from sklearn.model_selection import GridSearchCV

# パラメータグリッドの定義
param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [4, 6, 8],
    'learning_rate': [0.05, 0.1, 0.2],
    'subsample': [0.7, 0.8, 0.9]
}

# グリッドサーチの実行
grid_search = GridSearchCV(
    xgb.XGBClassifier(random_state=42),
    param_grid,
    cv=5,
    scoring='roc_auc',
    n_jobs=-1
)

grid_search.fit(X_train, y_train)
print(f"最適パラメータ: {grid_search.best_params_}")
print(f"最高スコア: {grid_search.best_score_:.3f}")
```

### 2. アンサンブル手法の活用

```python
from sklearn.ensemble import VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

# 複数のモデルを組み合わせ
lr_model = LogisticRegression(random_state=42)
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
xgb_best = xgb.XGBClassifier(**grid_search.best_params_, random_state=42)

# アンサンブルモデルの作成
ensemble_model = VotingClassifier(
    estimators=[
        ('lr', lr_model),
        ('rf', rf_model),
        ('xgb', xgb_best)
    ],
    voting='soft'
)

# 学習と評価
ensemble_model.fit(X_train, y_train)
ensemble_pred = ensemble_model.predict_proba(X_test)[:, 1]
print(f"アンサンブルAUC: {roc_auc_score(y_test, ensemble_pred):.3f}")
```

## 実用的な予想システムの構築

### 1. 予想関数の実装

```python
def predict_race_winner(race_data, model, encoders):
    """レース結果を予想する関数"""
    
    # データの前処理
    processed_data = create_basic_features(race_data.copy())
    
    # エンコーディング
    for col, encoder in encoders.items():
        processed_data[f'{col}_encoded'] = encoder.transform(
            processed_data[col].astype(str)
        )
    
    # 特徴量の選択
    features = [
        '馬番', '馬齢', '体重', '馬体重変化', '騎手勝率', '調教師勝率',
        '騎手名_encoded', '調教師名_encoded', '馬場状態_encoded', 
        '距離カテゴリ_encoded', '馬齢補正'
    ]
    
    X = processed_data[features].fillna(0)
    
    # 予想実行
    predictions = model.predict_proba(X)[:, 1]
    
    # 結果の整理
    result = processed_data[['馬名', '騎手名']].copy()
    result['勝率予想'] = predictions
    result = result.sort_values('勝率予想', ascending=False)
    
    return result

# 使用例
# new_race_data = pd.read_csv('upcoming_race.csv')
# predictions = predict_race_winner(new_race_data, xgb_model, encoders)
# print(predictions.head())
```

## まとめ

本記事では、Pythonを使った競馬データ分析の基礎から、XGBoostを用いた実践的な予想モデルの構築方法まで解説しました。

### ポイント
- **データ前処理**: 騎手・調教師勝率などの基本特徴量作成
- **XGBoost**: 競馬予想に適した機械学習アルゴリズム
- **特徴量重要度**: モデルの解釈性向上
- **アンサンブル**: 複数モデルの組み合わせで精度向上

次回は、より高度な特徴量設計について詳しく解説予定です。

### 参考資料
- [XGBoost公式ドキュメント](https://xgboost.readthedocs.io/)
- [scikit-learn ユーザーガイド](https://scikit-learn.org/stable/user_guide.html)