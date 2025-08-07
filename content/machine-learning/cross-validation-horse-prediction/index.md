---
title: "クロスバリデーションで予想精度を正しく評価する方法"
date: 2025-08-07T13:00:00+09:00
description: "競馬予想モデルの性能を正確に評価するためのクロスバリデーション手法を徹底解説。時系列データの特性を考慮した評価方法から実用的な検証まで、実装コードとともに紹介します。"
categories: ["機械学習", "モデル評価"]
tags: ["クロスバリデーション", "モデル評価", "競馬予想", "時系列", "過学習", "汎化性能"]
slug: "cross-validation-horse-prediction"
---

## はじめに

機械学習モデルの評価において、クロスバリデーション（交差検証）は極めて重要な技術です。特に競馬予想のような時系列性とレース特有の構造を持つデータでは、適切な評価手法を選択することがモデルの実用性を決定します。本記事では、競馬データに特化したクロスバリデーション手法を詳しく解説します。

## クロスバリデーションの基礎理論

### なぜクロスバリデーションが必要か

単純な訓練・テスト分割では以下の問題があります：

- **データの偏り**: 偶然の分割による性能の偏り
- **過学習の見落とし**: 訓練データへの過適合の発見が困難
- **汎化性能の過大評価**: 限定的なテストセットでの楽観的評価

### 競馬データ特有の課題

競馬データには以下の特殊性があります：

- **時系列依存性**: 過去のデータで未来を予測
- **レース構造**: 同一レース内での相互依存
- **季節性**: 競馬場・距離・時期による周期性
- **データ不均衡**: 勝利馬は約8-10%のみ

## 環境準備

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# sklearn
from sklearn.model_selection import (
    KFold, StratifiedKFold, TimeSeriesSplit, GroupKFold,
    cross_val_score, cross_validate, validation_curve, learning_curve
)
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report, confusion_matrix
)
from sklearn.preprocessing import StandardScaler, LabelEncoder

# 統計
from scipy import stats
from scipy.stats import ttest_rel

# 可視化設定
plt.rcParams['figure.figsize'] = (12, 8)
sns.set_style("whitegrid")

print("環境準備完了")
```

## データ準備

```python
# 競馬データの生成（時系列性を考慮）
np.random.seed(42)
n_races = 2000
n_horses_per_race = 10
start_date = datetime(2020, 1, 1)

