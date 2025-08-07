---
title: "Jupyter Notebookで始める競馬AI開発環境"
date: 2025-08-07T12:00:00+09:00
description: "Jupyter Notebookを使った競馬AI開発環境の構築から実装まで。データ分析、機械学習モデルの構築、可視化テクニックを実例とともに詳しく解説。"
categories: ["Tools", "AI", "Data Science"]
tags: ["Jupyter Notebook", "競馬AI", "機械学習", "データサイエンス", "Python", "pandas", "scikit-learn", "TensorFlow", "データ分析", "可視化"]
slug: "jupyter-horse-ai-development"
---

## はじめに

競馬AI開発において、Jupyter Notebookは研究から実装まで一貫して使用できる強力な開発環境です。本記事では、Jupyter Notebookを使用した競馬AI開発の完全ガイドを提供し、環境構築から高度な機械学習モデルの実装まで、実践的な知識を体系的に解説します。

## 1. Jupyter Notebook開発環境の理念

### 1.1 なぜJupyter Notebookなのか

Jupyter Notebookは以下の理由で競馬AI開発に最適です：

- **インタラクティブな開発**: コードの実行結果を即座に確認
- **データの可視化**: グラフやチャートを直接表示
- **実験管理**: 分析プロセスと結果を一元管理
- **共有しやすさ**: ノートブックファイルでの知見共有
- **プロトタイピング**: 迅速なモデル開発と検証

### 1.2 競馬AI開発のワークフロー

```
データ収集 → 前処理 → 探索的分析 → 特徴量エンジニアリング → モデル構築 → 評価・改善
```

## 2. 開発環境の構築

### 2.1 Anaconda環境のセットアップ

```bash
# Anacondaのインストール（公式サイトからダウンロード）
# https://www.anaconda.com/products/distribution

# 仮想環境の作成
conda create -n horse-ai python=3.9
conda activate horse-ai

# Jupyter Notebookとエクステンションの設定
conda install jupyter jupyterlab
conda install nb_conda_kernels
pip install jupyter_contrib_nbextensions
jupyter contrib nbextension install --user
```

### 2.2 必要ライブラリの一括インストール

```bash
# データ処理・分析ライブラリ
pip install pandas numpy scipy scikit-learn

# 機械学習・深層学習フレームワーク
pip install tensorflow pytorch xgboost lightgbm catboost

# データ可視化ライブラリ
pip install matplotlib seaborn plotly bokeh altair

# 統計・数値計算ライブラリ
pip install statsmodels sympy

# Webスクレイピング・API連携
pip install requests beautifulsoup4 selenium

# データベース接続
pip install sqlalchemy pymongo psycopg2-binary

# 特殊用途ライブラリ
pip install shap lime optuna hyperopt

# Jupyter拡張機能
pip install ipywidgets tqdm jupyterlab-git
```

### 2.3 Jupyter Lab設定とカスタマイズ

```python
# ~/.jupyter/jupyter_notebook_config.py
c = get_config()

# ノートブックの設定
c.NotebookApp.notebook_dir = '/path/to/your/horse-ai-projects'
c.NotebookApp.open_browser = True
c.NotebookApp.port = 8888

# セキュリティ設定
c.NotebookApp.token = ''
c.NotebookApp.password = ''

# 自動保存間隔（秒）
c.FileContentsManager.autosave_interval = 300

# カスタムCSSでダークテーマ適用
c.NotebookApp.extra_static_paths = ["/path/to/custom/css"]
```

## 3. プロジェクト構造とベストプラクティス

### 3.1 プロジェクト構造

```
horse-ai-project/
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_feature_engineering.ipynb
│   ├── 03_model_development.ipynb
│   ├── 04_model_evaluation.ipynb
│   └── 05_prediction_system.ipynb
├── data/
│   ├── raw/
│   ├── processed/
│   └── external/
├── src/
│   ├── data_processing.py
│   ├── feature_engineering.py
│   ├── models.py
│   └── utils.py
├── models/
│   ├── trained_models/
│   └── model_configs/
├── reports/
│   ├── figures/
│   └── analysis_reports/
├── requirements.txt
└── README.md
```

### 3.2 Jupyter Notebook実行環境の初期設定

```python
# セル1: 環境設定とライブラリ読み込み
import sys
sys.path.append('../src')

# 基本ライブラリ
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

# Jupyter設定
%matplotlib inline
%config InlineBackend.figure_format = 'retina'
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("husl")

# pandas表示設定
pd.set_option('display.max_columns', 100)
pd.set_option('display.max_rows', 100)
pd.set_option('display.float_format', '{:.3f}'.format)

# プログレスバー
from tqdm.notebook import tqdm
tqdm.pandas()

print("環境設定完了")
```

## 4. データ探索と前処理

### 4.1 競馬データの読み込みと基本的な探索

```python
# セル2: データ読み込み
def load_horse_data():
    """競馬データの読み込み"""
    
    # レースデータ
    races_df = pd.read_csv('../data/raw/races.csv', parse_dates=['race_date'])
    
    # 馬データ
    horses_df = pd.read_csv('../data/raw/horses.csv')
    
    # 成績データ
    results_df = pd.read_csv('../data/raw/race_results.csv', parse_dates=['race_date'])
    
    # 騎手データ
    jockeys_df = pd.read_csv('../data/raw/jockeys.csv')
    
    # 調教師データ
    trainers_df = pd.read_csv('../data/raw/trainers.csv')
    
    print(f"レースデータ: {races_df.shape}")
    print(f"馬データ: {horses_df.shape}")
    print(f"成績データ: {results_df.shape}")
    print(f"騎手データ: {jockeys_df.shape}")
    print(f"調教師データ: {trainers_df.shape}")
    
    return races_df, horses_df, results_df, jockeys_df, trainers_df

# データ読み込み実行
races_df, horses_df, results_df, jockeys_df, trainers_df = load_horse_data()

# 基本情報の確認
display(races_df.head())
display(races_df.info())
display(races_df.describe())
```

### 4.2 データ品質の確認と可視化

```python
# セル3: データ品質チェック
def analyze_data_quality(df, name):
    """データ品質の分析"""
    print(f"\n=== {name} データ品質分析 ===")
    
    # 欠損値の確認
    missing_data = df.isnull().sum()
    missing_percent = (missing_data / len(df)) * 100
    
    quality_df = pd.DataFrame({
        'Missing Count': missing_data,
        'Missing Percentage': missing_percent
    }).sort_values('Missing Percentage', ascending=False)
    
    # 欠損値の可視化
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    
    # 欠損値の棒グラフ
    quality_df[quality_df['Missing Percentage'] > 0]['Missing Percentage'].plot(
        kind='bar', ax=ax1, color='coral'
    )
    ax1.set_title(f'{name} - Missing Data Percentage')
    ax1.set_ylabel('Percentage (%)')
    plt.xticks(rotation=45)
    
    # 欠損値のヒートマップ
    sns.heatmap(df.isnull(), yticklabels=False, cbar=True, ax=ax2, cmap='viridis')
    ax2.set_title(f'{name} - Missing Data Heatmap')
    
    plt.tight_layout()
    plt.show()
    
    return quality_df[quality_df['Missing Percentage'] > 0]

# 各データセットの品質確認
race_quality = analyze_data_quality(races_df, "Races")
results_quality = analyze_data_quality(results_df, "Results")
horse_quality = analyze_data_quality(horses_df, "Horses")
```

### 4.3 探索的データ分析（EDA）

