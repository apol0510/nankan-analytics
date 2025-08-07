---
title: "Pythonで始める競馬データ分析 - pandas基礎からXGBoostまで"
date: 2025-08-07T09:00:00+09:00
description: "Pythonとpandasを使った競馬データ分析の基礎から、XGBoostを活用した予想モデル構築まで、初心者向けに分かりやすく解説します。"
categories: ["機械学習", "データ分析"]
tags: ["Python", "pandas", "XGBoost", "競馬", "データサイエンス", "機械学習入門"]
slug: "python-horse-racing-data-analysis"
---

## はじめに

競馬データ分析は、統計学と機械学習の技術を実践的に学ぶのに最適な題材です。本記事では、Pythonとpandasを使った基礎的なデータ操作から、XGBoostを活用した高度な予想モデル構築まで、段階的に解説していきます。

## 必要なライブラリのインストール

まず、データ分析に必要なライブラリをインストールしましょう。

```python
pip install pandas numpy matplotlib seaborn scikit-learn xgboost jupyterlab
```

## データの準備とpandas基礎

### 1. 競馬データの構造理解

競馬データは通常、以下のような情報を含みます：

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import xgboost as xgb

# サンプルデータの作成
np.random.seed(42)
n_races = 1000
n_horses_per_race = 10

data = []
for race_id in range(n_races):
    for horse_id in range(n_horses_per_race):
        data.append({
            'race_id': race_id,
            'horse_id': horse_id,
            'horse_name': f'Horse_{horse_id}',
            'jockey_name': f'Jockey_{np.random.randint(1, 50)}',
            'odds': np.random.uniform(1.5, 50.0),
            'weight': np.random.randint(450, 520),
            'age': np.random.randint(3, 8),
            'sex': np.random.choice(['牡', '牝', 'セ']),
            'distance': np.random.choice([1200, 1400, 1600, 1800, 2000, 2400]),
            'track_condition': np.random.choice(['良', '稍重', '重', '不良']),
            'weather': np.random.choice(['晴', '曇', '雨', '雪']),
            'finish_position': np.random.randint(1, 11)
        })

df = pd.DataFrame(data)
print("データの基本情報:")
print(df.info())
print("\n最初の5行:")
print(df.head())
```

### 2. データの基本統計

```python
# 基本統計量の確認
print("基本統計量:")
print(df.describe())

# 着順の分布
plt.figure(figsize=(10, 6))
plt.subplot(1, 2, 1)
df['finish_position'].hist(bins=10, alpha=0.7)
plt.title('着順分布')
plt.xlabel('着順')
plt.ylabel('頻度')

# オッズの分布（対数スケール）
plt.subplot(1, 2, 2)
np.log(df['odds']).hist(bins=30, alpha=0.7)
plt.title('オッズ分布（対数）')
plt.xlabel('log(オッズ)')
plt.ylabel('頻度')

plt.tight_layout()
plt.show()
```

### 3. データの探索的分析（EDA）

```python
# オッズと着順の関係分析
plt.figure(figsize=(12, 8))

# オッズと着順の散布図
plt.subplot(2, 2, 1)
plt.scatter(df['odds'], df['finish_position'], alpha=0.5)
plt.xlabel('オッズ')
plt.ylabel('着順')
plt.title('オッズと着順の関係')

# 馬の年齢と着順の関係
plt.subplot(2, 2, 2)
age_finish = df.groupby('age')['finish_position'].mean()
age_finish.plot(kind='bar')
plt.title('年齢別平均着順')
plt.xlabel('年齢')
plt.ylabel('平均着順')

# 距離別の着順分布
plt.subplot(2, 2, 3)
distance_finish = df.groupby('distance')['finish_position'].mean()
distance_finish.plot(kind='bar')
plt.title('距離別平均着順')
plt.xlabel('距離（m）')
plt.ylabel('平均着順')

# 馬場状態と着順の関係
plt.subplot(2, 2, 4)
track_finish = df.groupby('track_condition')['finish_position'].mean()
track_finish.plot(kind='bar')
plt.title('馬場状態別平均着順')
plt.xlabel('馬場状態')
plt.ylabel('平均着順')

plt.tight_layout()
plt.show()
```

## 特徴量エンジニアリング

機械学習モデルの性能向上のため、新しい特徴量を作成します。

```python
# 特徴量エンジニアリング
def create_features(df):
    df_new = df.copy()
    
    # 1着フラグの作成（目的変数）
    df_new['is_winner'] = (df_new['finish_position'] == 1).astype(int)
    
    # オッズ関連特徴量
    df_new['odds_rank'] = df_new.groupby('race_id')['odds'].rank()
    df_new['odds_log'] = np.log(df_new['odds'])
    df_new['is_favorite'] = (df_new['odds_rank'] == 1).astype(int)
    
    # 体重関連特徴量
    df_new['weight_normalized'] = df_new.groupby(['age', 'sex'])['weight'].transform(
        lambda x: (x - x.mean()) / x.std()
    )
    
    # 年齢関連特徴量
    df_new['is_young'] = (df_new['age'] <= 4).astype(int)
    df_new['is_old'] = (df_new['age'] >= 6).astype(int)
    
    # 距離適性
    df_new['is_sprint'] = (df_new['distance'] <= 1400).astype(int)
    df_new['is_mile'] = ((df_new['distance'] > 1400) & (df_new['distance'] <= 1800)).astype(int)
    df_new['is_long'] = (df_new['distance'] > 1800).astype(int)
    
    return df_new