data = []
for race_id in range(n_races):
    # 時系列順でレース日を生成
    race_date = start_date + timedelta(days=race_id // 10)  # 1日10レース程度
    
    # 季節性を考慮した特徴
    month = race_date.month
    season_factor = np.sin(2 * np.pi * month / 12)  # 季節性
    
    track = np.random.choice(['東京', '中山', '阪神', '京都'])
    distance = np.random.choice([1200, 1400, 1600, 1800, 2000, 2400])
    
    for horse_pos in range(n_horses_per_race):
        popularity = horse_pos + 1
        
        # 時系列トレンドを追加（予想精度の向上など）
        time_trend = race_id / n_races * 0.1
        
        # 季節性の影響
        seasonal_effect = season_factor * 0.05
        
        data.append({
            'race_id': race_id,
            'race_date': race_date,
            'year': race_date.year,
            'month': race_date.month,
            'day_of_year': race_date.timetuple().tm_yday,
            'track': track,
            'distance': distance,
            'horse_id': f'H{race_id:04d}{horse_pos:02d}',
            'popularity': popularity,
            'odds': 1.5 + popularity * 2 + np.random.exponential(2) + seasonal_effect,
            'weight': 460 + np.random.normal(0, 20),
            'age': np.random.randint(3, 8),
            'sex': np.random.choice(['牡', '牝', 'セ'], p=[0.5, 0.4, 0.1]),
            'jockey_skill': np.random.uniform(0.8, 1.2) + time_trend,
            'trainer_skill': np.random.uniform(0.9, 1.1) + time_trend,
            'recent_form': np.random.uniform(0.7, 1.3),
            'track_condition': np.random.choice(['良', '稍重', '重', '不良'], p=[0.7, 0.2, 0.07, 0.03])
        })

# 着順決定（人気とスキルに基づく確率的モデル）
for race_data in [data[i:i+n_horses_per_race] for i in range(0, len(data), n_horses_per_race)]:
    # 各馬の実力計算
    for horse in race_data:
        base_ability = (
            - horse['popularity'] * 0.3  # 人気馬ほど強い
            + horse['jockey_skill'] * 0.4
            + horse['trainer_skill'] * 0.3
            + horse['recent_form'] * 0.2
            + np.random.normal(0, 0.5)  # ランダム要素
        )
        horse['ability'] = base_ability
    
    # 着順決定
    race_data.sort(key=lambda x: x['ability'], reverse=True)
    for i, horse in enumerate(race_data):
        horse['finish_position'] = i + 1
        horse['is_winner'] = 1 if i == 0 else 0

df = pd.DataFrame(data)
df['race_date'] = pd.to_datetime(df['race_date'])

print(f"データサイズ: {df.shape}")
print(f"期間: {df['race_date'].min()} - {df['race_date'].max()}")
print(f"勝率: {df['is_winner'].mean():.3f}")

# 基本的な可視化
fig, axes = plt.subplots(2, 2, figsize=(15, 10))

# 時系列での勝率変化
monthly_win_rate = df.groupby(df['race_date'].dt.to_period('M'))['is_winner'].mean()
monthly_win_rate.plot(ax=axes[0,0])
axes[0,0].set_title('月別勝率の変化')
axes[0,0].set_ylabel('勝率')

# 人気別勝率
popularity_win_rate = df.groupby('popularity')['is_winner'].mean()
popularity_win_rate.plot(kind='bar', ax=axes[0,1])
axes[0,1].set_title('人気別勝率')
axes[0,1].set_ylabel('勝率')

# レース数の時系列変化
daily_races = df.groupby(df['race_date'].dt.date).size()
daily_races.plot(ax=axes[1,0])
axes[1,0].set_title('日別レース数')
axes[1,0].set_ylabel('レース数')

# データ分布
df[['odds', 'weight', 'age']].hist(ax=axes[1,1], alpha=0.7)
axes[1,1].set_title('主要変数の分布')

plt.tight_layout()
plt.show()
```

## 基本的なクロスバリデーション手法

### 1. K-Fold交差検証

```python
def basic_cross_validation_comparison(df):
    """基本的なクロスバリデーション手法の比較"""
    
    # 特徴量準備
    feature_columns = ['popularity', 'odds', 'weight', 'age', 'jockey_skill', 
                      'trainer_skill', 'recent_form', 'distance']
    
    # カテゴリ変数のエンコーディング
    le_sex = LabelEncoder()
    le_track = LabelEncoder()
    le_condition = LabelEncoder()
    
    df_encoded = df.copy()
    df_encoded['sex_encoded'] = le_sex.fit_transform(df['sex'])
    df_encoded['track_encoded'] = le_track.fit_transform(df['track'])
    df_encoded['condition_encoded'] = le_condition.fit_transform(df['track_condition'])
    
    feature_columns.extend(['sex_encoded', 'track_encoded', 'condition_encoded'])
    
    X = df_encoded[feature_columns]
    y = df_encoded['is_winner']
    
    # 各種クロスバリデーション手法
    cv_methods = {
        'K-Fold (5)': KFold(n_splits=5, shuffle=True, random_state=42),
        'Stratified K-Fold (5)': StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
        'K-Fold (10)': KFold(n_splits=10, shuffle=True, random_state=42),
        'Stratified K-Fold (10)': StratifiedKFold(n_splits=10, shuffle=True, random_state=42)
    }
    
    # モデル
    models = {
        'Logistic Regression': LogisticRegression(random_state=42, max_iter=1000),
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(random_state=42)
    }
    
    results = []
    
    print("=== 基本的なクロスバリデーション比較 ===")
    print(f"{'CV Method':<25} {'Model':<20} {'Accuracy':<10} {'AUC':<10} {'Std':<10}")
    print("-" * 80)
    
    for cv_name, cv_method in cv_methods.items():
        for model_name, model in models.items():
            # 複数メトリクスでの評価
            scores = cross_validate(
                model, X, y, cv=cv_method,
                scoring=['accuracy', 'roc_auc'],
                return_train_score=False
            )
            
            acc_mean = scores['test_accuracy'].mean()
            acc_std = scores['test_accuracy'].std()
            auc_mean = scores['test_roc_auc'].mean()
            auc_std = scores['test_roc_auc'].std()
            
            results.append({
                'cv_method': cv_name,
                'model': model_name,
                'accuracy_mean': acc_mean,
                'accuracy_std': acc_std,
                'auc_mean': auc_mean,
                'auc_std': auc_std
            })
            
            print(f"{cv_name:<25} {model_name:<20} {acc_mean:<10.3f} {auc_mean:<10.3f} {acc_std:<10.3f}")
    
    return pd.DataFrame(results), X, y

cv_results, X, y = basic_cross_validation_comparison(df)
```

### 2. 時系列を考慮した交差検証

```python
def time_aware_cross_validation(df, X, y):
    """時系列を考慮したクロスバリデーション"""
    
    print("\n=== 時系列を考慮したクロスバリデーション ===")
    
    # 時系列分割のパラメータ
    df_with_features = pd.concat([df[['race_id', 'race_date']], X, y], axis=1)
    df_sorted = df_with_features.sort_values('race_date')
    
    X_sorted = df_sorted.drop(['race_id', 'race_date', 'is_winner'], axis=1)
    y_sorted = df_sorted['is_winner']
    
    # 1. TimeSeriesSplit
    tscv = TimeSeriesSplit(n_splits=5)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    
    # 時系列分割での評価
    ts_scores = cross_validate(
        model, X_sorted, y_sorted, cv=tscv,
        scoring=['accuracy', 'roc_auc'],
        return_train_score=True
    )
    
    print("TimeSeriesSplit結果:")
    print(f"テスト精度: {ts_scores['test_accuracy'].mean():.3f} ± {ts_scores['test_accuracy'].std():.3f}")
    print(f"テストAUC: {ts_scores['test_roc_auc'].mean():.3f} ± {ts_scores['test_roc_auc'].std():.3f}")
    print(f"訓練精度: {ts_scores['train_accuracy'].mean():.3f} ± {ts_scores['train_accuracy'].std():.3f}")
    
    # 2. 手動時系列分割
    def manual_time_split(df, n_splits=5):
        """手動での時系列分割"""
        df_sorted = df.sort_values('race_date')
        total_samples = len(df_sorted)
        
        splits = []
        for i in range(n_splits):
            # 訓練期間の終了点
            train_end = int(total_samples * (i + 2) / (n_splits + 1))
            # テスト期間の開始・終了点
            test_start = train_end
            test_end = int(total_samples * (i + 3) / (n_splits + 1))
            
            train_indices = df_sorted.index[:train_end].tolist()
            test_indices = df_sorted.index[test_start:test_end].tolist()
            
            splits.append((train_indices, test_indices))
            
            train_period = df_sorted.iloc[:train_end]['race_date'].agg(['min', 'max'])
            test_period = df_sorted.iloc[test_start:test_end]['race_date'].agg(['min', 'max'])
            
            print(f"Fold {i+1}:")
            print(f"  訓練期間: {train_period['min'].date()} - {train_period['max'].date()}")
            print(f"  テスト期間: {test_period['min'].date()} - {test_period['max'].date()}")
        
        return splits
    
    # 手動分割での評価
    manual_splits = manual_time_split(df_with_features, n_splits=5)
    
    manual_scores = []
    for train_idx, test_idx in manual_splits:
        X_train_fold = X.loc[train_idx]
        X_test_fold = X.loc[test_idx]
        y_train_fold = y.loc[train_idx]
        y_test_fold = y.loc[test_idx]
        
        model.fit(X_train_fold, y_train_fold)
        
        train_pred = model.predict(X_train_fold)
        test_pred = model.predict(X_test_fold)
        test_proba = model.predict_proba(X_test_fold)[:, 1]
        
        manual_scores.append({
            'train_accuracy': accuracy_score(y_train_fold, train_pred),
            'test_accuracy': accuracy_score(y_test_fold, test_pred),
            'test_auc': roc_auc_score(y_test_fold, test_proba)
        })
    
    manual_df = pd.DataFrame(manual_scores)
    print(f"\n手動時系列分割結果:")
    print(f"テスト精度: {manual_df['test_accuracy'].mean():.3f} ± {manual_df['test_accuracy'].std():.3f}")
    print(f"テストAUC: {manual_df['test_auc'].mean():.3f} ± {manual_df['test_auc'].std():.3f}")
    
    return ts_scores, manual_scores

ts_scores, manual_scores = time_aware_cross_validation(df, X, y)
```

### 3. グループを考慮した交差検証

```python
def group_cross_validation(df, X, y):
    """レースグループを考慮したクロスバリデーション"""
    
    print("\n=== グループクロスバリデーション ===")
    
    # レースIDをグループとして使用
    groups = df['race_id']
    
    # GroupKFold
    gkf = GroupKFold(n_splits=5)
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    
    # グループクロスバリデーション
    group_scores = cross_validate(
        model, X, y, groups=groups, cv=gkf,
        scoring=['accuracy', 'roc_auc'],
        return_train_score=True
    )
    
    print("GroupKFold結果:")
    print(f"テスト精度: {group_scores['test_accuracy'].mean():.3f} ± {group_scores['test_accuracy'].std():.3f}")
    print(f"テストAUC: {group_scores['test_roc_auc'].mean():.3f} ± {group_scores['test_roc_auc'].std():.3f}")
    
    # 手動でのレースレベル分割
    def race_level_split(df, n_splits=5):
        """レースレベルでの分割"""
        unique_races = df['race_id'].unique()
        np.random.shuffle(unique_races)
        
        race_splits = np.array_split(unique_races, n_splits)
        
        splits = []
        for i in range(n_splits):
            test_races = race_splits[i]
            train_races = np.concatenate([race_splits[j] for j in range(n_splits) if j != i])
            
            train_mask = df['race_id'].isin(train_races)
            test_mask = df['race_id'].isin(test_races)
            
            train_indices = df[train_mask].index.tolist()
            test_indices = df[test_mask].index.tolist()
            
            splits.append((train_indices, test_indices))
            
            print(f"Fold {i+1}: 訓練レース{len(train_races)}個, テストレース{len(test_races)}個")
        
        return splits
    
    race_splits = race_level_split(df, n_splits=5)
    
    # レースレベル評価
    race_scores = []
    for train_idx, test_idx in race_splits:
        X_train_fold = X.iloc[train_idx]
        X_test_fold = X.iloc[test_idx]
        y_train_fold = y.iloc[train_idx]
        y_test_fold = y.iloc[test_idx]
        
        model.fit(X_train_fold, y_train_fold)
        
        test_pred = model.predict(X_test_fold)
        test_proba = model.predict_proba(X_test_fold)[:, 1]
        
        race_scores.append({
            'accuracy': accuracy_score(y_test_fold, test_pred),
            'auc': roc_auc_score(y_test_fold, test_proba)
        })
    
    race_df = pd.DataFrame(race_scores)
    print(f"\nレースレベル分割結果:")
    print(f"テスト精度: {race_df['accuracy'].mean():.3f} ± {race_df['accuracy'].std():.3f}")
    print(f"テストAUC: {race_df['auc'].mean():.3f} ± {race_df['auc'].std():.3f}")
    
    return group_scores, race_scores

group_scores, race_scores = group_cross_validation(df, X, y)
```

## 高度な評価手法

### 1. ネステッドクロスバリデーション

```python
def nested_cross_validation(X, y, groups):
    """ネステッドクロスバリデーション"""
    
    print("\n=== ネステッドクロスバリデーション ===")
    
    from sklearn.model_selection import GridSearchCV
    
    # 外側のCV（性能評価用）
    outer_cv = GroupKFold(n_splits=5)
    
    # 内側のCV（ハイパーパラメータ調整用）
    inner_cv = GroupKFold(n_splits=3)
    
    # パラメータグリッド
    param_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [5, 10, None],
        'min_samples_split': [2, 5, 10]
    }
    
    # ネステッドCV実行
    nested_scores = []
    best_params_list = []
    
    for i, (train_outer, test_outer) in enumerate(outer_cv.split(X, y, groups)):
        print(f"\n外側 Fold {i+1}:")
        
        X_train_outer = X.iloc[train_outer]
        X_test_outer = X.iloc[test_outer]
        y_train_outer = y.iloc[train_outer]
        y_test_outer = y.iloc[test_outer]
        groups_train_outer = groups.iloc[train_outer]
        
        # 内側CVでハイパーパラメータ調整
        grid_search = GridSearchCV(
            RandomForestClassifier(random_state=42),
            param_grid,
            cv=inner_cv,
            scoring='roc_auc',
            n_jobs=-1
        )
        
        grid_search.fit(X_train_outer, y_train_outer, groups=groups_train_outer)
        
        # 最適パラメータで外側テストセットを評価
        best_model = grid_search.best_estimator_
        test_pred = best_model.predict(X_test_outer)
        test_proba = best_model.predict_proba(X_test_outer)[:, 1]
        
        fold_score = {
            'accuracy': accuracy_score(y_test_outer, test_pred),
            'auc': roc_auc_score(y_test_outer, test_proba),
            'precision': precision_score(y_test_outer, test_pred),
            'recall': recall_score(y_test_outer, test_pred),
            'f1': f1_score(y_test_outer, test_pred)
        }
        
        nested_scores.append(fold_score)
        best_params_list.append(grid_search.best_params_)
        
        print(f"  最適パラメータ: {grid_search.best_params_}")
        print(f"  内側CV最高スコア: {grid_search.best_score_:.3f}")
        print(f"  外側テストスコア: {fold_score['auc']:.3f}")
    
    # 結果まとめ
    nested_df = pd.DataFrame(nested_scores)
    
    print(f"\n=== ネステッドCV最終結果 ===")
    for metric in ['accuracy', 'auc', 'precision', 'recall', 'f1']:
        mean_score = nested_df[metric].mean()
        std_score = nested_df[metric].std()
        print(f"{metric.upper()}: {mean_score:.3f} ± {std_score:.3f}")
    
    # パラメータの安定性確認
    param_stability = pd.DataFrame(best_params_list)
    print(f"\n=== パラメータ選択の安定性 ===")
    for param in param_stability.columns:
        print(f"{param}: {param_stability[param].value_counts()}")
    
    return nested_scores, best_params_list