```python
# セル4: 探索的データ分析
def exploratory_data_analysis():
    """包括的なEDA"""
    
    # レース分布の分析
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    
    # 1. 競馬場別レース数
    track_counts = races_df['track'].value_counts()
    track_counts.plot(kind='bar', ax=axes[0,0], color='skyblue')
    axes[0,0].set_title('レース数（競馬場別）')
    axes[0,0].set_ylabel('レース数')
    
    # 2. 距離分布
    races_df['distance'].hist(bins=30, ax=axes[0,1], color='lightgreen', alpha=0.7)
    axes[0,1].set_title('距離分布')
    axes[0,1].set_xlabel('距離 (m)')
    axes[0,1].set_ylabel('頻度')
    
    # 3. グレード分布
    grade_counts = races_df['grade'].value_counts()
    axes[0,2].pie(grade_counts.values, labels=grade_counts.index, autopct='%1.1f%%')
    axes[0,2].set_title('グレード分布')
    
    # 4. 着順分布
    finish_counts = results_df['finish_position'].value_counts().sort_index()
    finish_counts.head(10).plot(kind='bar', ax=axes[1,0], color='orange')
    axes[1,0].set_title('着順分布（上位10位）')
    axes[1,0].set_xlabel('着順')
    axes[1,0].set_ylabel('頻度')
    
    # 5. 馬齢分布
    results_df['horse_age'].hist(bins=15, ax=axes[1,1], color='pink', alpha=0.7)
    axes[1,1].set_title('馬齢分布')
    axes[1,1].set_xlabel('年齢')
    axes[1,1].set_ylabel('頻度')
    
    # 6. オッズ分布（対数スケール）
    results_df['odds'].replace(0, np.nan, inplace=True)
    log_odds = np.log(results_df['odds'].dropna())
    log_odds.hist(bins=50, ax=axes[1,2], color='purple', alpha=0.7)
    axes[1,2].set_title('オッズ分布（対数）')
    axes[1,2].set_xlabel('log(オッズ)')
    axes[1,2].set_ylabel('頻度')
    
    plt.tight_layout()
    plt.show()
    
    # 統計情報の表示
    print("\n=== 基本統計情報 ===")
    display(results_df[['horse_age', 'weight', 'odds', 'finish_position']].describe())

# EDA実行
exploratory_data_analysis()
```

### 4.4 相関分析とパターン発見

```python
# セル5: 相関分析
def correlation_analysis():
    """特徴量間の相関分析"""
    
    # 数値特徴量の抽出
    numeric_features = [
        'horse_age', 'weight', 'odds', 'popularity', 
        'gate_number', 'horse_number', 'distance'
    ]
    
    # レースデータとの結合
    analysis_df = results_df.merge(
        races_df[['race_id', 'distance', 'track_condition']], 
        on='race_id'
    )
    
    # 相関行列の計算
    correlation_matrix = analysis_df[numeric_features].corr()
    
    # 相関ヒートマップ
    plt.figure(figsize=(12, 10))
    mask = np.triu(np.ones_like(correlation_matrix, dtype=bool))
    sns.heatmap(
        correlation_matrix, 
        mask=mask, 
        annot=True, 
        cmap='RdBu_r', 
        center=0,
        square=True,
        linewidths=0.5,
        cbar_kws={"shrink": 0.8}
    )
    plt.title('特徴量相関ヒートマップ')
    plt.tight_layout()
    plt.show()
    
    # 着順との相関が高い特徴量
    finish_correlation = analysis_df[numeric_features + ['finish_position']].corr()['finish_position'].abs().sort_values(ascending=False)
    
    print("\n=== 着順との相関（絶対値） ===")
    display(finish_correlation.drop('finish_position'))
    
    return correlation_matrix

correlation_matrix = correlation_analysis()
```

## 5. 特徴量エンジニアリング

### 5.1 基本的な特徴量作成

```python
# セル6: 基本特徴量の作成
def create_basic_features(df):
    """基本的な特徴量を作成"""
    
    df = df.copy()
    
    # 時間系特徴量
    df['race_year'] = df['race_date'].dt.year
    df['race_month'] = df['race_date'].dt.month
    df['race_day_of_week'] = df['race_date'].dt.dayofweek
    df['race_quarter'] = df['race_date'].dt.quarter
    
    # 距離系特徴量
    df['distance_category'] = pd.cut(
        df['distance'], 
        bins=[0, 1200, 1600, 2000, 2400, 5000],
        labels=['短距離', 'マイル', '中距離', '長距離', '超長距離']
    )
    
    # 体重系特徴量
    df['weight_category'] = pd.cut(
        df['weight'],
        bins=[0, 450, 480, 520, 600],
        labels=['軽量', '普通', '重量', '超重量']
    )
    
    # オッズ系特徴量
    df['odds_log'] = np.log1p(df['odds'])
    df['odds_category'] = pd.cut(
        df['odds'],
        bins=[0, 3, 10, 50, 999],
        labels=['本命', '対抗', '穴', '大穴']
    )
    
    # 人気系特徴量
    df['popularity_category'] = pd.cut(
        df['popularity'],
        bins=[0, 3, 6, 12, 999],
        labels=['上位人気', '中位人気', '下位人気', '超不人気']
    )
    
    # ゲート位置特徴量
    df['gate_position'] = df['gate_number'].apply(
        lambda x: '内枠' if x <= 4 else '外枠' if x >= 13 else '中枠'
    )
    
    print(f"特徴量追加完了。新しい特徴量数: {len([col for col in df.columns if col not in results_df.columns])}")
    
    return df

# 特徴量作成の実行
enhanced_df = create_basic_features(
    results_df.merge(races_df[['race_id', 'distance', 'track', 'race_date']], on='race_id')
)

display(enhanced_df.head())
```

### 5.2 高度な特徴量エンジニアリング

```python
# セル7: 高度な特徴量作成
def create_advanced_features(df):
    """高度な特徴量を作成"""
    
    df = df.copy()
    
    # 過去成績特徴量の作成
    df = df.sort_values(['horse_id', 'race_date'])
    
    # ローリング統計量（過去5戦）
    rolling_features = df.groupby('horse_id').rolling(5, min_periods=1)
    
    df['avg_finish_position_5'] = rolling_features['finish_position'].mean().values
    df['avg_odds_5'] = rolling_features['odds'].mean().values
    df['win_rate_5'] = (rolling_features['finish_position'].apply(lambda x: (x == 1).sum()) / 5).values
    df['place_rate_5'] = (rolling_features['finish_position'].apply(lambda x: (x <= 3).sum()) / 5).values
    
    # 騎手・調教師統計
    jockey_stats = df.groupby('jockey_id').agg({
        'finish_position': ['mean', 'std'],
        'odds': 'mean'
    }).round(3)
    jockey_stats.columns = ['jockey_avg_finish', 'jockey_std_finish', 'jockey_avg_odds']
    
    trainer_stats = df.groupby('trainer_id').agg({
        'finish_position': ['mean', 'std'],
        'odds': 'mean'
    }).round(3)
    trainer_stats.columns = ['trainer_avg_finish', 'trainer_std_finish', 'trainer_avg_odds']
    
    # 統計量をマージ
    df = df.merge(jockey_stats, left_on='jockey_id', right_index=True, how='left')
    df = df.merge(trainer_stats, left_on='trainer_id', right_index=True, how='left')
    
    # コンディション適性
    track_condition_performance = df.groupby(['horse_id', 'track_condition'])['finish_position'].mean()
    df['track_condition_aptitude'] = df.apply(
        lambda x: track_condition_performance.get((x['horse_id'], x['track_condition']), x['finish_position']), 
        axis=1
    )
    
    # 距離適性
    distance_performance = df.groupby('horse_id')['distance'].apply(
        lambda x: x.iloc[-1] if len(x) > 0 else 1600  # 最後に走った距離
    )
    df['distance_aptitude'] = df.apply(
        lambda x: abs(x['distance'] - distance_performance.get(x['horse_id'], 1600)), 
        axis=1
    )
    
    # 季節性パターン
    seasonal_performance = df.groupby(['horse_id', 'race_month'])['finish_position'].mean()
    df['seasonal_aptitude'] = df.apply(
        lambda x: seasonal_performance.get((x['horse_id'], x['race_month']), x['finish_position']),
        axis=1
    )
    
    print("高度な特徴量作成完了")
    
    return df

# 高度な特徴量作成の実行
advanced_df = create_advanced_features(enhanced_df)
print(f"総特徴量数: {advanced_df.shape[1]}")
display(advanced_df[['horse_id', 'avg_finish_position_5', 'win_rate_5', 'jockey_avg_finish', 'distance_aptitude']].head())
```

