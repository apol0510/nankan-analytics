---
title: "scikit-learnで競馬予想モデル構築 - 初心者向け完全ガイド"
date: 2025-08-07T11:00:00+09:00
description: "scikit-learnを使って競馬予想モデルを一から構築する方法を、初心者にも分かりやすく解説。データ前処理から各アルゴリズムの比較、モデル評価まで実践的に学びます。"
categories: ["機械学習", "scikit-learn"]
tags: ["scikit-learn", "競馬予想", "機械学習", "Python", "分類問題", "初心者向け"]
slug: "scikit-learn-horse-prediction"
---

## はじめに

scikit-learnは機械学習の入門に最適なPythonライブラリです。本記事では、競馬予想モデルを題材に、scikit-learnを使った機械学習プロジェクトの全工程を初心者向けに詳しく解説します。

## scikit-learnとは

scikit-learnは、Pythonで最も人気の高い機械学習ライブラリの一つです：

- **豊富なアルゴリズム**: 分類、回帰、クラスタリング
- **統一されたAPI**: どのアルゴリズムも同じインターフェース
- **充実したドキュメント**: 初心者に優しい説明
- **実用的なツール**: 前処理、評価指標、可視化

## 環境構築

```python
# 必要なライブラリのインストール
pip install scikit-learn pandas numpy matplotlib seaborn jupyter

# ライブラリのインポート
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta

# scikit-learnからの主要インポート
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder, OneHotEncoder
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score, roc_curve

# アルゴリズム
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB

# 警告の非表示
import warnings
warnings.filterwarnings('ignore')

# 日本語対応
plt.rcParams['figure.figsize'] = (10, 6)
print("環境構築完了")
```

## データの準備

### サンプルデータ生成

```python
# 競馬データのサンプル生成
np.random.seed(42)
n_races = 1500
n_horses_per_race = 12

data = []
for race_id in range(n_races):
    # レース条件
    distance = np.random.choice([1200, 1400, 1600, 1800, 2000, 2400])
    track_condition = np.random.choice(['良', '稍重', '重', '不良'], p=[0.6, 0.25, 0.1, 0.05])
    race_class = np.random.choice(['新馬', '未勝利', '1勝クラス', '2勝クラス', '3勝クラス', 'オープン'])
    
    for horse_id in range(n_horses_per_race):
        # 馬の基本情報
        age = np.random.randint(3, 8)
        sex = np.random.choice(['牡', '牝', 'セ'], p=[0.5, 0.4, 0.1])
        weight = np.random.randint(440, 540)
        
        # オッズ（人気順に連動）
        popularity = horse_id + 1
        base_odds = 1.5 + (popularity - 1) * 2
        odds = base_odds + np.random.normal(0, base_odds * 0.3)
        odds = max(1.1, odds)  # 最低オッズ
        
        # 着順（人気馬ほど上位に来やすい）
        prob_weights = np.array([10 - i for i in range(n_horses_per_race)])
        prob_weights = prob_weights / prob_weights.sum()
        finish_positions = list(range(1, n_horses_per_race + 1))
        
        data.append({
            'race_id': race_id,
            'horse_id': f'horse_{race_id}_{horse_id}',
            'popularity': popularity,
            'odds': odds,
            'age': age,
            'sex': sex,
            'weight': weight,
            'distance': distance,
            'track_condition': track_condition,
            'race_class': race_class,
            'jockey_win_rate': np.random.uniform(0.05, 0.25),  # 騎手勝率
            'trainer_win_rate': np.random.uniform(0.05, 0.20),  # 調教師勝率
        })

# 着順をランダムに割り振り（人気を考慮）
for race_id in range(n_races):
    race_horses = [d for d in data if d['race_id'] == race_id]
    # 人気順に着順を決定（確率的）
    finish_positions = list(range(1, len(race_horses) + 1))
    
    for i, horse in enumerate(race_horses):
        # 人気馬ほど上位に来やすい確率分布
        remaining_positions = [p for p in finish_positions if p not in [h.get('finish_position') for h in race_horses[:i]]]
        if remaining_positions:
            # 人気に基づく重み付け
            pop = horse['popularity']
            weights = [1.0 / (p + pop * 0.5) for p in remaining_positions]
            weights = np.array(weights) / sum(weights)
            
            finish_pos = np.random.choice(remaining_positions, p=weights)
            horse['finish_position'] = finish_pos

df = pd.DataFrame(data)
print(f"データ作成完了: {df.shape}")
print("\n基本統計:")
print(df.describe())
```