nested_scores, best_params = nested_cross_validation(X, y, df['race_id'])
```

### 2. 学習曲線とバリデーション曲線

```python
def plot_learning_validation_curves(X, y, groups):
    """学習曲線とバリデーション曲線の描画"""
    
    print("\n=== 学習曲線・バリデーション曲線分析 ===")
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    cv = GroupKFold(n_splits=5)
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    
    # 1. 学習曲線
    train_sizes = np.linspace(0.1, 1.0, 10)
    train_sizes_abs, train_scores, val_scores = learning_curve(
        model, X, y, groups=groups, cv=cv, 
        train_sizes=train_sizes, scoring='roc_auc',
        n_jobs=-1, random_state=42
    )
    
    train_mean = train_scores.mean(axis=1)
    train_std = train_scores.std(axis=1)
    val_mean = val_scores.mean(axis=1)
    val_std = val_scores.std(axis=1)
    
    axes[0,0].plot(train_sizes_abs, train_mean, 'o-', label='訓練スコア', alpha=0.8)
    axes[0,0].fill_between(train_sizes_abs, train_mean - train_std, train_mean + train_std, alpha=0.2)
    axes[0,0].plot(train_sizes_abs, val_mean, 'o-', label='検証スコア', alpha=0.8)
    axes[0,0].fill_between(train_sizes_abs, val_mean - val_std, val_mean + val_std, alpha=0.2)
    axes[0,0].set_xlabel('訓練サンプル数')
    axes[0,0].set_ylabel('AUC Score')
    axes[0,0].set_title('学習曲線')
    axes[0,0].legend()
    axes[0,0].grid(True)
    
    # 2. バリデーション曲線（n_estimators）
    param_range = [10, 50, 100, 200, 300, 500]
    train_scores_val, val_scores_val = validation_curve(
        RandomForestClassifier(random_state=42), X, y, groups=groups,
        param_name='n_estimators', param_range=param_range,
        cv=cv, scoring='roc_auc', n_jobs=-1
    )
    
    train_mean_val = train_scores_val.mean(axis=1)
    train_std_val = train_scores_val.std(axis=1)
    val_mean_val = val_scores_val.mean(axis=1)
    val_std_val = val_scores_val.std(axis=1)
    
    axes[0,1].plot(param_range, train_mean_val, 'o-', label='訓練スコア', alpha=0.8)
    axes[0,1].fill_between(param_range, train_mean_val - train_std_val, train_mean_val + train_std_val, alpha=0.2)
    axes[0,1].plot(param_range, val_mean_val, 'o-', label='検証スコア', alpha=0.8)
    axes[0,1].fill_between(param_range, val_mean_val - val_std_val, val_mean_val + val_std_val, alpha=0.2)
    axes[0,1].set_xlabel('n_estimators')
    axes[0,1].set_ylabel('AUC Score')
    axes[0,1].set_title('バリデーション曲線 (n_estimators)')
    axes[0,1].legend()
    axes[0,1].grid(True)
    
    # 3. バリデーション曲線（max_depth）
    param_range_depth = [3, 5, 7, 10, 15, None]
    param_range_depth_numeric = [3, 5, 7, 10, 15, 20]  # Noneを20に置換
    
    train_scores_depth, val_scores_depth = validation_curve(
        RandomForestClassifier(n_estimators=100, random_state=42), X, y, groups=groups,
        param_name='max_depth', param_range=param_range_depth,
        cv=cv, scoring='roc_auc', n_jobs=-1
    )
    
    train_mean_depth = train_scores_depth.mean(axis=1)
    train_std_depth = train_scores_depth.std(axis=1)
    val_mean_depth = val_scores_depth.mean(axis=1)
    val_std_depth = val_scores_depth.std(axis=1)
    
    axes[1,0].plot(param_range_depth_numeric, train_mean_depth, 'o-', label='訓練スコア', alpha=0.8)
    axes[1,0].fill_between(param_range_depth_numeric, train_mean_depth - train_std_depth, train_mean_depth + train_std_depth, alpha=0.2)
    axes[1,0].plot(param_range_depth_numeric, val_mean_depth, 'o-', label='検証スコア', alpha=0.8)
    axes[1,0].fill_between(param_range_depth_numeric, val_mean_depth - val_std_depth, val_mean_depth + val_std_depth, alpha=0.2)
    axes[1,0].set_xlabel('max_depth (None=20)')
    axes[1,0].set_ylabel('AUC Score')
    axes[1,0].set_title('バリデーション曲線 (max_depth)')
    axes[1,0].legend()
    axes[1,0].grid(True)
    
    # 4. 過学習の検出
    overfitting_scores = []
    for i in range(len(train_sizes_abs)):
        overfitting = train_mean[i] - val_mean[i]
        overfitting_scores.append(overfitting)
    
    axes[1,1].plot(train_sizes_abs, overfitting_scores, 'ro-', alpha=0.8)
    axes[1,1].axhline(y=0, color='k', linestyle='--', alpha=0.5)
    axes[1,1].set_xlabel('訓練サンプル数')
    axes[1,1].set_ylabel('過学習度 (訓練スコア - 検証スコア)')
    axes[1,1].set_title('過学習の検出')
    axes[1,1].grid(True)
    
    plt.tight_layout()
    plt.show()
    
    # 過学習の数値的評価
    final_overfitting = train_mean[-1] - val_mean[-1]
    print(f"最終的な過学習度: {final_overfitting:.4f}")
    
    if final_overfitting > 0.05:
        print("⚠️  過学習の可能性があります")
    elif final_overfitting < -0.05:
        print("⚠️  学習不足の可能性があります") 
    else:
        print("✅ 適切な学習状態です")