### 5.3 特徴量重要度の分析

```python
# セル8: 特徴量重要度分析
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

def analyze_feature_importance(df):
    """特徴量重要度を分析"""
    
    # 数値特徴量とカテゴリ特徴量の分離
    numeric_features = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_features = df.select_dtypes(include=['object', 'category']).columns.tolist()
    
    # ターゲット変数以外の特徴量
    feature_columns = [col for col in numeric_features if col not in ['finish_position', 'race_id', 'horse_id']]
    
    # カテゴリ変数のエンコーディング
    df_encoded = df.copy()
    label_encoders = {}
    
    for col in categorical_features:
        if col in df_encoded.columns:
            le = LabelEncoder()
            df_encoded[col + '_encoded'] = le.fit_transform(df_encoded[col].astype(str))
            feature_columns.append(col + '_encoded')
            label_encoders[col] = le
    
    # 欠損値の処理
    df_clean = df_encoded[feature_columns + ['finish_position']].dropna()
    
    # Random Forestで重要度計算
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    X = df_clean[feature_columns]
    y = df_clean['finish_position']
    
    rf.fit(X, y)
    
    # 重要度をDataFrameにまとめ
    importance_df = pd.DataFrame({
        'feature': feature_columns,
        'importance': rf.feature_importances_
    }).sort_values('importance', ascending=False)
    
    # 上位20特徴量の可視化
    plt.figure(figsize=(12, 8))
    top_features = importance_df.head(20)
    sns.barplot(data=top_features, x='importance', y='feature', palette='viridis')
    plt.title('特徴量重要度 (Top 20)')
    plt.xlabel('重要度')
    plt.tight_layout()
    plt.show()
    
    print("\n=== 特徴量重要度（上位10） ===")
    display(importance_df.head(10))
    
    return importance_df, rf

importance_df, feature_model = analyze_feature_importance(advanced_df)
```

## 6. 機械学習モデルの実装

### 6.1 ベースラインモデルの構築

```python
# セル9: ベースラインモデル
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.preprocessing import StandardScaler

def create_baseline_models(df):
    """ベースラインモデルを作成・評価"""
    
    # データの準備
    feature_columns = importance_df['feature'].head(15).tolist()  # 上位15特徴量を使用
    
    # カテゴリ変数のエンコーディング
    df_model = df.copy()
    categorical_cols = df_model.select_dtypes(include=['object', 'category']).columns
    
    for col in categorical_cols:
        if col in df_model.columns:
            le = LabelEncoder()
            df_model[col + '_encoded'] = le.fit_transform(df_model[col].astype(str))
            if col + '_encoded' not in feature_columns and col in feature_columns:
                feature_columns = [c if c != col else col + '_encoded' for c in feature_columns]
    
    # 欠損値の処理
    df_clean = df_model[feature_columns + ['finish_position']].dropna()
    
    X = df_clean[feature_columns]
    y = df_clean['finish_position']
    
    # 学習・テスト分割
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=pd.cut(y, bins=5, labels=False)
    )
    
    # スケーリング
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # モデル定義
    models = {
        'Linear Regression': LinearRegression(),
        'Ridge': Ridge(alpha=1.0),
        'Lasso': Lasso(alpha=0.1),
        'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42)
    }
    
    results = {}
    
    print("=== ベースラインモデル評価 ===")
    
    for name, model in models.items():
        if name in ['Random Forest']:
            # Tree系モデルはスケーリング不要
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
        else:
            # 線形モデルはスケーリングが必要
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
        
        # 評価指標の計算
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        results[name] = {
            'MSE': mse,
            'MAE': mae,
            'R2': r2,
            'RMSE': np.sqrt(mse)
        }
        
        print(f"\n{name}:")
        print(f"  MSE: {mse:.4f}")
        print(f"  MAE: {mae:.4f}")
        print(f"  R²: {r2:.4f}")
        print(f"  RMSE: {np.sqrt(mse):.4f}")
    
    # 結果の可視化
    results_df = pd.DataFrame(results).T
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    
    for i, metric in enumerate(['MSE', 'MAE', 'R2', 'RMSE']):
        ax = axes[i//2, i%2]
        results_df[metric].plot(kind='bar', ax=ax, color='skyblue')
        ax.set_title(f'{metric} Comparison')
        ax.set_ylabel(metric)
        plt.xticks(rotation=45)
    
    plt.tight_layout()
    plt.show()
    
    return results, models, scaler, X_train, X_test, y_train, y_test

# ベースラインモデルの実行
baseline_results, models, scaler, X_train, X_test, y_train, y_test = create_baseline_models(advanced_df)
```

### 6.2 高度なアンサンブルモデル

```python
# セル10: アンサンブルモデル
import xgboost as xgb
import lightgbm as lgb
from sklearn.ensemble import VotingRegressor, StackingRegressor

def create_ensemble_models(X_train, X_test, y_train, y_test):
    """高度なアンサンブルモデルを作成"""
    
    print("=== アンサンブルモデル構築 ===")
    
    # 個別モデルの定義
    rf_model = RandomForestRegressor(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        random_state=42
    )
    
    xgb_model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    
    lgb_model = lgb.LGBMRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbosity=-1
    )
    
    # Votingアンサンブル
    voting_ensemble = VotingRegressor([
        ('rf', rf_model),
        ('xgb', xgb_model),
        ('lgb', lgb_model)
    ])
    
    # Stackingアンサンブル
    stacking_ensemble = StackingRegressor(
        estimators=[
            ('rf', rf_model),
            ('xgb', xgb_model),
            ('lgb', lgb_model)
        ],
        final_estimator=Ridge(alpha=1.0),
        cv=5
    )
    
    # モデル学習と評価
    ensemble_models = {
        'Random Forest': rf_model,
        'XGBoost': xgb_model,
        'LightGBM': lgb_model,
        'Voting Ensemble': voting_ensemble,
        'Stacking Ensemble': stacking_ensemble
    }
    
    ensemble_results = {}
    
    for name, model in ensemble_models.items():
        print(f"\n学習中: {name}")
        
        # 学習
        if name == 'Stacking Ensemble':
            model.fit(X_train, y_train)
        else:
            model.fit(X_train, y_train)
        
        # 予測
        y_pred_train = model.predict(X_train)
        y_pred_test = model.predict(X_test)
        
        # 評価
        train_mse = mean_squared_error(y_train, y_pred_train)
        test_mse = mean_squared_error(y_test, y_pred_test)
        train_mae = mean_absolute_error(y_train, y_pred_train)
        test_mae = mean_absolute_error(y_test, y_pred_test)
        
        ensemble_results[name] = {
            'Train MSE': train_mse,
            'Test MSE': test_mse,
            'Train MAE': train_mae,
            'Test MAE': test_mae,
            'Overfitting': test_mse - train_mse
        }
        
        print(f"  Train MSE: {train_mse:.4f}")
        print(f"  Test MSE: {test_mse:.4f}")
        print(f"  Test MAE: {test_mae:.4f}")
    
    # 結果の可視化
    results_df = pd.DataFrame(ensemble_results).T
    
    plt.figure(figsize=(15, 8))
    
    plt.subplot(2, 2, 1)
    results_df[['Train MSE', 'Test MSE']].plot(kind='bar', ax=plt.gca())
    plt.title('MSE Comparison (Train vs Test)')
    plt.xticks(rotation=45)
    
    plt.subplot(2, 2, 2)
    results_df['Overfitting'].plot(kind='bar', ax=plt.gca(), color='red', alpha=0.7)
    plt.title('Overfitting (Test MSE - Train MSE)')
    plt.xticks(rotation=45)
    
    plt.subplot(2, 2, 3)
    results_df['Test MAE'].plot(kind='bar', ax=plt.gca(), color='green')
    plt.title('Test MAE')
    plt.xticks(rotation=45)
    
    plt.subplot(2, 2, 4)
    # 最良モデルでの予測 vs 実値
    best_model_name = results_df['Test MSE'].idxmin()
    best_model = ensemble_models[best_model_name]
    y_pred_best = best_model.predict(X_test)
    
    plt.scatter(y_test, y_pred_best, alpha=0.5)
    plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
    plt.xlabel('Actual')
    plt.ylabel('Predicted')
    plt.title(f'Best Model: {best_model_name}')
    
    plt.tight_layout()
    plt.show()
    
    return ensemble_results, ensemble_models

# アンサンブルモデルの実行
ensemble_results, ensemble_models = create_ensemble_models(X_train, X_test, y_train, y_test)
```

