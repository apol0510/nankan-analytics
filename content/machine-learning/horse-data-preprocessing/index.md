---
title: "競馬データの前処理テクニック - 欠損値から外れ値まで"
date: 2025-08-07T12:00:00+09:00
description: "競馬データ分析における前処理の重要技術を徹底解説。欠損値処理、外れ値検出、データ変換、スケーリングまで、実践的なテクニックを豊富なコード例とともに紹介します。"
categories: ["データサイエンス", "前処理"]
tags: ["データ前処理", "欠損値", "外れ値", "競馬データ", "Python", "pandas"]
slug: "horse-data-preprocessing"
---

## はじめに

データ分析において、前処理は成功の80%を決定すると言われます。競馬データは特に複雑で、欠損値、外れ値、不整合なデータが多く含まれます。本記事では、競馬データに特化した前処理テクニックを体系的に解説します。

## 競馬データの特徴と課題

競馬データには以下のような特徴的な課題があります：

- **欠損値の多様性**: レース中止、出走取消、未計測データ
- **外れ値の存在**: 異常なオッズ、計測エラー
- **データ型の混在**: 数値、カテゴリ、時系列データ
- **不整合**: 同一レースでの矛盾するデータ
- **スケールの違い**: オッズ（1-1000）、体重（400-600kg）

## 環境準備とライブラリ

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# 統計・検定
from scipy import stats
from scipy.stats import zscore

# 前処理用ライブラリ
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.model_selection import train_test_split

# 可視化設定
plt.rcParams['figure.figsize'] = (12, 8)
sns.set_style("whitegrid")

print("ライブラリ準備完了")
```

## サンプルデータの作成

```python
# リアルな競馬データのサンプルを作成
np.random.seed(42)
n_races = 2000
n_horses_per_race = 12

data = []
for race_id in range(n_races):
    race_date = datetime(2020, 1, 1) + timedelta(days=np.random.randint(0, 1460))
    track_name = np.random.choice(['東京', '中山', '阪神', '京都', '中京', '新潟'], 
                                 p=[0.2, 0.15, 0.2, 0.15, 0.15, 0.15])
    distance = np.random.choice([1200, 1400, 1600, 1800, 2000, 2400])
    track_condition = np.random.choice(['良', '稍重', '重', '不良'], p=[0.7, 0.2, 0.07, 0.03])
    weather = np.random.choice(['晴', '曇', '小雨', '雨'], p=[0.5, 0.3, 0.15, 0.05])
    
    for horse_pos in range(n_horses_per_race):
        popularity = horse_pos + 1
        
        # 意図的に欠損値と外れ値を含むデータを生成
        data.append({
            'race_id': race_id,
            'race_date': race_date,
            'track_name': track_name,
            'distance': distance,
            'track_condition': track_condition,
            'weather': weather,
            'horse_id': f'H{race_id:04d}{horse_pos:02d}',
            'horse_name': f'Horse_{race_id}_{horse_pos}',
            'jockey_name': f'Jockey_{np.random.randint(1, 200)}',
            'trainer_name': f'Trainer_{np.random.randint(1, 100)}',
            'popularity': popularity,
            'odds': np.random.lognormal(np.log(1.5 + popularity * 2), 0.5),
            'weight': np.random.normal(480, 30) if np.random.random() > 0.05 else np.nan,  # 5%の欠損
            'weight_change': np.random.randint(-15, 16) if np.random.random() > 0.1 else np.nan,  # 10%の欠損
            'age': np.random.randint(3, 8),
            'sex': np.random.choice(['牡', '牝', 'セ'], p=[0.5, 0.4, 0.1]),
            'finish_time': 60 + distance/20 + np.random.normal(0, 3) if np.random.random() > 0.02 else np.nan,  # 2%の欠損
            'finish_position': np.random.randint(1, n_horses_per_race + 1),
            'prize_money': np.random.exponential(50000) if np.random.random() > 0.3 else 0,
            'corner_pos_1': np.random.randint(1, n_horses_per_race + 1) if np.random.random() > 0.15 else np.nan,
            'corner_pos_2': np.random.randint(1, n_horses_per_race + 1) if np.random.random() > 0.15 else np.nan,
            'corner_pos_3': np.random.randint(1, n_horses_per_race + 1) if np.random.random() > 0.15 else np.nan,
            'corner_pos_4': np.random.randint(1, n_horses_per_race + 1) if np.random.random() > 0.15 else np.nan,
        })

# 意図的に外れ値を追加
for i in range(50):  # 50個の外れ値
    idx = np.random.randint(0, len(data))
    data[idx]['odds'] = np.random.uniform(500, 1000)  # 異常に高いオッズ
    data[idx]['weight'] = np.random.uniform(350, 650)  # 異常な体重
    
for i in range(30):  # 30個の異常データ
    idx = np.random.randint(0, len(data))
    data[idx]['finish_time'] = np.random.uniform(10, 300)  # 異常なタイム

df = pd.DataFrame(data)
df['race_date'] = pd.to_datetime(df['race_date'])