### データの確認と可視化

```python
# データの基本情報
print("データの基本情報:")
print(df.info())

# 目的変数の確認
df['is_winner'] = (df['finish_position'] == 1).astype(int)
print(f"\n勝利馬の割合: {df['is_winner'].mean():.3f}")

# 基本的な可視化
fig, axes = plt.subplots(2, 3, figsize=(18, 12))

# 1. 着順分布
axes[0, 0].hist(df['finish_position'], bins=12, edgecolor='black', alpha=0.7)
axes[0, 0].set_title('着順分布')
axes[0, 0].set_xlabel('着順')
axes[0, 0].set_ylabel('頻度')

# 2. オッズ分布
axes[0, 1].hist(df['odds'], bins=30, edgecolor='black', alpha=0.7)
axes[0, 1].set_title('オッズ分布')
axes[0, 1].set_xlabel('オッズ')
axes[0, 1].set_ylabel('頻度')

# 3. 人気と着順の関係
pop_finish = df.groupby('popularity')['finish_position'].mean()
axes[0, 2].bar(pop_finish.index, pop_finish.values)
axes[0, 2].set_title('人気別平均着順')
axes[0, 2].set_xlabel('人気')
axes[0, 2].set_ylabel('平均着順')

# 4. 年齢分布
axes[1, 0].hist(df['age'], bins=6, edgecolor='black', alpha=0.7)
axes[1, 0].set_title('馬齢分布')
axes[1, 0].set_xlabel('年齢')
axes[1, 0].set_ylabel('頻度')

# 5. 性別別勝率
sex_win_rate = df.groupby('sex')['is_winner'].mean()
axes[1, 1].bar(sex_win_rate.index, sex_win_rate.values)
axes[1, 1].set_title('性別勝率')
axes[1, 1].set_xlabel('性別')
axes[1, 1].set_ylabel('勝率')

# 6. オッズと着順の散布図
axes[1, 2].scatter(df['odds'], df['finish_position'], alpha=0.5)
axes[1, 2].set_title('オッズと着順の関係')
axes[1, 2].set_xlabel('オッズ')
axes[1, 2].set_ylabel('着順')

plt.tight_layout()
plt.show()
```

## データ前処理

### 1. 欠損値の処理

```python
# 欠損値の確認
print("欠損値の確認:")
print(df.isnull().sum())

# 欠損値がある場合の処理例
# df['feature_name'] = df['feature_name'].fillna(df['feature_name'].median())
```

### 2. カテゴリカル変数の処理

```python
# カテゴリカル変数のエンコーディング
categorical_columns = ['sex', 'track_condition', 'race_class']

# ラベルエンコーディング
label_encoders = {}
df_encoded = df.copy()

for col in categorical_columns:
    le = LabelEncoder()
    df_encoded[f'{col}_encoded'] = le.fit_transform(df_encoded[col])
    label_encoders[col] = le
    print(f"{col}: {le.classes_}")

# ワンホットエンコーディングの例
df_onehot = pd.get_dummies(df[categorical_columns], prefix=categorical_columns)
print(f"\nワンホットエンコーディング後の特徴量数: {df_onehot.shape[1]}")
print(df_onehot.head())
```

### 3. 特徴量エンジニアリング