### 6.3 ハイパーパラメータ最適化

```python
# セル11: ハイパーパラメータ最適化
import optuna
from sklearn.model_selection import cross_val_score

def optimize_hyperparameters(X_train, y_train, model_type='xgboost'):
    """Optunaを使用したハイパーパラメータ最適化"""
    
    def objective(trial):
        if model_type == 'xgboost':
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 50, 500),
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'reg_alpha': trial.suggest_float('reg_alpha', 0, 10),
                'reg_lambda': trial.suggest_float('reg_lambda', 0, 10),
            }
            
            model = xgb.XGBRegressor(**params, random_state=42)
            
        elif model_type == 'lightgbm':
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 50, 500),
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'reg_alpha': trial.suggest_float('reg_alpha', 0, 10),
                'reg_lambda': trial.suggest_float('reg_lambda', 0, 10),
            }
            
            model = lgb.LGBMRegressor(**params, random_state=42, verbosity=-1)
        
        # クロスバリデーション
        cv_scores = cross_val_score(
            model, X_train, y_train, 
            cv=5, scoring='neg_mean_squared_error', n_jobs=-1
        )
        
        return -cv_scores.mean()  # Optunaは最小化するため負号をつける
    
    print(f"=== {model_type.upper()} ハイパーパラメータ最適化 ===")
    
    # 最適化実行
    study = optuna.create_study(direction='minimize')
    study.optimize(objective, n_trials=100, show_progress_bar=True)
    
    print(f"\nBest parameters: {study.best_params}")
    print(f"Best CV score: {study.best_value:.4f}")
    
    # 最適化結果の可視化
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    
    # 最適化履歴
    optuna.visualization.matplotlib.plot_optimization_history(study, ax=axes[0,0])
    axes[0,0].set_title('Optimization History')
    
    # パラメータ重要度
    optuna.visualization.matplotlib.plot_param_importances(study, ax=axes[0,1])
    axes[0,1].set_title('Parameter Importances')
    
    # パラメータ関係性（上位2パラメータ）
    important_params = list(study.best_params.keys())[:2]
    if len(important_params) >= 2:
        optuna.visualization.matplotlib.plot_contour(study, params=important_params, ax=axes[1,0])
        axes[1,0].set_title(f'Contour Plot: {important_params[0]} vs {important_params[1]}')
    
    # 試行値の分布
    axes[1,1].hist([trial.value for trial in study.trials], bins=20, alpha=0.7)
    axes[1,1].set_xlabel('Objective Value (MSE)')
    axes[1,1].set_ylabel('Frequency')
    axes[1,1].set_title('Trial Values Distribution')
    
    plt.tight_layout()
    plt.show()
    
    # 最適モデルの作成
    if model_type == 'xgboost':
        best_model = xgb.XGBRegressor(**study.best_params, random_state=42)
    elif model_type == 'lightgbm':
        best_model = lgb.LGBMRegressor(**study.best_params, random_state=42, verbosity=-1)
    
    best_model.fit(X_train, y_train)
    
    return best_model, study.best_params

# ハイパーパラメータ最適化の実行
print("XGBoost最適化中...")
optimized_xgb, best_xgb_params = optimize_hyperparameters(X_train, y_train, 'xgboost')

print("\nLightGBM最適化中...")
optimized_lgb, best_lgb_params = optimize_hyperparameters(X_train, y_train, 'lightgbm')
```

## 7. モデル解釈と可視化

### 7.1 SHAP による説明可能AI

```python
# セル12: SHAP分析
import shap

def analyze_model_with_shap(model, X_test, feature_names):
    """SHAPを使用したモデル解釈"""
    
    print("=== SHAP分析 ===")
    
    # SHAPのExplainerを作成
    if hasattr(model, 'predict_proba'):
        explainer = shap.TreeExplainer(model)
    else:
        explainer = shap.Explainer(model, X_train[:100])  # サンプルを使用
    
    # SHAP値を計算（計算時間を考慮して一部のサンプルのみ）
    shap_values = explainer.shap_values(X_test[:500])
    
    # Summary Plot
    plt.figure(figsize=(10, 8))
    shap.summary_plot(shap_values, X_test[:500], feature_names=feature_names, show=False)
    plt.title('SHAP Summary Plot')
    plt.tight_layout()
    plt.show()
    
    # Feature Importance
    plt.figure(figsize=(10, 6))
    shap.summary_plot(shap_values, X_test[:500], feature_names=feature_names, plot_type="bar", show=False)
    plt.title('SHAP Feature Importance')
    plt.tight_layout()
    plt.show()
    
    # 個別予測の説明（最初の5サンプル）
    for i in range(min(3, len(X_test))):
        plt.figure(figsize=(10, 6))
        shap.waterfall_plot(explainer.expected_value, shap_values[i], X_test.iloc[i], feature_names=feature_names, show=False)
        plt.title(f'SHAP Waterfall Plot - Sample {i+1}')
        plt.tight_layout()
        plt.show()
    
    return shap_values

# 最良モデルでのSHAP分析
feature_names = X_test.columns.tolist()
shap_values = analyze_model_with_shap(optimized_xgb, X_test, feature_names)
```

### 7.2 予測結果の詳細分析

```python
# セル13: 予測結果の分析
def analyze_prediction_results(models, X_test, y_test):
    """予測結果の詳細分析"""
    
    # 最良モデルの選択
    best_models = {
        'Optimized XGBoost': optimized_xgb,
        'Optimized LightGBM': optimized_lgb
    }
    
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    
    for idx, (name, model) in enumerate(best_models.items()):
        y_pred = model.predict(X_test)
        
        # 1. 予測 vs 実値
        axes[idx, 0].scatter(y_test, y_pred, alpha=0.5)
        axes[idx, 0].plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
        axes[idx, 0].set_xlabel('Actual')
        axes[idx, 0].set_ylabel('Predicted')
        axes[idx, 0].set_title(f'{name} - Actual vs Predicted')
        
        # R² スコアを表示
        r2 = r2_score(y_test, y_pred)
        axes[idx, 0].text(0.05, 0.95, f'R² = {r2:.3f}', transform=axes[idx, 0].transAxes, 
                         bbox=dict(boxstyle="round", facecolor='wheat', alpha=0.8))
        
        # 2. 残差分析
        residuals = y_test - y_pred
        axes[idx, 1].scatter(y_pred, residuals, alpha=0.5)
        axes[idx, 1].axhline(y=0, color='r', linestyle='--')
        axes[idx, 1].set_xlabel('Predicted')
        axes[idx, 1].set_ylabel('Residuals')
        axes[idx, 1].set_title(f'{name} - Residuals')
        
        # 3. 着順別の予測精度
        finish_positions = sorted(y_test.unique())[:8]  # 上位8着まで
        accuracy_by_finish = []
        
        for pos in finish_positions:
            mask = y_test == pos
            if mask.sum() > 10:  # 十分なサンプル数がある場合のみ
                pred_for_pos = y_pred[mask]
                mae = mean_absolute_error([pos] * len(pred_for_pos), pred_for_pos)
                accuracy_by_finish.append(mae)
            else:
                accuracy_by_finish.append(np.nan)
        
        valid_positions = [pos for pos, acc in zip(finish_positions, accuracy_by_finish) if not np.isnan(acc)]
        valid_accuracies = [acc for acc in accuracy_by_finish if not np.isnan(acc)]
        
        if valid_accuracies:
            axes[idx, 2].bar(range(len(valid_positions)), valid_accuracies, color='skyblue')
            axes[idx, 2].set_xticks(range(len(valid_positions)))
            axes[idx, 2].set_xticklabels(valid_positions)
            axes[idx, 2].set_xlabel('着順')
            axes[idx, 2].set_ylabel('MAE')
            axes[idx, 2].set_title(f'{name} - 着順別MAE')
    
    plt.tight_layout()
    plt.show()
    
    # 詳細な統計情報
    print("\n=== 予測性能詳細 ===")
    for name, model in best_models.items():
        y_pred = model.predict(X_test)
        
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"\n{name}:")
        print(f"  MSE: {mse:.4f}")
        print(f"  MAE: {mae:.4f}")
        print(f"  RMSE: {np.sqrt(mse):.4f}")
        print(f"  R²: {r2:.4f}")
        
        # 着順予測の精度（±1着以内の正答率）
        correct_within_1 = np.abs(y_test - y_pred) <= 1
        accuracy_within_1 = correct_within_1.mean()
        print(f"  ±1着以内正答率: {accuracy_within_1:.3f}")

# 予測結果分析の実行
analyze_prediction_results(ensemble_models, X_test, y_test)
```