plot_learning_validation_curves(X, y, df['race_id'])
```

## 実用的な評価指標

### 1. 競馬特有の評価指標

```python
def horse_racing_specific_metrics(df, X, y, groups):
    """競馬特有の評価指標"""
    
    print("\n=== 競馬特有の評価指標 ===")
    
    from sklearn.model_selection import cross_val_predict
    
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    cv = GroupKFold(n_splits=5)
    
    # クロスバリデーションでの予測
    y_pred_proba = cross_val_predict(model, X, y, groups=groups, cv=cv, method='predict_proba')[:, 1]
    y_pred = cross_val_predict(model, X, y, groups=groups, cv=cv, method='predict')
    
    # データフレームに予測結果を追加
    df_with_pred = df.copy()
    df_with_pred['pred_proba'] = y_pred_proba
    df_with_pred['pred_winner'] = y_pred
    
    # 1. レース単位での的中率
    def calculate_race_accuracy(race_group):
        """各レースでの予想的中率"""
        if len(race_group) == 0:
            return np.nan
        
        # 最も確率の高い馬を予想
        predicted_winner_idx = race_group['pred_proba'].idxmax()
        actual_winner_idx = race_group[race_group['is_winner'] == 1].index
        
        if len(actual_winner_idx) == 0:
            return np.nan
        
        return 1 if predicted_winner_idx in actual_winner_idx.values else 0
    
    race_accuracy = df_with_pred.groupby('race_id').apply(calculate_race_accuracy)
    race_hit_rate = race_accuracy.mean()
    
    print(f"レース単位的中率: {race_hit_rate:.3f}")
    
    # 2. 人気別的中率
    popularity_accuracy = []
    for pop in range(1, 6):  # 1-5番人気
        pop_mask = df_with_pred['popularity'] == pop
        if pop_mask.sum() > 0:
            pop_acc = accuracy_score(df_with_pred[pop_mask]['is_winner'], 
                                   df_with_pred[pop_mask]['pred_winner'])
            popularity_accuracy.append((pop, pop_acc))
            print(f"{pop}番人気的中率: {pop_acc:.3f}")
    
    # 3. 回収率計算
    def calculate_return_rate(df_pred):
        """回収率計算"""
        total_bet = 0
        total_return = 0
        
        for race_id, race_group in df_pred.groupby('race_id'):
            if len(race_group) == 0:
                continue
            
            # 最も確率の高い馬に賭ける
            predicted_winner = race_group.loc[race_group['pred_proba'].idxmax()]
            
            total_bet += 100  # 100円賭け
            
            # 的中した場合の払い戻し
            if predicted_winner['is_winner'] == 1:
                total_return += predicted_winner['odds'] * 100
        
        return total_return / total_bet if total_bet > 0 else 0
    
    return_rate = calculate_return_rate(df_with_pred)
    print(f"回収率: {return_rate:.3f} ({return_rate*100:.1f}%)")
    
    # 4. 信頼度別的中率
    confidence_bins = [0, 0.1, 0.2, 0.3, 0.5, 1.0]
    confidence_labels = ['0-10%', '10-20%', '20-30%', '30-50%', '50-100%']
    
    df_with_pred['confidence_bin'] = pd.cut(df_with_pred['pred_proba'], 
                                          bins=confidence_bins, 
                                          labels=confidence_labels)
    
    print(f"\n信頼度別的中率:")
    for bin_label in confidence_labels:
        bin_mask = df_with_pred['confidence_bin'] == bin_label
        if bin_mask.sum() > 0:
            bin_acc = accuracy_score(df_with_pred[bin_mask]['is_winner'],
                                   df_with_pred[bin_mask]['pred_winner'])
            bin_count = bin_mask.sum()
            print(f"{bin_label}: {bin_acc:.3f} ({bin_count}サンプル)")
    
    # 5. 実用的な評価サマリー
    metrics_summary = {
        'traditional_accuracy': accuracy_score(y, y_pred),
        'auc_score': roc_auc_score(y, y_pred_proba),
        'race_hit_rate': race_hit_rate,
        'return_rate': return_rate,
        'precision': precision_score(y, y_pred),
        'recall': recall_score(y, y_pred)
    }
    
    return metrics_summary, df_with_pred