print(f"データサイズ: {df.shape}")
print("\nデータの基本情報:")
print(df.info())
```

## 1. 欠損値の理解と可視化

### 欠損値パターンの分析

```python
def analyze_missing_data(df):
    """欠損値の包括的分析"""
    
    # 欠損値の基本統計
    missing_stats = pd.DataFrame({
        'column': df.columns,
        'missing_count': df.isnull().sum(),
        'missing_percentage': (df.isnull().sum() / len(df)) * 100,
        'data_type': df.dtypes
    }).sort_values('missing_percentage', ascending=False)
    
    print("=== 欠損値統計 ===")
    print(missing_stats[missing_stats['missing_count'] > 0])
    
    # 欠損値パターンの可視化
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. 欠損値ヒートマップ
    missing_matrix = df.isnull()
    sns.heatmap(missing_matrix.iloc[:, missing_matrix.sum() > 0], 
                cmap='viridis', cbar=True, ax=axes[0,0])
    axes[0,0].set_title('欠損値分布パターン')
    
    # 2. 欠損値の割合
    missing_cols = missing_stats[missing_stats['missing_count'] > 0]
    axes[0,1].barh(missing_cols['column'], missing_cols['missing_percentage'])
    axes[0,1].set_xlabel('欠損率 (%)')
    axes[0,1].set_title('列別欠損率')
    
    # 3. 欠損値の共起パターン
    missing_combinations = df.isnull().groupby(df.columns.tolist()).size()
    top_combinations = missing_combinations.sort_values(ascending=False).head(10)
    
    axes[1,0].bar(range(len(top_combinations)), top_combinations.values)
    axes[1,0].set_title('欠損値パターンの頻度')
    axes[1,0].set_xlabel('パターン')
    axes[1,0].set_ylabel('頻度')
    
    # 4. 欠損値の時系列パターン
    if 'race_date' in df.columns:
        daily_missing = df.groupby(df['race_date'].dt.date)['weight'].isnull().mean()
        daily_missing.plot(ax=axes[1,1])
        axes[1,1].set_title('体重欠損値の時系列変化')
        axes[1,1].set_ylabel('欠損率')
    
    plt.tight_layout()
    plt.show()
    
    return missing_stats

missing_analysis = analyze_missing_data(df)
```

### 欠損値のメカニズム分析

```python
def analyze_missing_mechanism(df):
    """欠損値のメカニズム（MCAR, MAR, NMAR）を分析"""
    
    print("=== 欠損値メカニズム分析 ===")
    
    # 1. 体重欠損と他の変数との関係
    print("1. 体重欠損と他の変数:")
    weight_missing = df['weight'].isnull()
    
    # 競馬場別の体重欠損率
    track_missing = df.groupby('track_name')['weight'].apply(lambda x: x.isnull().mean())
    print("競馬場別体重欠損率:")
    print(track_missing.sort_values(ascending=False))
    
    # 人気と体重欠損の関係
    popularity_missing = df.groupby(pd.cut(df['popularity'], bins=5))['weight'].apply(
        lambda x: x.isnull().mean()
    )
    print("\n人気帯別体重欠損率:")
    print(popularity_missing)
    
    # 2. コーナー通過順欠損パターン
    corner_cols = ['corner_pos_1', 'corner_pos_2', 'corner_pos_3', 'corner_pos_4']
    corner_missing = df[corner_cols].isnull().sum()
    
    print("\n2. コーナー通過順欠損:")
    print(corner_missing)
    
    # 3. 統計的検定（カイ二乗検定）
    from scipy.stats import chi2_contingency
    
    # 体重欠損と競馬場の独立性検定
    contingency_table = pd.crosstab(df['track_name'], weight_missing)
    chi2, p_value, dof, expected = chi2_contingency(contingency_table)
    
    print(f"\n3. 体重欠損と競馬場の独立性検定:")
    print(f"カイ二乗統計量: {chi2:.4f}")
    print(f"p値: {p_value:.4f}")
    print(f"判定: {'従属関係あり' if p_value < 0.05 else '独立'}")

analyze_missing_mechanism(df)
```

## 2. 欠損値処理の実装

### 基本的な欠損値処理

```python
def basic_missing_imputation(df):
    """基本的な欠損値補完手法"""
    
    df_imputed = df.copy()
    
    print("=== 基本的な欠損値処理 ===")
    
    # 1. 平均値補完
    df_imputed['weight_mean'] = df_imputed['weight'].fillna(df_imputed['weight'].mean())
    print(f"体重平均値: {df_imputed['weight'].mean():.1f}kg")
    
    # 2. 中央値補完
    df_imputed['weight_median'] = df_imputed['weight'].fillna(df_imputed['weight'].median())
    print(f"体重中央値: {df_imputed['weight'].median():.1f}kg")
    
    # 3. 最頻値補完
    df_imputed['weight_mode'] = df_imputed['weight'].fillna(df_imputed['weight'].mode()[0])
    
    # 4. 前後の値で補完
    df_imputed = df_imputed.sort_values(['race_date', 'race_id'])
    df_imputed['weight_ffill'] = df_imputed['weight'].fillna(method='ffill')
    df_imputed['weight_bfill'] = df_imputed['weight'].fillna(method='bfill')
    
    # 5. ゼロ補完
    df_imputed['weight_change_zero'] = df_imputed['weight_change'].fillna(0)
    
    # 6. カテゴリカル変数の補完
    df_imputed['weather'] = df_imputed['weather'].fillna(df_imputed['weather'].mode()[0])
    
    return df_imputed