## 8. リアルタイム予想システム

### 8.1 予想システムのインターフェース

```python
# セル14: リアルタイム予想システム
import ipywidgets as widgets
from IPython.display import display, clear_output

class HorseRacePredictionSystem:
    """競馬予想システムのインターフェース"""
    
    def __init__(self, model, scaler, feature_columns):
        self.model = model
        self.scaler = scaler
        self.feature_columns = feature_columns
        
        # ウィジェットの作成
        self.create_widgets()
        self.create_interface()
    
    def create_widgets(self):
        """インターフェースウィジェットの作成"""
        
        # 基本情報入力
        self.track_dropdown = widgets.Dropdown(
            options=['東京', '中山', '京都', '阪神', '中京', '新潟', '福島', '小倉'],
            description='競馬場:'
        )
        
        self.distance_slider = widgets.IntSlider(
            value=1600,
            min=1000,
            max=3600,
            step=200,
            description='距離 (m):'
        )
        
        self.track_condition = widgets.Dropdown(
            options=['良', '稍重', '重', '不良'],
            description='馬場状態:'
        )
        
        # 馬情報入力
        self.horse_age = widgets.IntSlider(
            value=4,
            min=2,
            max=10,
            description='馬齢:'
        )
        
        self.weight = widgets.IntSlider(
            value=55,
            min=50,
            max=65,
            description='斤量 (kg):'
        )
        
        self.gate_number = widgets.IntSlider(
            value=8,
            min=1,
            max=18,
            description='枠番:'
        )
        
        self.odds = widgets.FloatSlider(
            value=5.0,
            min=1.0,
            max=100.0,
            step=0.1,
            description='オッズ:'
        )
        
        self.popularity = widgets.IntSlider(
            value=5,
            min=1,
            max=18,
            description='人気:'
        )
        
        # 実行ボタン
        self.predict_button = widgets.Button(
            description='予想実行',
            button_style='success',
            icon='play'
        )
        
        self.predict_button.on_click(self.make_prediction)
        
        # 出力エリア
        self.output = widgets.Output()
    
    def create_interface(self):
        """インターフェースのレイアウト作成"""
        
        race_info = widgets.VBox([
            widgets.HTML('<h3>レース情報</h3>'),
            self.track_dropdown,
            self.distance_slider,
            self.track_condition
        ])
        
        horse_info = widgets.VBox([
            widgets.HTML('<h3>馬情報</h3>'),
            self.horse_age,
            self.weight,
            self.gate_number,
            self.odds,
            self.popularity
        ])
        
        controls = widgets.HBox([race_info, horse_info])
        
        self.interface = widgets.VBox([
            widgets.HTML('<h2>🏇 競馬AI予想システム</h2>'),
            controls,
            self.predict_button,
            self.output
        ])
    
    def make_prediction(self, b):
        """予想の実行"""
        
        with self.output:
            clear_output(wait=True)
            
            # 入力値の取得
            features = self.collect_features()
            
            # 予測実行
            try:
                prediction = self.model.predict([features])[0]
                confidence = self.calculate_confidence(features)
                
                # 結果表示
                self.display_prediction(prediction, confidence, features)
                
            except Exception as e:
                print(f"予想エラー: {e}")
    
    def collect_features(self):
        """特徴量の収集と前処理"""
        
        # 基本特徴量
        features = {
            'horse_age': self.horse_age.value,
            'weight': self.weight.value,
            'gate_number': self.gate_number.value,
            'odds': self.odds.value,
            'popularity': self.popularity.value,
            'distance': self.distance_slider.value,
        }
        
        # 派生特徴量の計算
        features['odds_log'] = np.log1p(features['odds'])
        features['weight_normalized'] = (features['weight'] - 55) / 5
        features['gate_position_encoded'] = 1 if features['gate_number'] <= 4 else 2 if features['gate_number'] >= 13 else 0
        
        # トラック条件のエンコーディング
        track_conditions = {'良': 1, '稍重': 0.8, '重': 0.6, '不良': 0.4}
        features['track_condition_encoded'] = track_conditions.get(self.track_condition.value, 1)
        
        # 競馬場のエンコーディング
        track_mapping = {'東京': 1, '中山': 2, '京都': 3, '阪神': 4, '中京': 5, '新潟': 6, '福島': 7, '小倉': 8}
        features['track_encoded'] = track_mapping.get(self.track_dropdown.value, 1)
        
        # モデルが期待する特徴量順序に合わせる
        feature_vector = []
        for col in self.feature_columns:
            if col in features:
                feature_vector.append(features[col])
            else:
                feature_vector.append(0)  # デフォルト値
        
        return feature_vector
    
    def calculate_confidence(self, features):
        """予想の信頼度計算"""
        # 簡易的な信頼度計算
        odds_factor = min(1.0, 10.0 / max(features[3], 1))  # オッズが低いほど信頼度高
        popularity_factor = min(1.0, 10.0 / max(features[4], 1))  # 人気が高いほど信頼度高
        
        confidence = (odds_factor + popularity_factor) / 2
        return min(confidence * 100, 95)  # 最大95%
    
    def display_prediction(self, prediction, confidence, features):
        """予想結果の表示"""
        
        print("🏇 予想結果")
        print("=" * 40)
        print(f"予想着順: {prediction:.1f}着")
        print(f"信頼度: {confidence:.1f}%")
        
        # 着順カテゴリーの判定
        if prediction <= 1.5:
            category = "🥇 勝利候補"
            color = "gold"
        elif prediction <= 3.0:
            category = "🥈 上位入線"
            color = "silver"
        elif prediction <= 6.0:
            category = "🥉 中位争い"
            color = "orange"
        else:
            category = "📉 下位予想"
            color = "gray"
        
        print(f"カテゴリー: {category}")
        
        # 詳細分析
        print("\n📊 詳細分析")
        print("-" * 20)
        print(f"オッズ: {features[3]:.1f}倍")
        print(f"人気: {features[4]:.0f}人気")
        print(f"馬齢: {features[0]:.0f}歳")
        print(f"斤量: {features[1]:.0f}kg")
        print(f"枠番: {features[2]:.0f}番")
        
        # 可視化
        self.plot_prediction_analysis(prediction, features)
    
    def plot_prediction_analysis(self, prediction, features):
        """予想分析のプロット"""
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        
        # 着順分布
        positions = np.arange(1, 11)
        probabilities = np.exp(-(positions - prediction)**2 / 2) 
        probabilities = probabilities / probabilities.sum()
        
        bars = ax1.bar(positions, probabilities, color='skyblue', alpha=0.7)
        ax1.axvline(x=prediction, color='red', linestyle='--', linewidth=2, label=f'予想着順: {prediction:.1f}')
        ax1.set_xlabel('着順')
        ax1.set_ylabel('確率密度')
        ax1.set_title('着順確率分布')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # 特徴量レーダーチャート（主要項目のみ）
        categories = ['オッズ\n(逆数)', '人気\n(逆数)', '馬齢', '斤量', '枠順']
        
        # 正規化（0-1スケール）
        values = [
            min(1.0, 10.0 / max(features[3], 1)),  # オッズ（逆数で正規化）
            min(1.0, 10.0 / max(features[4], 1)),  # 人気（逆数で正規化）
            features[0] / 10.0,                     # 馬齢
            (features[1] - 50) / 15.0,              # 斤量
            features[2] / 18.0                      # 枠番
        ]
        
        # レーダーチャートの作成
        angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False)
        values += values[:1]  # 円を閉じる
        angles = np.concatenate((angles, [angles[0]]))
        
        ax2 = plt.subplot(122, polar=True)
        ax2.plot(angles, values, 'o-', linewidth=2, label='現在の馬', color='blue')
        ax2.fill(angles, values, alpha=0.25, color='blue')
        ax2.set_xticks(angles[:-1])
        ax2.set_xticklabels(categories)
        ax2.set_ylim(0, 1)
        ax2.set_title('特徴量レーダーチャート')
        ax2.grid(True)
        
        plt.tight_layout()
        plt.show()
    
    def display(self):
        """インターフェースの表示"""
        display(self.interface)

# 予想システムのインスタンス作成と表示
feature_columns = X_train.columns.tolist()
prediction_system = HorseRacePredictionSystem(optimized_xgb, scaler, feature_columns)
prediction_system.display()
```