horse_metrics, df_with_pred = horse_racing_specific_metrics(df, X, y, df['race_id'])
```

### 2. 統計的有意性検定

```python
def statistical_significance_testing(df, X, y, groups):
    """統計的有意性検定"""
    
    print("\n=== 統計的有意性検定 ===")
    
    # 複数モデルでの比較
    models = {
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, random_state=42),
        'Logistic Regression': LogisticRegression(random_state=42, max_iter=1000)
    }
    
    cv = GroupKFold(n_splits=5)
    
    # 各モデルのCV スコア収集
    model_scores = {}
    for model_name, model in models.items():
        scores = cross_val_score(model, X, y, groups=groups, cv=cv, scoring='roc_auc')
        model_scores[model_name] = scores
        print(f"{model_name}: {scores.mean():.3f} ± {scores.std():.3f}")
    
    # ペアワイズt検定
    model_names = list(model_scores.keys())
    print(f"\n=== ペアワイズt検定 (p値) ===")
    print(f"{'':20s}", end="")
    for name in model_names:
        print(f"{name[:15]:15s}", end="")
    print()
    
    for i, name1 in enumerate(model_names):
        print(f"{name1[:20]:20s}", end="")
        for j, name2 in enumerate(model_names):
            if i != j:
                t_stat, p_value = ttest_rel(model_scores[name1], model_scores[name2])
                significance = "***" if p_value < 0.001 else "**" if p_value < 0.01 else "*" if p_value < 0.05 else ""
                print(f"{p_value:.3f}{significance:3s}   ", end="")
            else:
                print("     -      ", end="")
        print()
    
    print("\n* p<0.05, ** p<0.01, *** p<0.001")
    
    # 効果量（Cohen's d）の計算
    def cohens_d(group1, group2):
        """Cohen's d効果量"""
        n1, n2 = len(group1), len(group2)
        s1, s2 = np.var(group1, ddof=1), np.var(group2, ddof=1)
        pooled_std = np.sqrt(((n1 - 1) * s1 + (n2 - 1) * s2) / (n1 + n2 - 2))
        return (np.mean(group1) - np.mean(group2)) / pooled_std
    
    print(f"\n=== 効果量 (Cohen's d) ===")
    for i, name1 in enumerate(model_names):
        for j, name2 in enumerate(model_names[i+1:], i+1):
            d = cohens_d(model_scores[name1], model_scores[name2])
            effect_size = "大" if abs(d) > 0.8 else "中" if abs(d) > 0.5 else "小" if abs(d) > 0.2 else "なし"
            print(f"{name1} vs {name2}: d={d:.3f} ({effect_size})")
    
    # ボックスプロットで可視化
    plt.figure(figsize=(10, 6))
    
    score_data = [model_scores[name] for name in model_names]
    plt.boxplot(score_data, labels=model_names)
    plt.ylabel('AUC Score')
    plt.title('モデル間のスコア分布比較')
    plt.xticks(rotation=45)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()
    
    return model_scores