df_basic = basic_missing_imputation(df)
print("基本的な欠損値処理完了")
```

### 高度な欠損値処理

```python
def advanced_missing_imputation(df):
    """高度な欠損値補完手法"""
    
    df_advanced = df.copy()
    
    print("=== 高度な欠損値処理 ===")
    
    # 1. グループ別補完
    # 競馬場・距離別の体重平均で補完
    df_advanced['weight_group'] = df_advanced.groupby(['track_name', 'distance'])['weight'].transform(
        lambda x: x.fillna(x.mean())
    )
    
    # 年齢・性別別の体重平均で補完
    df_advanced['weight_age_sex'] = df_advanced.groupby(['age', 'sex'])['weight'].transform(
        lambda x: x.fillna(x.mean())
    )
    
    # 2. 回帰補完
    from sklearn.linear_model import LinearRegression
    
    # 体重を予測するための特徴量
    weight_features = ['age', 'distance', 'popularity']
    
    # 体重が欠損していないデータで学習
    complete_weight = df_advanced[df_advanced['weight'].notna()]
    missing_weight = df_advanced[df_advanced['weight'].isna()]
    
    if len(missing_weight) > 0 and len(complete_weight) > 0:
        # ラベルエンコーディング
        le_sex = LabelEncoder()
        le_track = LabelEncoder()
        
        complete_weight_encoded = complete_weight.copy()
        complete_weight_encoded['sex_encoded'] = le_sex.fit_transform(complete_weight['sex'])
        complete_weight_encoded['track_encoded'] = le_track.fit_transform(complete_weight['track_name'])
        
        # 回帰モデルの学習
        reg_features = weight_features + ['sex_encoded', 'track_encoded']
        reg_model = LinearRegression()
        reg_model.fit(complete_weight_encoded[reg_features], complete_weight_encoded['weight'])
        
        # 欠損値の予測
        missing_weight_encoded = missing_weight.copy()
        missing_weight_encoded['sex_encoded'] = le_sex.transform(missing_weight['sex'])
        missing_weight_encoded['track_encoded'] = le_track.transform(missing_weight['track_name'])
        
        predicted_weights = reg_model.predict(missing_weight_encoded[reg_features])
        df_advanced.loc[df_advanced['weight'].isna(), 'weight_regression'] = predicted_weights
    
    # 3. KNN補完
    from sklearn.impute import KNNImputer
    
    # 数値特徴量のみでKNN補完
    numeric_cols = ['age', 'popularity', 'odds', 'distance']
    knn_imputer = KNNImputer(n_neighbors=5)
    
    # 欠損のある列を含めてKNN補完
    knn_data = df_advanced[numeric_cols + ['weight', 'weight_change']].copy()
    knn_imputed = knn_imputer.fit_transform(knn_data)
    
    df_advanced['weight_knn'] = knn_imputed[:, -2]  # weight
    df_advanced['weight_change_knn'] = knn_imputed[:, -1]  # weight_change
    
    print("高度な欠損値処理完了")
    return df_advanced

df_advanced = advanced_missing_imputation(df)
```

### 欠損値処理手法の比較

```python
def compare_imputation_methods(df_basic, df_advanced):
    """各種補完手法の比較"""
    
    # 実際の体重がある部分での比較
    has_weight = df['weight'].notna()
    actual_weights = df.loc[has_weight, 'weight']
    
    imputation_methods = [
        ('平均値', df_basic.loc[has_weight, 'weight_mean']),
        ('中央値', df_basic.loc[has_weight, 'weight_median']),
        ('グループ別', df_advanced.loc[has_weight, 'weight_group']),
        ('KNN', df_advanced.loc[has_weight, 'weight_knn'])
    ]
    
    print("=== 補完手法の比較 ===")
    print(f"{'手法':<10} {'MAE':<8} {'RMSE':<8} {'相関係数':<8}")
    print("-" * 40)
    
    for method_name, imputed_values in imputation_methods:
        # NaNを除外してメトリクスを計算
        mask = ~np.isnan(imputed_values)
        if mask.sum() > 0:
            actual_clean = actual_weights[mask]
            imputed_clean = imputed_values[mask]
            
            mae = np.mean(np.abs(actual_clean - imputed_clean))
            rmse = np.sqrt(np.mean((actual_clean - imputed_clean) ** 2))
            correlation = np.corrcoef(actual_clean, imputed_clean)[0, 1]
            
            print(f"{method_name:<10} {mae:<8.2f} {rmse:<8.2f} {correlation:<8.3f}")
    
    # 可視化
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    
    for i, (method_name, imputed_values) in enumerate(imputation_methods):
        row, col = i // 2, i % 2
        
        # 散布図
        mask = ~np.isnan(imputed_values)
        axes[row, col].scatter(actual_weights[mask], imputed_values[mask], alpha=0.6)
        axes[row, col].plot([400, 600], [400, 600], 'r--', alpha=0.8)
        axes[row, col].set_xlabel('実際の体重')
        axes[row, col].set_ylabel('補完後の体重')
        axes[row, col].set_title(f'{method_name}補完')
    
    plt.tight_layout()
    plt.show()

compare_imputation_methods(df_basic, df_advanced)
```

## 3. 外れ値検出と処理

### 統計的手法による外れ値検出

```python
def detect_outliers_statistical(df):
    """統計的手法による外れ値検出"""
    
    df_outliers = df.copy()
    
    print("=== 統計的外れ値検出 ===")
    
    # 1. Z-score法
    numeric_cols = ['weight', 'odds', 'finish_time', 'prize_money']
    
    for col in numeric_cols:
        if col in df.columns and df[col].notna().sum() > 0:
            z_scores = np.abs(zscore(df[col].dropna()))
            outlier_threshold = 3
            
            # 外れ値のインデックス
            outlier_idx = df[col].dropna()[z_scores > outlier_threshold].index
            df_outliers[f'{col}_zscore_outlier'] = df.index.isin(outlier_idx)
            
            outlier_count = len(outlier_idx)
            outlier_rate = outlier_count / len(df) * 100
            
            print(f"{col}: {outlier_count}個 ({outlier_rate:.1f}%)")
    
    # 2. IQR法（四分位範囲）
    for col in numeric_cols:
        if col in df.columns and df[col].notna().sum() > 0:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
            df_outliers[f'{col}_iqr_outlier'] = outlier_mask
            
            outlier_count = outlier_mask.sum()
            outlier_rate = outlier_count / len(df) * 100
            
            print(f"{col} (IQR): {outlier_count}個 ({outlier_rate:.1f}%)")
    
    # 3. Modified Z-score（ロバストな手法）
    from scipy.stats import median_abs_deviation
    
    for col in numeric_cols:
        if col in df.columns and df[col].notna().sum() > 0:
            median = df[col].median()
            mad = median_abs_deviation(df[col].dropna())
            
            modified_z_scores = 0.6745 * (df[col] - median) / mad
            outlier_mask = np.abs(modified_z_scores) > 3.5
            
            df_outliers[f'{col}_modified_z_outlier'] = outlier_mask
            
            outlier_count = outlier_mask.sum()
            outlier_rate = outlier_count / len(df) * 100
            
            print(f"{col} (Modified Z): {outlier_count}個 ({outlier_rate:.1f}%)")
    
    return df_outliers