```python
def create_features(df):
    """競馬予想用の特徴量を作成"""
    features = df.copy()
    
    # 1. オッズ関連特徴量
    features['odds_log'] = np.log(features['odds'])
    features['odds_sqrt'] = np.sqrt(features['odds'])
    features['is_favorite'] = (features['popularity'] == 1).astype(int)
    features['is_popular'] = (features['popularity'] <= 3).astype(int)
    
    # 2. レース内ランキング
    features['odds_rank'] = features.groupby('race_id')['odds'].rank()
    features['weight_rank'] = features.groupby('race_id')['weight'].rank()
    features['age_rank'] = features.groupby('race_id')['age'].rank()
    
    # 3. 距離適性
    features['is_sprint'] = (features['distance'] <= 1400).astype(int)
    features['is_mile'] = ((features['distance'] > 1400) & (features['distance'] <= 1800)).astype(int)
    features['is_long'] = (features['distance'] > 1800).astype(int)
    
    # 4. 馬の特徴
    features['is_young'] = (features['age'] <= 4).astype(int)
    features['is_female'] = (features['sex'] == '牝').astype(int)
    features['weight_per_age'] = features['weight'] / features['age']
    
    # 5. 相互作用特徴量
    features['jockey_trainer_interaction'] = features['jockey_win_rate'] * features['trainer_win_rate']
    features['odds_popularity_gap'] = features['odds'] - features['popularity']
    
    return features

df_features = create_features(df_encoded)
print("特徴量エンジニアリング完了")
print(f"新しい特徴量数: {df_features.shape[1] - df.shape[1]}")
```

### 4. 特徴量の標準化

```python
# 数値特徴量の選択
numeric_features = [
    'odds', 'odds_log', 'odds_sqrt', 'age', 'weight', 'popularity',
    'jockey_win_rate', 'trainer_win_rate', 'odds_rank', 'weight_rank',
    'age_rank', 'weight_per_age', 'jockey_trainer_interaction', 'odds_popularity_gap'
]

# StandardScalerによる標準化
scaler = StandardScaler()
df_scaled = df_features.copy()
df_scaled[numeric_features] = scaler.fit_transform(df_features[numeric_features])

print("標準化前後の比較（最初の3行）:")
print("標準化前:")
print(df_features[numeric_features].head(3))
print("\n標準化後:")
print(df_scaled[numeric_features].head(3))
```

## 特徴量選択

```python
# 特徴量とターゲットの準備
feature_columns = numeric_features + [f'{col}_encoded' for col in categorical_columns] + [
    'is_favorite', 'is_popular', 'is_sprint', 'is_mile', 'is_long', 
    'is_young', 'is_female'
]

X = df_scaled[feature_columns]
y = df_scaled['is_winner']

print(f"特徴量数: {X.shape[1]}")
print(f"サンプル数: {X.shape[0]}")

# 統計的特徴量選択
selector = SelectKBest(score_func=f_classif, k=15)
X_selected = selector.fit_transform(X, y)

# 選択された特徴量の確認
selected_indices = selector.get_support(indices=True)
selected_features = [feature_columns[i] for i in selected_indices]
feature_scores = selector.scores_[selected_indices]

feature_importance_df = pd.DataFrame({
    'feature': selected_features,
    'score': feature_scores
}).sort_values('score', ascending=False)

print("\n選択された特徴量（重要度順）:")
print(feature_importance_df)

# 可視化
plt.figure(figsize=(12, 8))
plt.barh(range(len(feature_importance_df)), feature_importance_df['score'][::-1])
plt.yticks(range(len(feature_importance_df)), feature_importance_df['feature'][::-1])
plt.xlabel('F統計量スコア')
plt.title('特徴量選択結果')
plt.tight_layout()
plt.show()
```

## データ分割