model_scores = statistical_significance_testing(df, X, y, df['race_id'])
```

## バイアスとフェアネス評価

```python
def bias_and_fairness_evaluation(df, df_with_pred):
    """バイアスとフェアネスの評価"""
    
    print("\n=== バイアス・フェアネス評価 ===")
    
    # 1. 性別バイアス
    print("1. 性別による予想バイアス:")
    for sex in df['sex'].unique():
        sex_mask = df['sex'] == sex
        if sex_mask.sum() > 100:  # 十分なサンプル数
            sex_accuracy = accuracy_score(
                df_with_pred[sex_mask]['is_winner'],
                df_with_pred[sex_mask]['pred_winner']
            )
            sex_auc = roc_auc_score(
                df_with_pred[sex_mask]['is_winner'],
                df_with_pred[sex_mask]['pred_proba']
            )
            print(f"  {sex}: 精度={sex_accuracy:.3f}, AUC={sex_auc:.3f}")
    
    # 2. 競馬場バイアス
    print("\n2. 競馬場による予想バイアス:")
    for track in df['track'].unique():
        track_mask = df['track'] == track
        if track_mask.sum() > 100:
            track_accuracy = accuracy_score(
                df_with_pred[track_mask]['is_winner'],
                df_with_pred[track_mask]['pred_winner']
            )
            track_auc = roc_auc_score(
                df_with_pred[track_mask]['is_winner'],
                df_with_pred[track_mask]['pred_proba']
            )
            print(f"  {track}: 精度={track_accuracy:.3f}, AUC={track_auc:.3f}")
    
    # 3. 時期バイアス
    print("\n3. 月別予想バイアス:")
    monthly_bias = df_with_pred.groupby('month').apply(
        lambda x: {
            'accuracy': accuracy_score(x['is_winner'], x['pred_winner']),
            'auc': roc_auc_score(x['is_winner'], x['pred_proba']) if x['is_winner'].sum() > 0 else np.nan,
            'sample_count': len(x)
        }
    )
    
    for month, metrics in monthly_bias.items():
        if metrics['sample_count'] > 50:
            print(f"  {month}月: 精度={metrics['accuracy']:.3f}, AUC={metrics['auc']:.3f}")
    
    # 4. 予想確率の校正
    from sklearn.calibration import calibration_curve
    
    fraction_of_positives, mean_predicted_value = calibration_curve(
        df_with_pred['is_winner'], 
        df_with_pred['pred_proba'], 
        n_bins=10
    )
    
    plt.figure(figsize=(12, 5))
    
    # 校正プロット
    plt.subplot(1, 2, 1)
    plt.plot([0, 1], [0, 1], 'k:', label='完全校正')
    plt.plot(mean_predicted_value, fraction_of_positives, 's-', label='予想モデル')
    plt.xlabel('平均予想確率')
    plt.ylabel('実際の勝率')
    plt.title('確率校正プロット')
    plt.legend()
    plt.grid(True)
    
    # 予想確率分布
    plt.subplot(1, 2, 2)
    winners = df_with_pred[df_with_pred['is_winner'] == 1]['pred_proba']
    losers = df_with_pred[df_with_pred['is_winner'] == 0]['pred_proba']
    
    plt.hist(losers, bins=20, alpha=0.6, label='非勝利馬', density=True)
    plt.hist(winners, bins=20, alpha=0.6, label='勝利馬', density=True)
    plt.xlabel('予想確率')
    plt.ylabel('密度')
    plt.title('予想確率分布')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.show()
    
    # 校正誤差計算
    calibration_error = np.mean(np.abs(fraction_of_positives - mean_predicted_value))
    print(f"\n校正誤差: {calibration_error:.4f}")
    
    if calibration_error < 0.05:
        print("✅ 予想確率は良く校正されています")
    elif calibration_error < 0.1:
        print("⚠️  予想確率にやや校正誤差があります")
    else:
        print("❌ 予想確率の校正に問題があります")