df_outliers = detect_outliers_statistical(df_advanced)
```

### 機械学習による外れ値検出

```python
def detect_outliers_ml(df):
    """機械学習による外れ値検出"""
    
    print("\n=== 機械学習による外れ値検出 ===")
    
    # 数値特徴量の選択と前処理
    numeric_features = ['age', 'popularity', 'odds', 'weight', 'distance']
    ml_data = df[numeric_features].dropna()
    
    # 標準化
    scaler = StandardScaler()
    ml_data_scaled = scaler.fit_transform(ml_data)
    
    # 1. Isolation Forest
    from sklearn.ensemble import IsolationForest
    
    iso_forest = IsolationForest(contamination=0.05, random_state=42)
    outlier_labels_iso = iso_forest.fit_predict(ml_data_scaled)
    
    outlier_count_iso = (outlier_labels_iso == -1).sum()
    print(f"Isolation Forest: {outlier_count_iso}個の外れ値")
    
    # 2. One-Class SVM
    from sklearn.svm import OneClassSVM
    
    oc_svm = OneClassSVM(gamma='scale', nu=0.05)
    outlier_labels_svm = oc_svm.fit_predict(ml_data_scaled)
    
    outlier_count_svm = (outlier_labels_svm == -1).sum()
    print(f"One-Class SVM: {outlier_count_svm}個の外れ値")
    
    # 3. Local Outlier Factor
    from sklearn.neighbors import LocalOutlierFactor
    
    lof = LocalOutlierFactor(n_neighbors=20, contamination=0.05)
    outlier_labels_lof = lof.fit_predict(ml_data_scaled)
    
    outlier_count_lof = (outlier_labels_lof == -1).sum()
    print(f"Local Outlier Factor: {outlier_count_lof}個の外れ値")
    
    # 結果をデータフレームに統合
    ml_outliers = pd.DataFrame({
        'isolation_forest': outlier_labels_iso,
        'one_class_svm': outlier_labels_svm,
        'local_outlier_factor': outlier_labels_lof
    }, index=ml_data.index)
    
    # アンサンブル的外れ値検出（2つ以上の手法で外れ値と判定）
    ml_outliers['ensemble_outlier'] = (
        (ml_outliers == -1).sum(axis=1) >= 2
    ).astype(int)
    
    ensemble_outlier_count = ml_outliers['ensemble_outlier'].sum()
    print(f"アンサンブル外れ値: {ensemble_outlier_count}個")
    
    return ml_outliers, ml_data

ml_outliers, ml_data = detect_outliers_ml(df_advanced)
```

### 外れ値の可視化

```python
def visualize_outliers(df, ml_outliers, ml_data):
    """外れ値の可視化"""
    
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    
    # 1. オッズの分布
    axes[0, 0].hist(df['odds'], bins=50, alpha=0.7, edgecolor='black')
    axes[0, 0].axvline(df['odds'].quantile(0.95), color='red', linestyle='--', 
                      label='95%ile')
    axes[0, 0].set_xlabel('オッズ')
    axes[0, 0].set_ylabel('頻度')
    axes[0, 0].set_title('オッズ分布')
    axes[0, 0].legend()
    
    # 2. 体重の分布
    axes[0, 1].hist(df['weight'].dropna(), bins=50, alpha=0.7, edgecolor='black')
    Q1 = df['weight'].quantile(0.25)
    Q3 = df['weight'].quantile(0.75)
    IQR = Q3 - Q1
    axes[0, 1].axvline(Q1 - 1.5 * IQR, color='red', linestyle='--', label='IQR下限')
    axes[0, 1].axvline(Q3 + 1.5 * IQR, color='red', linestyle='--', label='IQR上限')
    axes[0, 1].set_xlabel('体重 (kg)')
    axes[0, 1].set_ylabel('頻度')
    axes[0, 1].set_title('体重分布')
    axes[0, 1].legend()
    
    # 3. ボックスプロット
    df[['odds', 'weight', 'finish_time']].plot(kind='box', ax=axes[0, 2])
    axes[0, 2].set_title('数値変数のボックスプロット')
    
    # 4-6. 機械学習による外れ値の可視化
    ml_methods = ['isolation_forest', 'one_class_svm', 'local_outlier_factor']
    
    for i, method in enumerate(ml_methods):
        ax = axes[1, i]
        
        # 正常点と外れ値を色分け
        normal_points = ml_data[ml_outliers[method] == 1]
        outlier_points = ml_data[ml_outliers[method] == -1]
        
        ax.scatter(normal_points['odds'], normal_points['weight'], 
                  c='blue', alpha=0.6, label='正常', s=20)
        ax.scatter(outlier_points['odds'], outlier_points['weight'], 
                  c='red', alpha=0.8, label='外れ値', s=30)
        
        ax.set_xlabel('オッズ')
        ax.set_ylabel('体重')
        ax.set_title(f'{method.replace("_", " ").title()}')
        ax.legend()
    
    plt.tight_layout()
    plt.show()