```python
# 訓練・検証・テストデータの分割
# まず訓練+検証とテストに分割
X_temp, X_test, y_temp, y_test = train_test_split(
    X_selected, y, test_size=0.2, random_state=42, stratify=y
)

# 訓練と検証に分割
X_train, X_val, y_train, y_val = train_test_split(
    X_temp, y_temp, test_size=0.25, random_state=42, stratify=y_temp
)

print("データ分割結果:")
print(f"訓練データ: {X_train.shape[0]} サンプル")
print(f"検証データ: {X_val.shape[0]} サンプル") 
print(f"テストデータ: {X_test.shape[0]} サンプル")

print("\n各セットの勝率:")
print(f"訓練: {y_train.mean():.3f}")
print(f"検証: {y_val.mean():.3f}")
print(f"テスト: {y_test.mean():.3f}")
```

## 複数のアルゴリズムの比較

```python
# 比較するアルゴリズム
algorithms = {
    'Logistic Regression': LogisticRegression(random_state=42, max_iter=1000),
    'Decision Tree': DecisionTreeClassifier(random_state=42),
    'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
    'Gradient Boosting': GradientBoostingClassifier(random_state=42),
    'SVM': SVC(random_state=42, probability=True),
    'K-Nearest Neighbors': KNeighborsClassifier(n_neighbors=5),
    'Naive Bayes': GaussianNB()
}

# アルゴリズムの性能比較
results = {}

print("各アルゴリズムの性能比較:")
print("-" * 80)
print(f"{'Algorithm':<20} {'Train Acc':<10} {'Val Acc':<10} {'Val AUC':<10} {'Time(s)':<10}")
print("-" * 80)

import time

for name, algorithm in algorithms.items():
    # 学習時間測定
    start_time = time.time()
    
    # 学習
    algorithm.fit(X_train, y_train)
    
    # 予測
    train_pred = algorithm.predict(X_train)
    val_pred = algorithm.predict(X_val)
    
    # 確率予測（AUC計算用）
    if hasattr(algorithm, 'predict_proba'):
        val_proba = algorithm.predict_proba(X_val)[:, 1]
    else:
        val_proba = algorithm.decision_function(X_val)
    
    end_time = time.time()
    
    # 評価指標計算
    train_acc = accuracy_score(y_train, train_pred)
    val_acc = accuracy_score(y_val, val_pred)
    val_auc = roc_auc_score(y_val, val_proba)
    training_time = end_time - start_time
    
    results[name] = {
        'model': algorithm,
        'train_acc': train_acc,
        'val_acc': val_acc,
        'val_auc': val_auc,
        'time': training_time
    }
    
    print(f"{name:<20} {train_acc:<10.3f} {val_acc:<10.3f} {val_auc:<10.3f} {training_time:<10.3f}")

print("-" * 80)
```

## 詳細なモデル評価

```python
# 最高性能のモデルを選択
best_model_name = max(results.keys(), key=lambda k: results[k]['val_auc'])
best_model = results[best_model_name]['model']

print(f"最高性能モデル: {best_model_name}")
print(f"検証AUC: {results[best_model_name]['val_auc']:.3f}")

# テストデータで最終評価
test_pred = best_model.predict(X_test)
test_proba = best_model.predict_proba(X_test)[:, 1]

test_acc = accuracy_score(y_test, test_pred)
test_auc = roc_auc_score(y_test, test_proba)

print(f"\n最終テスト結果:")
print(f"精度: {test_acc:.3f}")
print(f"AUC: {test_auc:.3f}")

# 詳細な評価結果
print("\n分類レポート:")
print(classification_report(y_test, test_pred))

# 混同行列
cm = confusion_matrix(y_test, test_pred)
plt.figure(figsize=(15, 5))

# 1. 混同行列
plt.subplot(1, 3, 1)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('混同行列')
plt.ylabel('実際のラベル')
plt.xlabel('予測ラベル')

# 2. ROC曲線
fpr, tpr, thresholds = roc_curve(y_test, test_proba)
plt.subplot(1, 3, 2)
plt.plot(fpr, tpr, label=f'ROC Curve (AUC = {test_auc:.3f})')
plt.plot([0, 1], [0, 1], 'k--', alpha=0.5)
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('ROC曲線')
plt.legend()

# 3. 予測確率の分布
plt.subplot(1, 3, 3)
plt.hist(test_proba[y_test == 0], alpha=0.5, label='非勝利', bins=20, density=True)
plt.hist(test_proba[y_test == 1], alpha=0.5, label='勝利', bins=20, density=True)
plt.xlabel('予測確率')
plt.ylabel('密度')
plt.title('予測確率分布')
plt.legend()

plt.tight_layout()
plt.show()
```