df_features = create_features(df)
print("特徴量作成後のデータ形状:", df_features.shape)
print("\n新しい特徴量:")
new_features = ['odds_rank', 'odds_log', 'is_favorite', 'weight_normalized', 
                'is_young', 'is_old', 'is_sprint', 'is_mile', 'is_long']
print(df_features[new_features].head())
```

## カテゴリカル変数の処理

```python
from sklearn.preprocessing import LabelEncoder

# カテゴリカル変数のエンコーディング
categorical_features = ['sex', 'track_condition', 'weather']
le_dict = {}

for feature in categorical_features:
    le = LabelEncoder()
    df_features[f'{feature}_encoded'] = le.fit_transform(df_features[feature])
    le_dict[feature] = le
    
print("エンコーディング後のカテゴリカル変数:")
for feature in categorical_features:
    print(f"{feature}: {df_features[f'{feature}_encoded'].unique()}")
```

## XGBoostモデルの構築

### 1. データの準備

```python
# 特徴量とターゲットの分離
feature_columns = [
    'odds', 'odds_rank', 'odds_log', 'is_favorite',
    'weight', 'weight_normalized', 'age', 'is_young', 'is_old',
    'distance', 'is_sprint', 'is_mile', 'is_long',
    'sex_encoded', 'track_condition_encoded', 'weather_encoded'
]

X = df_features[feature_columns]
y = df_features['is_winner']

print(f"特徴量数: {X.shape[1]}")
print(f"サンプル数: {X.shape[0]}")
print(f"勝利サンプル数: {y.sum()}")
print(f"勝率: {y.mean():.3f}")
```

### 2. 訓練・テストデータの分割

```python
# データ分割（レース単位で分割）
unique_races = df_features['race_id'].unique()
train_races, test_races = train_test_split(unique_races, test_size=0.3, random_state=42)

train_mask = df_features['race_id'].isin(train_races)
test_mask = df_features['race_id'].isin(test_races)

X_train = X[train_mask]
X_test = X[test_mask]
y_train = y[train_mask]
y_test = y[test_mask]

print(f"訓練データ: {X_train.shape[0]} サンプル")
print(f"テストデータ: {X_test.shape[0]} サンプル")
```

### 3. XGBoostモデルの学習

```python
# XGBoostモデルの設定と学習
model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    eval_metric='logloss'
)

# 学習実行
model.fit(
    X_train, y_train,
    eval_set=[(X_train, y_train), (X_test, y_test)],
    early_stopping_rounds=10,
    verbose=True
)

# 予測実行
y_pred = model.predict(X_test)
y_pred_proba = model.predict_proba(X_test)[:, 1]

print(f"テストデータ精度: {accuracy_score(y_test, y_pred):.3f}")
```

### 4. 特徴量重要度の可視化

```python
# 特徴量重要度の可視化
feature_importance = pd.DataFrame({
    'feature': feature_columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

plt.figure(figsize=(10, 8))
plt.barh(range(len(feature_importance)), feature_importance['importance'][::-1])
plt.yticks(range(len(feature_importance)), feature_importance['feature'][::-1])
plt.xlabel('特徴量重要度')
plt.title('XGBoost特徴量重要度')
plt.tight_layout()
plt.show()

print("特徴量重要度ランキング:")
print(feature_importance)
```

## モデル評価と結果分析

### 1. 分類性能の評価

```python
from sklearn.metrics import confusion_matrix, roc_auc_score, roc_curve

# 混同行列
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(12, 4))

plt.subplot(1, 3, 1)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('混同行列')
plt.ylabel('実際')
plt.xlabel('予測')

# ROC曲線
fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
auc_score = roc_auc_score(y_test, y_pred_proba)

plt.subplot(1, 3, 2)
plt.plot(fpr, tpr, label=f'ROC Curve (AUC = {auc_score:.3f})')
plt.plot([0, 1], [0, 1], 'k--')
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('ROC曲線')
plt.legend()

# 予測確率の分布
plt.subplot(1, 3, 3)
plt.hist(y_pred_proba[y_test == 0], alpha=0.5, label='非勝利', bins=20)
plt.hist(y_pred_proba[y_test == 1], alpha=0.5, label='勝利', bins=20)
plt.xlabel('予測確率')
plt.ylabel('頻度')
plt.title('予測確率分布')
plt.legend()

plt.tight_layout()
plt.show()

print(f"AUC Score: {auc_score:.3f}")
print("\n分類レポート:")
print(classification_report(y_test, y_pred))
```

### 2. 予想精度の実用的評価

```python
# レース単位での予想精度評価
test_df = df_features[test_mask].copy()
test_df['pred_proba'] = y_pred_proba

# 各レースで最も確率の高い馬を予想
race_predictions = test_df.loc[test_df.groupby('race_id')['pred_proba'].idxmax()]
race_accuracy = (race_predictions['is_winner'] == 1).mean()

print(f"レース単位での予想的中率: {race_accuracy:.3f}")

# オッズ別の的中率分析
test_df['odds_category'] = pd.cut(test_df['odds'], 
                                  bins=[0, 3, 5, 10, float('inf')], 
                                  labels=['人気馬', '中人気', '穴馬', '大穴'])

odds_accuracy = test_df.groupby('odds_category').agg({
    'is_winner': ['sum', 'count', 'mean'],
    'pred_proba': 'mean'
}).round(3)

print("\nオッズ別予想成績:")
print(odds_accuracy)
```

## パラメータ調整とモデル改善

### 1. ハイパーパラメータ調整

```python
from sklearn.model_selection import GridSearchCV

# グリッドサーチによるパラメータ調整
param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [3, 6, 9],
    'learning_rate': [0.05, 0.1, 0.2]
}