### 8.2 バッチ予想機能

```python
# セル15: バッチ予想機能
def batch_prediction_system(model, race_data_file):
    """複数馬の一括予想"""
    
    print("=== バッチ予想システム ===")
    
    # レースデータの読み込み（CSVファイルから）
    try:
        race_df = pd.read_csv(race_data_file)
        print(f"読み込み完了: {len(race_df)}頭の馬データ")
    except FileNotFoundError:
        # サンプルデータの作成
        print("サンプルレースデータを作成中...")
        race_df = create_sample_race_data()
    
    # 特徴量の前処理
    processed_df = preprocess_batch_data(race_df)
    
    # 一括予想の実行
    predictions = model.predict(processed_df[feature_columns])
    
    # 結果の整理
    results_df = race_df.copy()
    results_df['predicted_finish'] = predictions
    results_df['win_probability'] = calculate_win_probability(predictions)
    results_df['recommendation'] = get_betting_recommendation(predictions, results_df['odds'])
    
    # 結果のソート（予想着順順）
    results_df = results_df.sort_values('predicted_finish')
    
    # 結果表示
    display_batch_results(results_df)
    
    return results_df

def create_sample_race_data():
    """サンプルレースデータの作成"""
    
    np.random.seed(42)
    
    sample_data = {
        'horse_name': [f'馬{i+1}' for i in range(12)],
        'horse_age': np.random.randint(3, 8, 12),
        'weight': np.random.randint(52, 58, 12),
        'gate_number': range(1, 13),
        'odds': np.random.exponential(5, 12) + 1,
        'popularity': range(1, 13),
        'jockey': [f'騎手{i+1}' for i in range(12)],
        'trainer': [f'調教師{i+1}' for i in range(12)]
    }
    
    return pd.DataFrame(sample_data)

def preprocess_batch_data(df):
    """バッチデータの前処理"""
    
    processed_df = df.copy()
    
    # 派生特徴量の作成
    processed_df['odds_log'] = np.log1p(processed_df['odds'])
    processed_df['weight_normalized'] = (processed_df['weight'] - 55) / 5
    processed_df['gate_position_encoded'] = processed_df['gate_number'].apply(
        lambda x: 1 if x <= 4 else 2 if x >= 13 else 0
    )
    
    # 不足する特徴量をダミーで埋める
    for col in feature_columns:
        if col not in processed_df.columns:
            processed_df[col] = 0
    
    return processed_df

def calculate_win_probability(predictions):
    """勝利確率の計算"""
    
    # 着順予想から勝利確率への変換
    win_probs = np.exp(-predictions + 1) / 5  # 簡易的な変換
    win_probs = np.clip(win_probs, 0, 1)
    
    return win_probs

def get_betting_recommendation(predictions, odds):
    """賭け推奨の計算"""
    
    recommendations = []
    
    for pred, odd in zip(predictions, odds):
        expected_value = (1 / pred) * odd  # 簡易期待値
        
        if pred <= 1.5 and expected_value > 1.2:
            recommendations.append("🟢 強推奨")
        elif pred <= 3 and expected_value > 1.1:
            recommendations.append("🟡 推奨")
        elif pred <= 6:
            recommendations.append("⚪ 検討")
        else:
            recommendations.append("🔴 非推奨")
    
    return recommendations

def display_batch_results(results_df):
    """バッチ予想結果の表示"""
    
    print("\n🏇 レース予想結果")
    print("=" * 80)
    
    # 結果テーブルの表示
    display_df = results_df[[
        'horse_name', 'predicted_finish', 'win_probability', 
        'odds', 'popularity', 'recommendation'
    ]].round(2)
    
    display_df.columns = ['馬名', '予想着順', '勝率', 'オッズ', '人気', '推奨']
    display(display_df)
    
    # 可視化
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
    
    # 1. 予想着順 vs オッズ
    scatter = ax1.scatter(
        results_df['predicted_finish'], 
        results_df['odds'], 
        c=results_df['win_probability'], 
        cmap='RdYlGn',
        s=100,
        alpha=0.7
    )
    ax1.set_xlabel('予想着順')
    ax1.set_ylabel('オッズ')
    ax1.set_title('予想着順 vs オッズ（色=勝利確率）')
    plt.colorbar(scatter, ax=ax1, label='勝利確率')
    
    # 馬名をラベル表示
    for i, txt in enumerate(results_df['horse_name']):
        ax1.annotate(txt, (results_df['predicted_finish'].iloc[i], results_df['odds'].iloc[i]))
    
    # 2. 勝利確率ランキング
    top_horses = results_df.nlargest(8, 'win_probability')
    bars = ax2.barh(range(len(top_horses)), top_horses['win_probability'], color='skyblue')
    ax2.set_yticks(range(len(top_horses)))
    ax2.set_yticklabels(top_horses['horse_name'])
    ax2.set_xlabel('勝利確率')
    ax2.set_title('勝利確率 Top 8')
    
    # 確率値をバーに表示
    for i, bar in enumerate(bars):
        width = bar.get_width()
        ax2.text(width + 0.01, bar.get_y() + bar.get_height()/2, 
                f'{width:.3f}', ha='left', va='center')
    
    # 3. 推奨度分布
    recommendation_counts = results_df['recommendation'].value_counts()
    colors = ['red', 'orange', 'yellow', 'green'][:len(recommendation_counts)]
    ax3.pie(recommendation_counts.values, labels=recommendation_counts.index, 
            autopct='%1.0f%%', colors=colors)
    ax3.set_title('賭け推奨度分布')
    
    # 4. 人気 vs 予想着順
    ax4.scatter(results_df['popularity'], results_df['predicted_finish'], s=100, alpha=0.7)
    ax4.plot([1, results_df['popularity'].max()], [1, results_df['popularity'].max()], 
             'r--', alpha=0.5, label='人気=予想着順')
    ax4.set_xlabel('人気')
    ax4.set_ylabel('予想着順')
    ax4.set_title('人気 vs 予想着順')
    ax4.legend()
    
    # 馬名をラベル表示
    for i, txt in enumerate(results_df['horse_name']):
        ax4.annotate(txt, (results_df['popularity'].iloc[i], results_df['predicted_finish'].iloc[i]))
    
    plt.tight_layout()
    plt.show()
    
    # 投資戦略の提案
    print("\n💰 投資戦略提案")
    print("-" * 40)
    
    strong_recommendations = results_df[results_df['recommendation'] == "🟢 強推奨"]
    if len(strong_recommendations) > 0:
        print("強推奨馬:")
        for _, horse in strong_recommendations.iterrows():
            roi = (horse['odds'] * horse['win_probability'] - 1) * 100
            print(f"  {horse['horse_name']}: 予想{horse['predicted_finish']:.1f}着, ROI期待値 {roi:.1f}%")
    
    recommendations = results_df[results_df['recommendation'] == "🟡 推奨"]
    if len(recommendations) > 0:
        print("推奨馬:")
        for _, horse in recommendations.iterrows():
            roi = (horse['odds'] * horse['win_probability'] - 1) * 100
            print(f"  {horse['horse_name']}: 予想{horse['predicted_finish']:.1f}着, ROI期待値 {roi:.1f}%")

# バッチ予想システムの実行
batch_results = batch_prediction_system(optimized_xgb, 'sample_race_data.csv')
```