## ハイパーパラメータ調整

```python
# 最高性能モデルのハイパーパラメータ調整
if best_model_name == 'Random Forest':
    param_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [5, 10, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4]
    }
    base_model = RandomForestClassifier(random_state=42)
    
elif best_model_name == 'Gradient Boosting':
    param_grid = {
        'n_estimators': [50, 100, 200],
        'learning_rate': [0.05, 0.1, 0.2],
        'max_depth': [3, 5, 7],
        'subsample': [0.8, 1.0]
    }
    base_model = GradientBoostingClassifier(random_state=42)
    
elif best_model_name == 'Logistic Regression':
    param_grid = {
        'C': [0.01, 0.1, 1, 10, 100],
        'penalty': ['l1', 'l2'],
        'solver': ['liblinear']
    }
    base_model = LogisticRegression(random_state=42, max_iter=1000)
    
else:
    # デフォルトのパラメータグリッド
    param_grid = {}
    base_model = best_model

if param_grid:
    print(f"{best_model_name}のハイパーパラメータ調整を実行中...")
    
    # グリッドサーチ
    grid_search = GridSearchCV(
        base_model, 
        param_grid, 
        cv=5, 
        scoring='roc_auc',
        n_jobs=-1,
        verbose=1
    )
    
    grid_search.fit(X_train, y_train)
    
    print(f"最適パラメータ: {grid_search.best_params_}")
    print(f"最高CV AUCスコア: {grid_search.best_score_:.3f}")
    
    # 最適化されたモデルで再評価
    optimized_model = grid_search.best_estimator_
    
    # テストデータで評価
    opt_test_pred = optimized_model.predict(X_test)
    opt_test_proba = optimized_model.predict_proba(X_test)[:, 1]
    
    opt_test_acc = accuracy_score(y_test, opt_test_pred)
    opt_test_auc = roc_auc_score(y_test, opt_test_proba)
    
    print(f"\n最適化後のテスト結果:")
    print(f"精度: {opt_test_acc:.3f} (改善: {opt_test_acc - test_acc:+.3f})")
    print(f"AUC: {opt_test_auc:.3f} (改善: {opt_test_auc - test_auc:+.3f})")
    
    final_model = optimized_model
else:
    final_model = best_model
    print("ハイパーパラメータ調整をスキップしました")
```

## 特徴量重要度の分析

```python
# 最終モデルの特徴量重要度
if hasattr(final_model, 'feature_importances_'):
    # Tree-based modelsの場合
    feature_importance = pd.DataFrame({
        'feature': selected_features,
        'importance': final_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    plt.figure(figsize=(12, 8))
    plt.barh(range(len(feature_importance)), feature_importance['importance'][::-1])
    plt.yticks(range(len(feature_importance)), feature_importance['feature'][::-1])
    plt.xlabel('特徴量重要度')
    plt.title(f'{best_model_name} - 特徴量重要度')
    plt.tight_layout()
    plt.show()
    
    print("特徴量重要度ランキング:")
    print(feature_importance)

elif hasattr(final_model, 'coef_'):
    # Linear modelsの場合
    feature_coef = pd.DataFrame({
        'feature': selected_features,
        'coefficient': final_model.coef_[0],
        'abs_coefficient': np.abs(final_model.coef_[0])
    }).sort_values('abs_coefficient', ascending=False)
    
    plt.figure(figsize=(12, 8))
    colors = ['red' if x < 0 else 'blue' for x in feature_coef['coefficient'][::-1]]
    plt.barh(range(len(feature_coef)), feature_coef['coefficient'][::-1], color=colors)
    plt.yticks(range(len(feature_coef)), feature_coef['feature'][::-1])
    plt.xlabel('回帰係数')
    plt.title(f'{best_model_name} - 回帰係数')
    plt.tight_layout()
    plt.show()
    
    print("回帰係数ランキング:")
    print(feature_coef)
```