visualize_outliers(df_advanced, ml_outliers, ml_data)
```

### 外れ値の処理

```python
def handle_outliers(df, ml_outliers):
    """外れ値の処理"""
    
    df_processed = df.copy()
    
    print("=== 外れ値処理 ===")
    
    # 1. 上下限値でクリッピング
    numeric_cols = ['odds', 'weight', 'finish_time']
    
    for col in numeric_cols:
        if col in df.columns and df[col].notna().sum() > 0:
            Q1 = df[col].quantile(0.01)  # 1%tile
            Q99 = df[col].quantile(0.99)  # 99%tile
            
            original_range = df[col].max() - df[col].min()
            clipped_count = ((df[col] < Q1) | (df[col] > Q99)).sum()
            
            df_processed[f'{col}_clipped'] = df[col].clip(lower=Q1, upper=Q99)
            
            print(f"{col}: {clipped_count}個をクリッピング ({Q1:.1f}-{Q99:.1f})")
    
    # 2. 変換による外れ値の影響軽減
    # 対数変換
    df_processed['odds_log'] = np.log1p(df['odds'])  # log(1+x)
    df_processed['prize_money_log'] = np.log1p(df['prize_money'])
    
    # 平方根変換
    df_processed['odds_sqrt'] = np.sqrt(df['odds'])
    
    # Box-Cox変換
    from scipy.stats import boxcox
    
    positive_odds = df['odds'][df['odds'] > 0]
    if len(positive_odds) > 0:
        odds_boxcox, lambda_param = boxcox(positive_odds)
        print(f"Box-Cox λ parameter: {lambda_param:.3f}")
    
    # 3. ランク変換（順位に変換）
    df_processed['odds_rank'] = df['odds'].rank(pct=True)  # パーセンタイルランク
    df_processed['weight_rank'] = df['weight'].rank(pct=True)
    
    # 4. 外れ値の除外（機械学習結果を使用）
    if 'ensemble_outlier' in ml_outliers.columns:
        outlier_mask = ml_outliers['ensemble_outlier'] == 1
        outlier_indices = ml_data.index[outlier_mask]
        
        df_processed['is_outlier'] = df.index.isin(outlier_indices)
        df_cleaned = df_processed[~df_processed['is_outlier']].copy()
        
        print(f"外れ値除外: {outlier_mask.sum()}行を除外")
        print(f"残りデータ: {len(df_cleaned)}行")
    else:
        df_cleaned = df_processed.copy()
    
    return df_processed, df_cleaned

df_processed, df_cleaned = handle_outliers(df_advanced, ml_outliers)
```

## 4. データ変換とスケーリング

### 分布の正規化

```python
def normalize_distributions(df):
    """分布の正規化"""
    
    df_normalized = df.copy()
    
    print("=== 分布正規化 ===")
    
    # 1. 歪度の確認
    numeric_cols = ['odds', 'weight', 'prize_money', 'finish_time']
    
    print("変換前の歪度:")
    for col in numeric_cols:
        if col in df.columns and df[col].notna().sum() > 10:
            skewness = stats.skew(df[col].dropna())
            print(f"{col}: {skewness:.3f}")
    
    # 2. 対数変換
    df_normalized['odds_log_norm'] = np.log1p(df['odds'])
    df_normalized['prize_money_log_norm'] = np.log1p(df['prize_money'])
    
    # 3. 平方根変換
    df_normalized['odds_sqrt_norm'] = np.sqrt(df['odds'])
    
    # 4. Yeo-Johnson変換（負の値も扱える）
    from scipy.stats import yeojohnson
    
    for col in ['odds', 'weight_change']:
        if col in df.columns and df[col].notna().sum() > 10:
            transformed_data, lambda_param = yeojohnson(df[col].dropna())
            df_normalized[f'{col}_yeo_johnson'] = np.nan
            df_normalized.loc[df[col].notna(), f'{col}_yeo_johnson'] = transformed_data
            print(f"{col} Yeo-Johnson λ: {lambda_param:.3f}")
    
    # 変換後の歪度確認
    print("\n変換後の歪度:")
    transform_cols = ['odds_log_norm', 'odds_sqrt_norm', 'odds_yeo_johnson']
    for col in transform_cols:
        if col in df_normalized.columns:
            skewness = stats.skew(df_normalized[col].dropna())
            print(f"{col}: {skewness:.3f}")
    
    # 可視化
    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    
    # 原データ
    axes[0, 0].hist(df['odds'], bins=50, alpha=0.7, edgecolor='black')
    axes[0, 0].set_title('原データ（オッズ）')
    axes[0, 0].set_ylabel('頻度')
    
    # 対数変換
    axes[0, 1].hist(df_normalized['odds_log_norm'], bins=50, alpha=0.7, edgecolor='black')
    axes[0, 1].set_title('対数変換')
    
    # 平方根変換
    axes[0, 2].hist(df_normalized['odds_sqrt_norm'], bins=50, alpha=0.7, edgecolor='black')
    axes[0, 2].set_title('平方根変換')
    
    # Q-Qプロット
    from scipy.stats import probplot
    
    probplot(df['odds'], dist="norm", plot=axes[1, 0])
    axes[1, 0].set_title('Q-Q Plot (原データ)')
    
    probplot(df_normalized['odds_log_norm'], dist="norm", plot=axes[1, 1])
    axes[1, 1].set_title('Q-Q Plot (対数変換)')
    
    probplot(df_normalized['odds_sqrt_norm'], dist="norm", plot=axes[1, 2])
    axes[1, 2].set_title('Q-Q Plot (平方根変換)')
    
    plt.tight_layout()
    plt.show()
    
    return df_normalized