## 9. モデルの保存と読み込み

### 9.1 モデルの永続化

```python
# セル16: モデルの保存
import joblib
import pickle
from datetime import datetime
import json

def save_trained_model(model, scaler, feature_columns, model_name="horse_ai_model"):
    """訓練済みモデルの保存"""
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_dir = f"../models/{model_name}_{timestamp}"
    
    import os
    os.makedirs(model_dir, exist_ok=True)
    
    # モデル本体の保存
    model_path = f"{model_dir}/model.joblib"
    joblib.dump(model, model_path)
    
    # スケーラーの保存
    scaler_path = f"{model_dir}/scaler.joblib"
    joblib.dump(scaler, scaler_path)
    
    # 特徴量情報の保存
    feature_info = {
        'feature_columns': feature_columns,
        'n_features': len(feature_columns),
        'model_type': type(model).__name__,
        'created_at': datetime.now().isoformat(),
        'training_data_shape': f"{X_train.shape[0]}x{X_train.shape[1]}"
    }
    
    with open(f"{model_dir}/feature_info.json", 'w', encoding='utf-8') as f:
        json.dump(feature_info, f, ensure_ascii=False, indent=2)
    
    # モデル性能情報の保存
    y_pred_test = model.predict(X_test)
    performance = {
        'test_mse': float(mean_squared_error(y_test, y_pred_test)),
        'test_mae': float(mean_absolute_error(y_test, y_pred_test)),
        'test_r2': float(r2_score(y_test, y_pred_test)),
        'feature_importance': dict(zip(feature_columns, 
                                     getattr(model, 'feature_importances_', [0]*len(feature_columns))))
    }
    
    with open(f"{model_dir}/performance.json", 'w') as f:
        json.dump(performance, f, indent=2)
    
    # READMEファイルの作成
    readme_content = f"""# 競馬AI予想モデル

## モデル情報
- 作成日時: {datetime.now()}
- モデルタイプ: {type(model).__name__}
- 特徴量数: {len(feature_columns)}
- 学習データサイズ: {X_train.shape[0]} samples

## 性能指標
- Test MSE: {performance['test_mse']:.4f}
- Test MAE: {performance['test_mae']:.4f}
- Test R²: {performance['test_r2']:.4f}

## ファイル構成
- `model.joblib`: 訓練済みモデル
- `scaler.joblib`: 特徴量スケーラー
- `feature_info.json`: 特徴量情報
- `performance.json`: 性能指標
- `README.md`: このファイル

## 使用方法
```python
import joblib

# モデル読み込み
model = joblib.load('model.joblib')
scaler = joblib.load('scaler.joblib')

# 予測実行
predictions = model.predict(features)
```
"""
    
    with open(f"{model_dir}/README.md", 'w', encoding='utf-8') as f:
        f.write(readme_content)
    
    print(f"モデル保存完了: {model_dir}")
    print(f"  - Model: {model_path}")
    print(f"  - Scaler: {scaler_path}")
    print(f"  - Feature Info: {feature_info}")
    print(f"  - Performance: {performance}")
    
    return model_dir

# 最良モデルの保存
saved_model_dir = save_trained_model(
    optimized_xgb, 
    scaler, 
    feature_columns, 
    "optimized_xgboost"
)
```

### 9.2 モデルの読み込みと使用

```python
# セル17: モデルの読み込み
def load_trained_model(model_dir):
    """保存済みモデルの読み込み"""
    
    # モデル本体の読み込み
    model = joblib.load(f"{model_dir}/model.joblib")
    
    # スケーラーの読み込み
    scaler = joblib.load(f"{model_dir}/scaler.joblib")
    
    # 特徴量情報の読み込み
    with open(f"{model_dir}/feature_info.json", 'r', encoding='utf-8') as f:
        feature_info = json.load(f)
    
    # 性能情報の読み込み
    with open(f"{model_dir}/performance.json", 'r') as f:
        performance = json.load(f)
    
    print(f"モデル読み込み完了: {model_dir}")
    print(f"  - モデルタイプ: {feature_info['model_type']}")
    print(f"  - 特徴量数: {feature_info['n_features']}")
    print(f"  - 作成日時: {feature_info['created_at']}")
    print(f"  - Test R²: {performance['test_r2']:.4f}")
    
    return model, scaler, feature_info, performance

# 保存したモデルの読み込みテスト
loaded_model, loaded_scaler, loaded_feature_info, loaded_performance = load_trained_model(saved_model_dir)

# 読み込んだモデルでの予測テスト
test_predictions = loaded_model.predict(X_test)
print(f"\n読み込みテスト成功 - 予測数: {len(test_predictions)}")
print(f"予測例: {test_predictions[:5]}")
```

## 10. 継続的改善とモニタリング

### 10.1 モデル性能のモニタリング