## クロスバリデーション

```python
# より安定した評価のためのクロスバリデーション
cv_scores_acc = cross_val_score(final_model, X_train, y_train, cv=5, scoring='accuracy')
cv_scores_auc = cross_val_score(final_model, X_train, y_train, cv=5, scoring='roc_auc')

print("5-Fold クロスバリデーション結果:")
print(f"精度: {cv_scores_acc.mean():.3f} (+/- {cv_scores_acc.std() * 2:.3f})")
print(f"AUC: {cv_scores_auc.mean():.3f} (+/- {cv_scores_auc.std() * 2:.3f})")

# CV結果の可視化
fig, axes = plt.subplots(1, 2, figsize=(12, 5))

axes[0].bar(range(1, 6), cv_scores_acc)
axes[0].set_title('Cross-Validation Accuracy Scores')
axes[0].set_xlabel('Fold')
axes[0].set_ylabel('Accuracy')
axes[0].axhline(y=cv_scores_acc.mean(), color='red', linestyle='--', label='Mean')
axes[0].legend()

axes[1].bar(range(1, 6), cv_scores_auc)
axes[1].set_title('Cross-Validation AUC Scores')
axes[1].set_xlabel('Fold')
axes[1].set_ylabel('AUC')
axes[1].axhline(y=cv_scores_auc.mean(), color='red', linestyle='--', label='Mean')
axes[1].legend()

plt.tight_layout()
plt.show()
```

## 実用的な予想システム

```python
class HorseRacingPredictor:
    """競馬予想システム"""
    
    def __init__(self, model, scaler, feature_selector, selected_features):
        self.model = model
        self.scaler = scaler
        self.feature_selector = feature_selector
        self.selected_features = selected_features
        
    def predict_race(self, race_data):
        """レース予想を実行"""
        # 特徴量エンジニアリング
        race_features = create_features(race_data)
        
        # 特徴量選択
        X_race = race_features[feature_columns]
        X_race_scaled = self.scaler.transform(X_race)
        X_race_selected = self.feature_selector.transform(X_race_scaled)
        
        # 予測実行
        probabilities = self.model.predict_proba(X_race_selected)[:, 1]
        predictions = self.model.predict(X_race_selected)
        
        # 結果をまとめ
        results = race_data.copy()
        results['win_probability'] = probabilities
        results['predicted_winner'] = predictions
        results = results.sort_values('win_probability', ascending=False)
        
        return results
    
    def get_model_info(self):
        """モデル情報を取得"""
        return {
            'algorithm': best_model_name,
            'features': self.selected_features,
            'n_features': len(self.selected_features)
        }

# 予想システムの作成
predictor = HorseRacingPredictor(
    model=final_model,
    scaler=scaler,
    feature_selector=selector,
    selected_features=selected_features
)

print("競馬予想システム構築完了")
print(f"使用アルゴリズム: {best_model_name}")
print(f"特徴量数: {len(selected_features)}")
```

## サンプル予想の実行