df_normalized = normalize_distributions(df_cleaned)
```

### スケーリング手法の比較

```python
def compare_scaling_methods(df):
    """各種スケーリング手法の比較"""
    
    print("=== スケーリング手法比較 ===")
    
    # 数値特徴量
    numeric_features = ['age', 'popularity', 'odds', 'weight', 'distance']
    data_for_scaling = df[numeric_features].dropna()
    
    # 各種スケーラー
    scalers = {
        'StandardScaler': StandardScaler(),
        'MinMaxScaler': MinMaxScaler(),
        'RobustScaler': RobustScaler(),
        'MaxAbsScaler': MaxAbsScaler(),
        'QuantileTransformer': QuantileTransformer(),
        'PowerTransformer': PowerTransformer(method='yeo-johnson')
    }
    
    scaled_data = {}
    
    for scaler_name, scaler in scalers.items():
        try:
            scaled_data[scaler_name] = scaler.fit_transform(data_for_scaling)
            print(f"{scaler_name}: 成功")
        except Exception as e:
            print(f"{scaler_name}: エラー - {e}")
    
    # 可視化
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    axes = axes.ravel()
    
    for i, (scaler_name, scaled_values) in enumerate(scaled_data.items()):
        ax = axes[i]
        
        # オッズのスケーリング結果（特徴量のインデックス2）
        ax.hist(scaled_values[:, 2], bins=30, alpha=0.7, edgecolor='black')
        ax.set_title(f'{scaler_name} (オッズ)')
        ax.set_xlabel('スケーリング後の値')
        ax.set_ylabel('頻度')
        
        # 統計量を表示
        mean_val = np.mean(scaled_values[:, 2])
        std_val = np.std(scaled_values[:, 2])
        ax.text(0.02, 0.98, f'μ={mean_val:.2f}\nσ={std_val:.2f}', 
                transform=ax.transAxes, verticalalignment='top',
                bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
    
    plt.tight_layout()
    plt.show()
    
    # スケーリング前後の統計量比較
    print("\n=== スケーリング前後の統計量 ===")
    original_stats = data_for_scaling.describe()
    print("スケーリング前:")
    print(original_stats.loc[['mean', 'std', 'min', 'max']])
    
    for scaler_name, scaled_values in list(scaled_data.items())[:3]:  # 上位3つのみ表示
        scaled_df = pd.DataFrame(scaled_values, columns=numeric_features)
        scaled_stats = scaled_df.describe()
        print(f"\n{scaler_name}後:")
        print(scaled_stats.loc[['mean', 'std', 'min', 'max']])
    
    return scaled_data

from sklearn.preprocessing import MaxAbsScaler, QuantileTransformer, PowerTransformer

scaled_results = compare_scaling_methods(df_normalized)
```

### カテゴリカル変数の前処理

```python
def preprocess_categorical_variables(df):
    """カテゴリカル変数の前処理"""
    
    df_categorical = df.copy()
    
    print("=== カテゴリカル変数の前処理 ===")
    
    # カテゴリカル変数の特定
    categorical_cols = df.select_dtypes(include=['object']).columns
    print(f"カテゴリカル変数: {list(categorical_cols)}")
    
    # 1. ラベルエンコーディング
    label_encoders = {}
    for col in categorical_cols:
        if col not in ['race_date']:  # 日付以外
            le = LabelEncoder()
            df_categorical[f'{col}_label'] = le.fit_transform(df_categorical[col].astype(str))
            label_encoders[col] = le
            
            print(f"{col}: {len(le.classes_)}カテゴリ")
    
    # 2. ワンホットエンコーディング
    onehot_cols = ['sex', 'weather', 'track_condition']
    df_onehot = pd.get_dummies(df_categorical[onehot_cols], 
                              prefix=onehot_cols, 
                              prefix_sep='_')
    
    df_categorical = pd.concat([df_categorical, df_onehot], axis=1)
    
    print(f"ワンホットエンコーディング後の特徴量数: {df_onehot.shape[1]}")
    
    # 3. 頻度エンコーディング
    for col in ['jockey_name', 'trainer_name']:
        if col in df_categorical.columns:
            freq_encoding = df_categorical[col].value_counts().to_dict()
            df_categorical[f'{col}_freq'] = df_categorical[col].map(freq_encoding)
    
    # 4. ターゲットエンコーディング（簡易版）
    target = 'finish_position'
    if target in df_categorical.columns:
        for col in ['jockey_name', 'trainer_name']:
            if col in df_categorical.columns:
                target_mean = df_categorical.groupby(col)[target].mean()
                df_categorical[f'{col}_target'] = df_categorical[col].map(target_mean)
    
    # 5. 高カーディナリティ対策
    high_cardinality_cols = []
    for col in categorical_cols:
        if col in df_categorical.columns:
            n_unique = df_categorical[col].nunique()
            if n_unique > 50:  # 50カテゴリ以上
                high_cardinality_cols.append(col)
                
                # 頻度による上位カテゴリの選択
                top_categories = df_categorical[col].value_counts().head(20).index
                df_categorical[f'{col}_top20'] = df_categorical[col].apply(
                    lambda x: x if x in top_categories else 'Other'
                )
    
    if high_cardinality_cols:
        print(f"高カーディナリティ変数: {high_cardinality_cols}")
    
    return df_categorical, label_encoders

df_categorical, label_encoders = preprocess_categorical_variables(df_normalized)
```

## 5. データ品質の検証

```python
def validate_data_quality(df_original, df_processed):
    """データ品質の検証"""
    
    print("=== データ品質検証 ===")
    
    # 1. 基本統計量の比較
    numeric_cols = ['age', 'weight', 'odds', 'popularity']
    
    print("1. 基本統計量の変化:")
    for col in numeric_cols:
        if col in df_original.columns and col in df_processed.columns:
            orig_mean = df_original[col].mean()
            proc_mean = df_processed[col].mean()
            
            orig_std = df_original[col].std()
            proc_std = df_processed[col].std()
            
            print(f"{col}:")
            print(f"  平均: {orig_mean:.2f} → {proc_mean:.2f}")
            print(f"  標準偏差: {orig_std:.2f} → {proc_std:.2f}")
    
    # 2. 欠損値の変化
    print("\n2. 欠損値の変化:")
    orig_missing = df_original.isnull().sum().sum()
    proc_missing = df_processed.isnull().sum().sum()
    
    print(f"総欠損値: {orig_missing} → {proc_missing}")
    
    # 3. 外れ値の変化（IQRベース）
    print("\n3. 外れ値の変化:")
    for col in ['odds', 'weight']:
        if col in df_original.columns and col in df_processed.columns:
            # オリジナル
            Q1_orig = df_original[col].quantile(0.25)
            Q3_orig = df_original[col].quantile(0.75)
            IQR_orig = Q3_orig - Q1_orig
            outliers_orig = ((df_original[col] < Q1_orig - 1.5 * IQR_orig) | 
                           (df_original[col] > Q3_orig + 1.5 * IQR_orig)).sum()
            
            # 処理後
            Q1_proc = df_processed[col].quantile(0.25)
            Q3_proc = df_processed[col].quantile(0.75)
            IQR_proc = Q3_proc - Q1_proc
            outliers_proc = ((df_processed[col] < Q1_proc - 1.5 * IQR_proc) | 
                           (df_processed[col] > Q3_proc + 1.5 * IQR_proc)).sum()
            
            print(f"{col}外れ値: {outliers_orig} → {outliers_proc}")
    
    # 4. データの整合性チェック
    print("\n4. データ整合性:")
    
    # 年齢の範囲チェック
    age_issues = (df_processed['age'] < 2) | (df_processed['age'] > 10)
    print(f"異常な年齢: {age_issues.sum()}個")
    
    # 着順の範囲チェック
    if 'finish_position' in df_processed.columns:
        finish_issues = (df_processed['finish_position'] < 1) | (df_processed['finish_position'] > 20)
        print(f"異常な着順: {finish_issues.sum()}個")
    
    # 重複レコードチェック
    duplicates = df_processed.duplicated().sum()
    print(f"重複レコード: {duplicates}個")
    
    # 5. 可視化による検証
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    
    # 体重分布の比較
    axes[0, 0].hist(df_original['weight'].dropna(), alpha=0.5, label='オリジナル', bins=30)
    axes[0, 0].hist(df_processed['weight'].dropna(), alpha=0.5, label='処理後', bins=30)
    axes[0, 0].set_title('体重分布の比較')
    axes[0, 0].legend()
    
    # オッズ分布の比較（対数スケール）
    axes[0, 1].hist(np.log(df_original['odds']), alpha=0.5, label='オリジナル', bins=30)
    axes[0, 1].hist(np.log(df_processed['odds']), alpha=0.5, label='処理後', bins=30)
    axes[0, 1].set_title('オッズ分布の比較（対数）')
    axes[0, 1].legend()
    
    # 相関行列の比較
    orig_corr = df_original[numeric_cols].corr()
    proc_corr = df_processed[numeric_cols].corr()
    
    im1 = axes[1, 0].imshow(orig_corr, cmap='coolwarm', vmin=-1, vmax=1)
    axes[1, 0].set_title('オリジナル相関行列')
    
    im2 = axes[1, 1].imshow(proc_corr, cmap='coolwarm', vmin=-1, vmax=1)
    axes[1, 1].set_title('処理後相関行列')
    
    plt.tight_layout()
    plt.show()

validate_data_quality(df, df_categorical)
```

## 6. 前処理パイプラインの構築

```python
class HorseDataPreprocessor:
    """競馬データ前処理パイプライン"""
    
    def __init__(self):
        self.scalers = {}
        self.encoders = {}
        self.imputers = {}
        self.outlier_bounds = {}
        self.is_fitted = False
    
    def fit(self, df):
        """前処理パラメータの学習"""
        
        self.df_fit = df.copy()
        
        # 1. 欠損値処理の準備
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df[col].isnull().sum() > 0:
                # グループ別中央値による補完
                if col == 'weight':
                    group_medians = df.groupby(['age', 'sex'])[col].median()
                    self.imputers[col] = ('group_median', group_medians)
                else:
                    median_value = df[col].median()
                    self.imputers[col] = ('median', median_value)
        
        # 2. 外れ値の境界値計算
        for col in ['odds', 'weight', 'finish_time']:
            if col in df.columns:
                Q1 = df[col].quantile(0.01)
                Q99 = df[col].quantile(0.99)
                self.outlier_bounds[col] = (Q1, Q99)
        
        # 3. カテゴリカル変数のエンコーダー準備
        categorical_cols = df.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            if col not in ['race_date']:
                le = LabelEncoder()
                le.fit(df[col].astype(str))
                self.encoders[col] = le
        
        # 4. スケーラーの準備
        scaler_features = ['age', 'weight', 'odds', 'distance', 'popularity']
        available_features = [col for col in scaler_features if col in df.columns]
        
        if available_features:
            scaler = RobustScaler()  # 外れ値に頑健
            scaler.fit(df[available_features])
            self.scalers['numeric'] = (scaler, available_features)
        
        self.is_fitted = True
        return self
    
    def transform(self, df):
        """前処理の適用"""
        
        if not self.is_fitted:
            raise ValueError("fit()を先に実行してください")
        
        df_transformed = df.copy()
        
        # 1. 欠損値補完
        for col, (method, value) in self.imputers.items():
            if col in df_transformed.columns:
                if method == 'group_median':
                    # グループ別補完
                    for (age, sex), median_val in value.items():
                        mask = (df_transformed['age'] == age) & (df_transformed['sex'] == sex) & df_transformed[col].isnull()
                        df_transformed.loc[mask, col] = median_val
                    # 残りの欠損値は全体中央値で補完
                    df_transformed[col].fillna(df_transformed[col].median(), inplace=True)
                else:
                    df_transformed[col].fillna(value, inplace=True)
        
        # 2. 外れ値処理
        for col, (lower, upper) in self.outlier_bounds.items():
            if col in df_transformed.columns:
                df_transformed[col] = df_transformed[col].clip(lower=lower, upper=upper)
        
        # 3. 特徴量エンジニアリング
        df_transformed = self._create_features(df_transformed)
        
        # 4. カテゴリカル変数エンコーディング
        for col, encoder in self.encoders.items():
            if col in df_transformed.columns:
                df_transformed[f'{col}_encoded'] = encoder.transform(df_transformed[col].astype(str))
        
        # 5. スケーリング
        if 'numeric' in self.scalers:
            scaler, features = self.scalers['numeric']
            available_features = [col for col in features if col in df_transformed.columns]
            if available_features:
                df_transformed[available_features] = scaler.transform(df_transformed[available_features])
        
        return df_transformed
    
    def fit_transform(self, df):
        """学習と変換を一度に実行"""
        return self.fit(df).transform(df)
    
    def _create_features(self, df):
        """特徴量エンジニアリング"""
        
        # オッズ関連特徴量
        if 'odds' in df.columns:
            df['odds_log'] = np.log1p(df['odds'])
            df['is_favorite'] = (df['popularity'] == 1).astype(int)
        
        # 馬の特徴
        if 'age' in df.columns:
            df['is_young'] = (df['age'] <= 4).astype(int)
        
        if 'sex' in df.columns:
            df['is_female'] = (df['sex'] == '牝').astype(int)
        
        # 距離適性
        if 'distance' in df.columns:
            df['is_sprint'] = (df['distance'] <= 1400).astype(int)
            df['is_long'] = (df['distance'] >= 2000).astype(int)
        
        # レース内ランキング
        if 'race_id' in df.columns:
            if 'odds' in df.columns:
                df['odds_rank'] = df.groupby('race_id')['odds'].rank()
            if 'weight' in df.columns:
                df['weight_rank'] = df.groupby('race_id')['weight'].rank()
        
        return df
    
    def get_feature_names(self):
        """変換後の特徴量名を取得"""
        if not self.is_fitted:
            return None
        
        # 基本特徴量
        features = list(self.df_fit.columns)
        
        # 追加特徴量
        additional_features = [
            'odds_log', 'is_favorite', 'is_young', 'is_female',
            'is_sprint', 'is_long', 'odds_rank', 'weight_rank'
        ]
        
        # エンコードされた特徴量
        encoded_features = [f'{col}_encoded' for col in self.encoders.keys()]
        
        return features + additional_features + encoded_features

# 使用例
preprocessor = HorseDataPreprocessor()

# 訓練データで学習
df_train, df_test = train_test_split(df, test_size=0.2, random_state=42)
preprocessor.fit(df_train)

# 変換実行
df_train_processed = preprocessor.transform(df_train)
df_test_processed = preprocessor.transform(df_test)

print("前処理パイプライン構築完了")
print(f"訓練データ: {df_train_processed.shape}")
print(f"テストデータ: {df_test_processed.shape}")
```

## 7. パフォーマンスの測定

```python
import time
import psutil
import os

def measure_preprocessing_performance():
    """前処理のパフォーマンス測定"""
    
    print("=== 前処理パフォーマンス測定 ===")
    
    # データサイズを変えて測定
    data_sizes = [1000, 5000, 10000, 20000]
    results = []
    
    for size in data_sizes:
        # サンプルデータ作成
        sample_df = df.sample(n=min(size, len(df)), random_state=42)
        
        # メモリ使用量測定開始
        process = psutil.Process(os.getpid())
        memory_before = process.memory_info().rss / 1024 / 1024  # MB
        
        # 時間測定開始
        start_time = time.time()
        
        # 前処理実行
        preprocessor_temp = HorseDataPreprocessor()
        processed_df = preprocessor_temp.fit_transform(sample_df)
        
        # 時間測定終了
        end_time = time.time()
        processing_time = end_time - start_time
        
        # メモリ使用量測定終了
        memory_after = process.memory_info().rss / 1024 / 1024  # MB
        memory_used = memory_after - memory_before
        
        results.append({
            'data_size': size,
            'processing_time': processing_time,
            'memory_used': memory_used,
            'rows_per_second': size / processing_time
        })
        
        print(f"データサイズ {size:5d}: {processing_time:.2f}秒, {memory_used:.1f}MB, {size/processing_time:.0f}行/秒")
    
    # 結果の可視化
    results_df = pd.DataFrame(results)
    
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    
    # 処理時間
    axes[0].plot(results_df['data_size'], results_df['processing_time'], 'o-')
    axes[0].set_xlabel('データサイズ')
    axes[0].set_ylabel('処理時間 (秒)')
    axes[0].set_title('データサイズ vs 処理時間')
    axes[0].grid(True)
    
    # メモリ使用量
    axes[1].plot(results_df['data_size'], results_df['memory_used'], 'o-', color='orange')
    axes[1].set_xlabel('データサイズ')
    axes[1].set_ylabel('メモリ使用量 (MB)')
    axes[1].set_title('データサイズ vs メモリ使用量')
    axes[1].grid(True)
    
    # スループット
    axes[2].plot(results_df['data_size'], results_df['rows_per_second'], 'o-', color='green')
    axes[2].set_xlabel('データサイズ')
    axes[2].set_ylabel('行/秒')
    axes[2].set_title('データサイズ vs 処理スループット')
    axes[2].grid(True)
    
    plt.tight_layout()
    plt.show()
    
    return results_df

performance_results = measure_preprocessing_performance()
```

## まとめ

本記事では、競馬データに特化した包括的な前処理テクニックを解説しました。

### 重要なポイント：

1. **欠損値処理**:
   - グループ別補完による精度向上
   - 欠損メカニズムの理解
   - KNN補完など高度な手法

2. **外れ値検出**:
   - 統計的手法（Z-score、IQR）
   - 機械学習手法（Isolation Forest、One-Class SVM）
   - アンサンブル的検出

3. **データ変換**:
   - 分布の正規化
   - 適切なスケーリング手法の選択
   - カテゴリカル変数の効果的エンコーディング

4. **品質管理**:
   - データ整合性の検証
   - 処理前後の比較
   - パフォーマンス測定

### 実践的な教訓：

- **ドメイン知識の重要性**: 競馬特有の欠損パターンの理解
- **手法の組み合わせ**: 単一手法より複数手法の組み合わせが有効
- **継続的検証**: 前処理結果の定期的な品質チェック
- **パイプライン化**: 再現可能で保守しやすい前処理の重要性

適切な前処理により、機械学習モデルの性能を大幅に向上させることができます。データの特性を理解し、適切な手法を選択することが成功の鍵となります。