```python
# セル18: 性能モニタリングシステム
class ModelPerformanceMonitor:
    """モデル性能の継続的モニタリング"""
    
    def __init__(self, model, reference_data):
        self.model = model
        self.reference_X = reference_data[0]
        self.reference_y = reference_data[1]
        self.performance_history = []
        
    def evaluate_performance(self, new_X, new_y, date=None):
        """新しいデータでの性能評価"""
        
        if date is None:
            date = datetime.now()
        
        predictions = self.model.predict(new_X)
        
        performance = {
            'date': date,
            'mse': mean_squared_error(new_y, predictions),
            'mae': mean_absolute_error(new_y, predictions),
            'r2': r2_score(new_y, predictions),
            'sample_size': len(new_y)
        }
        
        self.performance_history.append(performance)
        
        return performance
    
    def detect_drift(self, new_performance, threshold=0.1):
        """性能劣化の検出"""
        
        if len(self.performance_history) < 2:
            return False, "履歴不足"
        
        baseline_r2 = self.performance_history[0]['r2']
        current_r2 = new_performance['r2']
        
        drift_magnitude = baseline_r2 - current_r2
        
        if drift_magnitude > threshold:
            return True, f"性能劣化検出: R²が{drift_magnitude:.3f}低下"
        
        return False, "性能安定"
    
    def plot_performance_trend(self):
        """性能推移の可視化"""
        
        if not self.performance_history:
            print("モニタリング履歴がありません")
            return
        
        df = pd.DataFrame(self.performance_history)
        
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
        
        # R²の推移
        ax1.plot(df.index, df['r2'], marker='o', linewidth=2, markersize=6)
        ax1.set_title('R² Score 推移')
        ax1.set_ylabel('R² Score')
        ax1.grid(True, alpha=0.3)
        
        # MSEの推移
        ax2.plot(df.index, df['mse'], marker='s', linewidth=2, markersize=6, color='red')
        ax2.set_title('MSE 推移')
        ax2.set_ylabel('MSE')
        ax2.grid(True, alpha=0.3)
        
        # MAEの推移
        ax3.plot(df.index, df['mae'], marker='^', linewidth=2, markersize=6, color='green')
        ax3.set_title('MAE 推移')
        ax3.set_ylabel('MAE')
        ax3.set_xlabel('評価回数')
        ax3.grid(True, alpha=0.3)
        
        # サンプルサイズの推移
        ax4.bar(df.index, df['sample_size'], alpha=0.7, color='orange')
        ax4.set_title('サンプルサイズ')
        ax4.set_ylabel('サンプル数')
        ax4.set_xlabel('評価回数')
        
        plt.tight_layout()
        plt.show()
        
        # 統計サマリー
        print("\n=== 性能モニタリング サマリー ===")
        print(f"評価回数: {len(df)}")
        print(f"R² - 最大: {df['r2'].max():.4f}, 最小: {df['r2'].min():.4f}, 平均: {df['r2'].mean():.4f}")
        print(f"MSE - 最大: {df['mse'].max():.4f}, 最小: {df['mse'].min():.4f}, 平均: {df['mse'].mean():.4f}")
        print(f"MAE - 最大: {df['mae'].max():.4f}, 最小: {df['mae'].min():.4f}, 平均: {df['mae'].mean():.4f}")

# モニタリングシステムの初期化
monitor = ModelPerformanceMonitor(optimized_xgb, (X_test, y_test))

# 初回評価
initial_performance = monitor.evaluate_performance(X_test, y_test)
print("初回性能評価:")
print(f"  R²: {initial_performance['r2']:.4f}")
print(f"  MSE: {initial_performance['mse']:.4f}")
print(f"  MAE: {initial_performance['mae']:.4f}")

# 性能推移の可視化
monitor.plot_performance_trend()
```

### 10.2 自動再学習システム

```python
# セル19: 自動再学習システム
class AutoRetrainingSystem:
    """自動再学習システム"""
    
    def __init__(self, model_class, base_params, retrain_threshold=0.1):
        self.model_class = model_class
        self.base_params = base_params
        self.retrain_threshold = retrain_threshold
        self.training_history = []
        
    def should_retrain(self, current_performance, baseline_performance):
        """再学習が必要かどうかの判定"""
        
        performance_drop = baseline_performance['r2'] - current_performance['r2']
        
        return performance_drop > self.retrain_threshold
    
    def retrain_model(self, X_train, y_train, X_val, y_val):
        """モデルの再学習"""
        
        print("🔄 モデル再学習開始...")
        
        # 新しいモデルの学習
        new_model = self.model_class(**self.base_params)
        new_model.fit(X_train, y_train)
        
        # 検証データでの評価
        val_predictions = new_model.predict(X_val)
        new_performance = {
            'r2': r2_score(y_val, val_predictions),
            'mse': mean_squared_error(y_val, val_predictions),
            'mae': mean_absolute_error(y_val, val_predictions),
            'retrain_date': datetime.now()
        }
        
        self.training_history.append(new_performance)
        
        print(f"✅ 再学習完了")
        print(f"   新しいR²: {new_performance['r2']:.4f}")
        print(f"   新しいMSE: {new_performance['mse']:.4f}")
        
        return new_model, new_performance
    
    def incremental_learning(self, current_model, new_X, new_y):
        """増分学習（対応モデルの場合）"""
        
        try:
            # 一部のモデルは部分学習をサポート
            if hasattr(current_model, 'partial_fit'):
                current_model.partial_fit(new_X, new_y)
                print("✅ 増分学習完了")
                return current_model
            else:
                print("⚠️ このモデルは増分学習をサポートしていません")
                return current_model
        except Exception as e:
            print(f"❌ 増分学習エラー: {e}")
            return current_model
    
    def auto_model_selection(self, X_train, y_train, X_val, y_val):
        """自動モデル選択"""
        
        models = {
            'XGBoost': xgb.XGBRegressor(**self.base_params),
            'LightGBM': lgb.LGBMRegressor(**self.base_params, verbosity=-1),
            'RandomForest': RandomForestRegressor(n_estimators=100, random_state=42)
        }
        
        best_model = None
        best_score = -np.inf
        best_name = None
        
        print("🔍 最適モデル探索中...")
        
        for name, model in models.items():
            try:
                model.fit(X_train, y_train)
                val_pred = model.predict(X_val)
                score = r2_score(y_val, val_pred)
                
                print(f"  {name}: R² = {score:.4f}")
                
                if score > best_score:
                    best_score = score
                    best_model = model
                    best_name = name
                    
            except Exception as e:
                print(f"  {name}: エラー - {e}")
        
        print(f"✅ 最適モデル: {best_name} (R² = {best_score:.4f})")
        
        return best_model, best_name, best_score

# 自動再学習システムの初期化
auto_retrain = AutoRetrainingSystem(
    model_class=xgb.XGBRegressor,
    base_params={
        'n_estimators': 100,
        'max_depth': 6,
        'learning_rate': 0.1,
        'random_state': 42
    }
)

# 再学習のシミュレーション（新しいデータが利用可能な場合）
print("=== 自動再学習システム デモ ===")

# データの分割（新しいデータとしてシミュレーション）
X_retrain, X_new_val, y_retrain, y_new_val = train_test_split(
    X_train, y_train, test_size=0.3, random_state=123
)

# 現在のモデル性能評価
current_perf = {
    'r2': r2_score(y_test, optimized_xgb.predict(X_test)),
    'mse': mean_squared_error(y_test, optimized_xgb.predict(X_test)),
    'mae': mean_absolute_error(y_test, optimized_xgb.predict(X_test))
}

print(f"現在のモデル性能: R² = {current_perf['r2']:.4f}")

# 自動モデル選択の実行
new_model, model_name, model_score = auto_retrain.auto_model_selection(
    X_retrain, y_retrain, X_new_val, y_new_val
)

print(f"\n推奨アクション: {model_name}への更新 (性能向上: {model_score - current_perf['r2']:.4f})")
```

## まとめ

本記事では、Jupyter Notebookを使用した競馬AI開発の包括的な環境構築と実装手法を解説しました。主要なポイントは以下の通りです：

### 開発環境の優位性
1. **インタラクティブ開発**: リアルタイムでのデータ探索と仮説検証
2. **可視化統合**: 分析結果の直感的な理解を促進
3. **実験管理**: ノートブック形式での知見蓄積と共有
4. **プロトタイピング**: 迅速なモデル開発と検証サイクル

### 実装した主要機能
1. **データ探索・前処理**: 効率的なEDAと品質管理
2. **特徴量エンジニアリング**: 高度な派生特徴量の自動生成
3. **機械学習モデル**: アンサンブル手法とハイパーパラメータ最適化
4. **モデル解釈**: SHAP による説明可能AI の実装
5. **予想システム**: インタラクティブ・バッチ両対応の予想インターフェース
6. **継続的改善**: 性能モニタリングと自動再学習システム

### 技術的特徴
- **スケーラビリティ**: 大規模データセットへの対応
- **説明可能性**: 予想根拠の明確化と信頼性向上
- **自動化**: 継続的な学習とモデル更新
- **実用性**: リアルタイム予想とバッチ処理の両立

Jupyter Notebook環境は、研究開発から本格運用まで一貫してサポートする強力なプラットフォームです。本記事で示した手法を基に、さらに高度な分析手法や新しいデータソースを組み込むことで、より精度の高い競馬AI システムを構築していくことができるでしょう。

競馬AI開発においては、継続的なデータ収集、モデル改善、そして実運用での検証が成功の鍵となります。Jupyter Notebookの柔軟性を活かし、データサイエンスのベストプラクティスに従って、持続可能で効果的な予想システムの構築を目指していきましょう。