```python
# テストデータから1レースを抽出して予想例を実行
sample_race_id = df_features['race_id'].unique()[0]
sample_race_data = df_features[df_features['race_id'] == sample_race_id].copy()

print(f"レースID {sample_race_id} の予想結果:")
print("=" * 60)

# 予想実行
prediction_results = predictor.predict_race(sample_race_data)

# 結果表示
display_columns = ['horse_id', 'popularity', 'odds', 'finish_position', 
                  'win_probability', 'predicted_winner']

for i, (_, horse) in enumerate(prediction_results[display_columns].iterrows(), 1):
    status = "★" if horse['predicted_winner'] == 1 else " "
    actual = "◯" if horse['finish_position'] == 1 else " "
    print(f"{i:2d} {status} {actual} | "
          f"馬ID: {horse['horse_id']:15} | "
          f"人気: {horse['popularity']:2.0f} | "
          f"オッズ: {horse['odds']:5.1f} | "
          f"着順: {horse['finish_position']:2.0f} | "
          f"勝利確率: {horse['win_probability']:.3f}")

print("\n記号説明:")
print("★: 予想1位, ◯: 実際の勝利馬")

# 的中確認
predicted_winner = prediction_results.iloc[0]
actual_winner = sample_race_data[sample_race_data['finish_position'] == 1].iloc[0]

if predicted_winner['horse_id'] == actual_winner['horse_id']:
    print("\n🎯 予想的中!")
else:
    print(f"\n❌ 予想外れ (予想: {predicted_winner['horse_id']}, 実際: {actual_winner['horse_id']})")
```

## モデルの保存と読み込み

```python
import joblib
from datetime import datetime

# モデルの保存
model_info = {
    'model': final_model,
    'scaler': scaler,
    'feature_selector': selector,
    'selected_features': selected_features,
    'feature_columns': feature_columns,
    'algorithm': best_model_name,
    'test_accuracy': opt_test_acc if 'opt_test_acc' in locals() else test_acc,
    'test_auc': opt_test_auc if 'opt_test_auc' in locals() else test_auc,
    'created_at': datetime.now().isoformat()
}

# 保存（実際のプロジェクトでは適切なパスを指定）
# joblib.dump(model_info, 'horse_racing_model.pkl')
print("モデル保存準備完了")

# 読み込み例
def load_model(filepath):
    """保存されたモデルを読み込み"""
    model_info = joblib.load(filepath)
    
    predictor = HorseRacingPredictor(
        model=model_info['model'],
        scaler=model_info['scaler'],
        feature_selector=model_info['feature_selector'],
        selected_features=model_info['selected_features']
    )
    
    return predictor, model_info

print("モデル保存・読み込み機能準備完了")
```

## まとめ

本記事では、scikit-learnを使用した競馬予想モデル構築の全工程を解説しました。

### 学習した主要な内容：

1. **データ準備**: サンプルデータ生成とEDA
2. **前処理**: 欠損値処理、エンコーディング、特徴量エンジニアリング
3. **特徴量選択**: 統計的手法による重要特徴量の抽出
4. **モデル比較**: 7つのアルゴリズムの性能評価
5. **ハイパーパラメータ調整**: GridSearchCVによる最適化
6. **モデル評価**: 精度、AUC、ROC曲線、混同行列
7. **特徴量重要度**: 予想に重要な要素の分析
8. **実用化**: 予想システムの構築

### scikit-learnの主要な利点：

- **統一API**: すべてのアルゴリズムが`fit()`, `predict()`で使用可能
- **豊富なツール**: 前処理、特徴量選択、評価指標が充実
- **実用的**: 産業界で広く使用される実績
- **ドキュメント**: 初心者にも理解しやすい説明

### 次のステップ：

1. **より多くのデータ**: 実際の競馬データベースの活用
2. **高度な特徴量**: 血統情報、調教データの活用
3. **アンサンブル**: 複数モデルの組み合わせ
4. **深層学習**: TensorFlow/PyTorchへの展開
5. **リアルタイム予想**: APIサーバーの構築

scikit-learnは機械学習の基礎を学ぶ最適なツールです。本記事で学んだ技術を基に、より高度な予想システムの構築に挑戦してください。データサイエンスの世界への第一歩として、scikit-learnをマスターすることで、様々な問題に応用できる汎用的なスキルを身につけることができます。