bias_and_fairness_evaluation(df, df_with_pred)
```

## クロスバリデーション戦略の選択ガイド

```python
def cv_strategy_recommendation(df):
    """データ特性に基づくクロスバリデーション戦略の推奨"""
    
    print("\n=== クロスバリデーション戦略推奨システム ===")
    
    data_characteristics = {
        'sample_size': len(df),
        'n_features': len([col for col in df.columns if col not in ['race_id', 'race_date', 'is_winner']]),
        'time_span_days': (df['race_date'].max() - df['race_date'].min()).days,
        'n_races': df['race_id'].nunique(),
        'n_tracks': df['track'].nunique() if 'track' in df.columns else 1,
        'class_imbalance': df['is_winner'].mean(),
        'has_groups': df['race_id'].nunique() < len(df),
        'is_time_series': df['race_date'].nunique() > 1
    }
    
    print("データ特性:")
    print(f"  サンプル数: {data_characteristics['sample_size']:,}")
    print(f"  特徴量数: {data_characteristics['n_features']}")
    print(f"  期間: {data_characteristics['time_span_days']}日")
    print(f"  レース数: {data_characteristics['n_races']:,}")
    print(f"  競馬場数: {data_characteristics['n_tracks']}")
    print(f"  クラス不均衡: {data_characteristics['class_imbalance']:.3f}")
    
    # 推奨システム
    recommendations = []
    
    # サンプルサイズベース
    if data_characteristics['sample_size'] < 1000:
        recommendations.append("⚠️  サンプル数が少ないため、Leave-One-Out CVを検討")
    elif data_characteristics['sample_size'] > 100000:
        recommendations.append("💡 大規模データのため、計算効率を考慮してHold-out法も検討")
    
    # 時系列性
    if data_characteristics['is_time_series']:
        if data_characteristics['time_span_days'] > 365:
            recommendations.append("🕐 長期時系列データ: TimeSeriesSplit必須")
        else:
            recommendations.append("🕐 短期時系列データ: 通常のCV後に時系列分割で検証")
    
    # グループ構造
    if data_characteristics['has_groups']:
        recommendations.append("👥 レースグループ構造あり: GroupKFold推奨")
    
    # クラス不均衡
    if data_characteristics['class_imbalance'] < 0.05 or data_characteristics['class_imbalance'] > 0.95:
        recommendations.append("⚖️  極度のクラス不均衡: StratifiedKFold必須")
    elif data_characteristics['class_imbalance'] < 0.2 or data_characteristics['class_imbalance'] > 0.8:
        recommendations.append("⚖️  クラス不均衡: StratifiedKFold推奨")
    
    # 計算複雑度
    complexity_score = data_characteristics['sample_size'] * data_characteristics['n_features']
    if complexity_score > 10000000:  # 1000万
        recommendations.append("⚡ 高計算複雑度: 3-5 fold CVで十分")
    
    print(f"\n推奨事項:")
    for i, rec in enumerate(recommendations, 1):
        print(f"{i}. {rec}")
    
    # 最終推奨
    print(f"\n🎯 総合推奨:")
    
    if (data_characteristics['is_time_series'] and 
        data_characteristics['has_groups'] and 
        data_characteristics['class_imbalance'] < 0.2):
        print("   時系列グループ化層化クロスバリデーション")
        print("   1. GroupKFold (race_id)")
        print("   2. TimeSeriesSplit での検証")
        print("   3. Stratified sampling within groups")
        
    elif data_characteristics['is_time_series']:
        print("   時系列クロスバリデーション")
        print("   - TimeSeriesSplit (n_splits=5)")
        
    elif data_characteristics['has_groups']:
        print("   グループクロスバリデーション")
        print("   - GroupKFold (race_id, n_splits=5)")
        
    elif data_characteristics['class_imbalance'] < 0.2:
        print("   層化クロスバリデーション")
        print("   - StratifiedKFold (n_splits=5-10)")
        
    else:
        print("   標準クロスバリデーション")
        print("   - KFold (n_splits=5-10)")
    
    return data_characteristics, recommendations

cv_recommendations = cv_strategy_recommendation(df)
```

## 実運用でのモニタリング

```python
class ModelPerformanceMonitor:
    """モデル性能モニタリングクラス"""
    
    def __init__(self, model, validation_method='time_series'):
        self.model = model
        self.validation_method = validation_method
        self.performance_history = []
        self.drift_threshold = 0.05  # 性能劣化の閾値
        
    def add_performance_record(self, date, y_true, y_pred, y_pred_proba):
        """性能記録を追加"""
        metrics = {
            'date': date,
            'accuracy': accuracy_score(y_true, y_pred),
            'auc': roc_auc_score(y_true, y_pred_proba),
            'precision': precision_score(y_true, y_pred),
            'recall': recall_score(y_true, y_pred),
            'f1': f1_score(y_true, y_pred),
            'n_samples': len(y_true)
        }
        
        self.performance_history.append(metrics)
    
    def detect_performance_drift(self, window_size=30):
        """性能劣化の検出"""
        if len(self.performance_history) < window_size * 2:
            return False, "履歴データ不足"
        
        # 最新期間と過去期間の比較
        recent_performance = np.mean([
            record['auc'] for record in self.performance_history[-window_size:]
        ])
        
        past_performance = np.mean([
            record['auc'] for record in self.performance_history[-window_size*2:-window_size]
        ])
        
        drift_magnitude = past_performance - recent_performance
        
        is_drift = drift_magnitude > self.drift_threshold
        
        return is_drift, f"劣化度: {drift_magnitude:.4f}"
    
    def plot_performance_history(self):
        """性能履歴の可視化"""
        if not self.performance_history:
            print("性能履歴がありません")
            return
        
        df_history = pd.DataFrame(self.performance_history)
        df_history['date'] = pd.to_datetime(df_history['date'])
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # AUC推移
        axes[0,0].plot(df_history['date'], df_history['auc'], 'b-', alpha=0.7)
        axes[0,0].set_title('AUC Score 推移')
        axes[0,0].set_ylabel('AUC')
        axes[0,0].grid(True)
        
        # 精度推移
        axes[0,1].plot(df_history['date'], df_history['accuracy'], 'g-', alpha=0.7)
        axes[0,1].set_title('Accuracy 推移')
        axes[0,1].set_ylabel('Accuracy')
        axes[0,1].grid(True)
        
        # F1スコア推移
        axes[1,0].plot(df_history['date'], df_history['f1'], 'r-', alpha=0.7)
        axes[1,0].set_title('F1 Score 推移')
        axes[1,0].set_ylabel('F1 Score')
        axes[1,0].grid(True)
        
        # サンプル数推移
        axes[1,1].plot(df_history['date'], df_history['n_samples'], 'purple', alpha=0.7)
        axes[1,1].set_title('サンプル数推移')
        axes[1,1].set_ylabel('Sample Count')
        axes[1,1].grid(True)
        
        plt.tight_layout()
        plt.show()
    
    def generate_report(self):
        """パフォーマンスレポート生成"""
        if not self.performance_history:
            return "データがありません"
        
        df_history = pd.DataFrame(self.performance_history)
        
        # 統計サマリー
        recent_avg = df_history.tail(10)['auc'].mean()
        overall_avg = df_history['auc'].mean()
        trend = "改善" if recent_avg > overall_avg else "悪化"
        
        # ドリフト検出
        is_drift, drift_msg = self.detect_performance_drift()
        
        report = f"""
=== モデル性能レポート ===
期間: {df_history['date'].min()} - {df_history['date'].max()}
評価回数: {len(self.performance_history)}

=== 性能指標 ===
全期間平均AUC: {overall_avg:.4f}
最新10回平均AUC: {recent_avg:.4f}
トレンド: {trend} ({recent_avg - overall_avg:+.4f})

=== ドリフト検出 ===
ドリフト検出: {'Yes' if is_drift else 'No'}
詳細: {drift_msg}

=== 推奨アクション ===
"""
        
        if is_drift:
            report += "- モデル再学習を検討\n- 特徴量の見直し\n- データ品質の確認"
        else:
            report += "- 現在のモデルは適切に機能\n- 定期モニタリング継続"
        
        return report