# 時間を考慮して小さなサンプルで実行
sample_size = 1000
sample_indices = np.random.choice(X_train.index, size=sample_size, replace=False)
X_train_sample = X_train.loc[sample_indices]
y_train_sample = y_train.loc[sample_indices]

grid_search = GridSearchCV(
    xgb.XGBClassifier(random_state=42),
    param_grid,
    cv=3,
    scoring='roc_auc',
    n_jobs=-1,
    verbose=1
)

grid_search.fit(X_train_sample, y_train_sample)

print("最適パラメータ:")
print(grid_search.best_params_)
print(f"最高スコア: {grid_search.best_score_:.3f}")
```

### 2. 改善されたモデルの評価

```python
# 最適パラメータでモデル再学習
best_model = xgb.XGBClassifier(**grid_search.best_params_, random_state=42)
best_model.fit(X_train, y_train)

# 予測と評価
y_pred_best = best_model.predict(X_test)
y_pred_proba_best = best_model.predict_proba(X_test)[:, 1]

best_accuracy = accuracy_score(y_test, y_pred_best)
best_auc = roc_auc_score(y_test, y_pred_proba_best)

print(f"改善後の精度: {best_accuracy:.3f}")
print(f"改善後のAUC: {best_auc:.3f}")

# 元のモデルとの比較
print(f"\n精度向上: {best_accuracy - accuracy_score(y_test, y_pred):.3f}")
print(f"AUC向上: {best_auc - auc_score:.3f}")
```

## 実用的な予想システムの構築

```python
def predict_race_winner(race_data, model, feature_columns):
    """
    レースデータから勝利馬を予想する関数
    """
    # 特徴量抽出
    X_race = race_data[feature_columns]
    
    # 予測実行
    probabilities = model.predict_proba(X_race)[:, 1]
    
    # 結果をデータフレームにまとめ
    results = race_data.copy()
    results['win_probability'] = probabilities
    results = results.sort_values('win_probability', ascending=False)
    
    return results

# サンプルレースでの予想例
sample_race_id = test_races[0]
sample_race_data = df_features[df_features['race_id'] == sample_race_id]

prediction_results = predict_race_winner(
    sample_race_data, 
    best_model, 
    feature_columns
)

print(f"レースID {sample_race_id} の予想結果:")
print(prediction_results[['horse_name', 'odds', 'finish_position', 'win_probability']].head())
```

## まとめ

本記事では、Pythonとpandasを使った競馬データ分析の基本から、XGBoostを活用した機械学習モデル構築まで包括的に解説しました。

### 学んだ主要なポイント：

1. **pandas基礎**: データの読み込み、基本統計、可視化
2. **探索的データ分析**: オッズと着順の関係性分析
3. **特徴量エンジニアリング**: ドメイン知識を活用した特徴量作成
4. **XGBoost活用**: 高性能な勾配ブースティングによる予想モデル
5. **モデル評価**: 精度、AUC、実用的な的中率による性能評価
6. **ハイパーパラメータ調整**: グリッドサーチによる最適化

### 実用化への次のステップ：

- **より多くのデータ収集**: 過去の成績データ、血統情報
- **高度な特徴量**: レーティング、調教情報、騎手・調教師の成績
- **アンサンブル学習**: 複数モデルの組み合わせ
- **リアルタイム予想**: APIを活用した自動予想システム

競馬データ分析は、統計学と機械学習の実践的な学習に最適な題材です。本記事で学んだ基礎技術を応用し、さらに高度な分析に挑戦してください。データサイエンスのスキル向上と共に、競馬予想の精度向上も期待できるでしょう。