# 使用例
monitor = ModelPerformanceMonitor(
    model=RandomForestClassifier(n_estimators=100, random_state=42)
)

# サンプル性能データ
dates = pd.date_range('2024-01-01', periods=100, freq='D')
for date in dates:
    # ダミーデータ生成
    n_samples = np.random.randint(50, 200)
    y_true = np.random.binomial(1, 0.1, n_samples)
    y_pred = np.random.binomial(1, 0.12, n_samples)  # 若干の偏り
    y_pred_proba = np.random.uniform(0, 1, n_samples)
    
    monitor.add_performance_record(date, y_true, y_pred, y_pred_proba)

print(monitor.generate_report())
monitor.plot_performance_history()
```

## まとめ

本記事では、競馬予想における正確なモデル評価のためのクロスバリデーション手法を包括的に解説しました。

### 重要なポイント：

1. **データ特性の理解**:
   - 時系列依存性
   - グループ構造（レース単位）
   - クラス不均衡

2. **適切なCV手法の選択**:
   - 時系列データ: TimeSeriesSplit
   - グループ構造: GroupKFold
   - 不均衡データ: StratifiedKFold

3. **高度な評価技術**:
   - ネステッドクロスバリデーション
   - 学習・バリデーション曲線
   - 統計的有意性検定

4. **実用的評価指標**:
   - レース単位的中率
   - 回収率
   - 確率校正

5. **継続的モニタリング**:
   - 性能劣化の検出
   - ドリフト分析
   - 定期的な再評価

### 実践的ガイドライン：

- **データサイズ**: 1000サンプル以下なら5-fold、それ以上なら10-fold
- **計算時間**: 大規模データでは3-fold、精度重視なら10-fold
- **業務要件**: 実運用では時系列分割必須
- **統計的検定**: 複数モデル比較時は有意性検定実施

適切なクロスバリデーションにより、過学習を防ぎ、実際の予想精度により近い評価が可能になります。データの特性を理解し、目的に応じた評価手法を選択することが、信頼性の高い競馬予想モデル構築の鍵となります。

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "status": "completed", "content": "\u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u69cb\u9020\u3092\u78ba\u8a8d\u3057\u3066\u3001content/machine-learning/\u30c7\u30a3\u30ec\u30af\u30c8\u30ea\u306e\u5b58\u5728\u78ba\u8a8d"}, {"id": "2", "status": "completed", "content": "\u8a18\u4e8b1\uff1a\u300cPython\u3067\u59cb\u3081\u308b\u7af6\u99ac\u30c7\u30fc\u30bf\u5206\u6790 - pandas\u57fa\u790e\u304b\u3089XGBoost\u307e\u3067\u300d\u3092\u4f5c\u6210\uff08slug: python-horse-racing-data-analysis\uff09"}, {"id": "3", "status": "completed", "content": "\u8a18\u4e8b2\uff1a\u300c\u5357\u95a2\u7af6\u99ac\u30c7\u30fc\u30bf\u306e\u7279\u5fb4\u91cf\u8a2d\u8a08 - 50\u500b\u306e\u5909\u6570\u3067\u7cbe\u5ea6\u5411\u4e0a\u300d\u3092\u4f5c\u6210\uff08slug: nankan-feature-engineering\uff09"}, {"id": "4", "status": "completed", "content": "\u8a18\u4e8b3\uff1a\u300cscikit-learn\u3067\u7af6\u99ac\u4e88\u60f3\u30e2\u30c7\u30eb\u69cb\u7bc9 - \u521d\u5fc3\u8005\u5411\u3051\u5b8c\u5168\u30ac\u30a4\u30c9\u300d\u3092\u4f5c\u6210\uff08slug: scikit-learn-horse-prediction\uff09"}, {"id": "5", "status": "completed", "content": "\u8a18\u4e8b4\uff1a\u300c\u7af6\u99ac\u30c7\u30fc\u30bf\u306e\u524d\u51e6\u7406\u30c6\u30af\u30cb\u30c3\u30af - \u6b20\u640d\u5024\u304b\u3089\u5916\u308c\u5024\u307e\u3067\u300d\u3092\u4f5c\u6210\uff08slug: horse-data-preprocessing\uff09"}, {"id": "6", "status": "completed", "content": "\u8a18\u4e8b5\uff1a\u300c\u30af\u30ed\u30b9\u30d0\u30ea\u30c7\u30fc\u30b7\u30e7\u30f3\u3067\u4e88\u60f3\u7cbe\u5ea6\u3092\u6b63\u3057\u304f\u8a55\u4fa1\u3059\u308b\u65b9\u6cd5\u300d\u3092\u4f5c\u6210\uff08slug: cross-validation-horse-prediction\uff09"}]