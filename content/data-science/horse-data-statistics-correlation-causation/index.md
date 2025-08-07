---
title: "競馬データの統計分析 - 相関から因果推論まで"
date: 2025-08-07T10:00:00+09:00
description: "競馬データを用いて統計分析の基礎から応用まで学ぶ。相関分析から回帰分析、因果推論まで段階的に解説し、Pythonでの実装も紹介。"
categories: ["データサイエンス"]
tags: ["統計分析", "相関分析", "因果推論", "競馬データ", "Python", "pandas", "scipy", "matplotlib"]
slug: "horse-data-statistics-correlation-causation"
---

競馬は、多くの要素が複雑に絡み合って結果が決まるスポーツです。馬の血統、騎手の技量、コンディション、天候など、勝敗に影響する要素は数え切れません。この記事では、競馬データを用いて統計分析の手法を体系的に学び、相関分析から因果推論まで段階的に習得していきます。

## なぜ競馬データで統計を学ぶのか

競馬データは統計学習に適した特徴を持っています：

1. **大量のデータ**: 毎年数千レースが開催され、豊富なサンプル数が得られる
2. **多変量データ**: 馬の能力、環境、人的要因など多角的な変数が存在
3. **明確な結果**: 着順という明確な結果変数がある
4. **時系列性**: 過去から現在へのデータの蓄積がある

## 1. 探索的データ分析（EDA）

統計分析の最初のステップは、データの特性を理解することです。

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# 日本語フォント設定
plt.rcParams['font.family'] = 'DejaVu Sans'

# サンプルデータの作成
np.random.seed(42)
n_samples = 1000

# 競馬データのシミュレーション
horse_data = {
    'horse_id': range(1, n_samples + 1),
    'age': np.random.choice([3, 4, 5, 6, 7, 8], n_samples, p=[0.3, 0.25, 0.2, 0.15, 0.07, 0.03]),
    'weight': np.random.normal(480, 25, n_samples),
    'jockey_experience': np.random.exponential(5, n_samples),
    'prize_money': np.random.lognormal(15, 1.2, n_samples),
    'race_distance': np.random.choice([1200, 1400, 1600, 1800, 2000, 2400], n_samples),
    'track_condition': np.random.choice(['良', '稍重', '重', '不良'], n_samples, p=[0.6, 0.25, 0.1, 0.05]),
    'odds': np.random.lognormal(1.5, 0.8, n_samples),
}

# 着順の計算（複数要因に基づく）
base_rank = (
    -0.3 * (horse_data['age'] - 4) ** 2 +  # 4歳がピーク
    0.2 * np.log(horse_data['prize_money']) +
    0.1 * horse_data['jockey_experience'] +
    np.random.normal(0, 2, n_samples)
)
horse_data['finish_position'] = np.clip(np.round(-base_rank + 8), 1, 16).astype(int)

df = pd.DataFrame(horse_data)

# データの基本統計
print("=== データの基本統計 ===")
print(df.describe())
print("\n=== データ型と欠損値 ===")
print(df.info())
```

```python
# 分布の可視化
fig, axes = plt.subplots(2, 3, figsize=(15, 10))
fig.suptitle('競馬データの分布', fontsize=16)

# 馬の年齢分布
axes[0, 0].hist(df['age'], bins=6, edgecolor='black', alpha=0.7)
axes[0, 0].set_title('馬の年齢分布')
axes[0, 0].set_xlabel('年齢')
axes[0, 0].set_ylabel('頻度')

# 馬体重分布
axes[0, 1].hist(df['weight'], bins=30, edgecolor='black', alpha=0.7)
axes[0, 1].set_title('馬体重分布')
axes[0, 1].set_xlabel('体重 (kg)')
axes[0, 1].set_ylabel('頻度')

# 賞金分布（対数スケール）
axes[0, 2].hist(np.log(df['prize_money']), bins=30, edgecolor='black', alpha=0.7)
axes[0, 2].set_title('賞金分布 (log)')
axes[0, 2].set_xlabel('log(賞金)')
axes[0, 2].set_ylabel('頻度')

# オッズ分布
axes[1, 0].hist(df['odds'], bins=50, edgecolor='black', alpha=0.7)
axes[1, 0].set_title('オッズ分布')
axes[1, 0].set_xlabel('オッズ')
axes[1, 0].set_ylabel('頻度')
axes[1, 0].set_xlim(0, 20)

# 着順分布
axes[1, 1].hist(df['finish_position'], bins=16, edgecolor='black', alpha=0.7)
axes[1, 1].set_title('着順分布')
axes[1, 1].set_xlabel('着順')
axes[1, 1].set_ylabel('頻度')

# 騎手経験分布
axes[1, 2].hist(df['jockey_experience'], bins=30, edgecolor='black', alpha=0.7)
axes[1, 2].set_title('騎手経験分布')
axes[1, 2].set_xlabel('経験年数')
axes[1, 2].set_ylabel('頻度')

plt.tight_layout()
plt.show()
```

## 2. 相関分析：変数間の関係性を探る

相関分析は、二つの変数間の線形関係の強さを測定する手法です。

```python
# 数値変数のみを選択
numeric_cols = ['age', 'weight', 'jockey_experience', 'prize_money', 'race_distance', 'odds', 'finish_position']
correlation_matrix = df[numeric_cols].corr()

# 相関行列のヒートマップ
plt.figure(figsize=(10, 8))
mask = np.triu(np.ones_like(correlation_matrix, dtype=bool))
sns.heatmap(correlation_matrix, mask=mask, annot=True, cmap='RdBu_r', 
            center=0, fmt='.3f', square=True)
plt.title('競馬データの相関行列', fontsize=16)
plt.tight_layout()
plt.show()

# 着順と各変数の相関を詳しく分析
print("=== 着順との相関分析 ===")
finish_correlations = df[numeric_cols].corr()['finish_position'].sort_values()
print(finish_correlations)
```

### ピアソンの相関係数 vs スピアマンの順位相関

```python
# ピアソン相関係数（線形関係）とスピアマン相関係数（単調関係）の比較
variables = ['age', 'weight', 'prize_money', 'odds']

fig, axes = plt.subplots(2, 2, figsize=(12, 10))
axes = axes.ravel()

for i, var in enumerate(variables):
    # 散布図とトレンドライン
    axes[i].scatter(df[var], df['finish_position'], alpha=0.5, s=30)
    
    # ピアソン相関
    pearson_r, pearson_p = stats.pearsonr(df[var], df['finish_position'])
    
    # スピアマン相関
    spearman_r, spearman_p = stats.spearmanr(df[var], df['finish_position'])
    
    axes[i].set_xlabel(var)
    axes[i].set_ylabel('着順')
    axes[i].set_title(f'{var} vs 着順\nPearson: r={pearson_r:.3f} (p={pearson_p:.3f})\nSpearman: ρ={spearman_r:.3f} (p={spearman_p:.3f})')
    
    # 回帰線を追加
    z = np.polyfit(df[var], df['finish_position'], 1)
    p = np.poly1d(z)
    axes[i].plot(df[var], p(df[var]), "r--", alpha=0.8, linewidth=2)

plt.tight_layout()
plt.show()
```

## 3. 回帰分析：関係性のモデル化

相関分析で関係性を確認したら、次は回帰分析でその関係をモデル化します。

### 単回帰分析

```python
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error
from sklearn.model_selection import train_test_split

# 賞金と着順の単回帰分析
X = np.log(df['prize_money']).values.reshape(-1, 1)
y = df['finish_position'].values

# 訓練・テストデータの分割
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 回帰モデルの作成
model = LinearRegression()
model.fit(X_train, y_train)

# 予測
y_pred = model.predict(X_test)

# モデル評価
r2 = r2_score(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))

print(f"=== 単回帰分析結果 ===")
print(f"決定係数 (R²): {r2:.4f}")
print(f"RMSE: {rmse:.4f}")
print(f"回帰係数: {model.coef_[0]:.4f}")
print(f"切片: {model.intercept_:.4f}")

# 結果の可視化
plt.figure(figsize=(10, 6))
plt.subplot(1, 2, 1)
plt.scatter(X_test, y_test, alpha=0.6, label='実測値')
plt.scatter(X_test, y_pred, alpha=0.6, color='red', label='予測値')
plt.xlabel('log(賞金)')
plt.ylabel('着順')
plt.legend()
plt.title('単回帰分析：実測値 vs 予測値')

# 残差プロット
plt.subplot(1, 2, 2)
residuals = y_test - y_pred
plt.scatter(y_pred, residuals, alpha=0.6)
plt.axhline(y=0, color='red', linestyle='--')
plt.xlabel('予測値')
plt.ylabel('残差')
plt.title('残差プロット')

plt.tight_layout()
plt.show()
```

### 重回帰分析

```python
# 複数の説明変数を用いた重回帰分析
feature_cols = ['age', 'weight', 'jockey_experience', 'race_distance', 'odds']
X_multi = df[feature_cols].copy()

# ログ変換が必要な変数の処理
X_multi['log_odds'] = np.log(df['odds'])
X_multi = X_multi.drop('odds', axis=1)

# 標準化
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
X_multi_scaled = scaler.fit_transform(X_multi)

# 訓練・テストデータの分割
X_train_multi, X_test_multi, y_train_multi, y_test_multi = train_test_split(
    X_multi_scaled, y, test_size=0.2, random_state=42
)

# 重回帰モデルの作成
multi_model = LinearRegression()
multi_model.fit(X_train_multi, y_train_multi)

# 予測と評価
y_pred_multi = multi_model.predict(X_test_multi)
r2_multi = r2_score(y_test_multi, y_pred_multi)
rmse_multi = np.sqrt(mean_squared_error(y_test_multi, y_pred_multi))

print(f"=== 重回帰分析結果 ===")
print(f"決定係数 (R²): {r2_multi:.4f}")
print(f"RMSE: {rmse_multi:.4f}")

# 特徴量の重要度
feature_names = X_multi.columns
coefficients = multi_model.coef_
feature_importance = pd.DataFrame({
    'feature': feature_names,
    'coefficient': coefficients,
    'abs_coefficient': np.abs(coefficients)
}).sort_values('abs_coefficient', ascending=False)

print("\n=== 特徴量の重要度 ===")
print(feature_importance)

# 特徴量重要度の可視化
plt.figure(figsize=(10, 6))
plt.barh(feature_importance['feature'], feature_importance['coefficient'])
plt.xlabel('回帰係数')
plt.title('重回帰分析：特徴量の重要度')
plt.axvline(x=0, color='black', linestyle='-', alpha=0.3)
plt.tight_layout()
plt.show()
```

## 4. 仮説検定：統計的有意性の検証

統計分析では、観察された関係が偶然なのか、それとも統計的に意味があるのかを判断することが重要です。

```python
from scipy.stats import ttest_ind, chi2_contingency, f_oneway

# 1. t検定：年齢グループ間の着順比較
young_horses = df[df['age'] <= 4]['finish_position']
old_horses = df[df['age'] >= 6]['finish_position']

t_stat, t_pvalue = ttest_ind(young_horses, old_horses)

print("=== t検定結果 ===")
print(f"若馬（4歳以下）の平均着順: {young_horses.mean():.3f}")
print(f"古馬（6歳以上）の平均着順: {old_horses.mean():.3f}")
print(f"t統計量: {t_stat:.4f}")
print(f"p値: {t_pvalue:.6f}")
print(f"有意差: {'あり' if t_pvalue < 0.05 else 'なし'}")

# 2. 一元配置分散分析（ANOVA）：馬場状態による着順の違い
track_groups = [df[df['track_condition'] == condition]['finish_position'] 
                for condition in df['track_condition'].unique()]

f_stat, f_pvalue = f_oneway(*track_groups)

print(f"\n=== ANOVA結果 ===")
print(f"F統計量: {f_stat:.4f}")
print(f"p値: {f_pvalue:.6f}")
print(f"有意差: {'あり' if f_pvalue < 0.05 else 'なし'}")

# 馬場状態別の着順分布
plt.figure(figsize=(12, 6))
plt.subplot(1, 2, 1)
df.boxplot(column='finish_position', by='track_condition', ax=plt.gca())
plt.title('馬場状態別着順分布')
plt.xlabel('馬場状態')
plt.ylabel('着順')

# 3. カイ二乗検定：年齢と入賞（3着以内）の関連性
df['win_place_show'] = (df['finish_position'] <= 3).astype(int)
contingency_table = pd.crosstab(df['age'], df['win_place_show'])

chi2, chi2_pvalue, dof, expected = chi2_contingency(contingency_table)

print(f"\n=== カイ二乗検定結果 ===")
print("クロス集計表:")
print(contingency_table)
print(f"カイ二乗統計量: {chi2:.4f}")
print(f"p値: {chi2_pvalue:.6f}")
print(f"自由度: {dof}")
print(f"有意差: {'あり' if chi2_pvalue < 0.05 else 'なし'}")

plt.subplot(1, 2, 2)
contingency_table.plot(kind='bar', ax=plt.gca())
plt.title('年齢別入賞率')
plt.xlabel('年齢')
plt.ylabel('頭数')
plt.legend(['4着以下', '3着以内'])
plt.xticks(rotation=0)

plt.tight_layout()
plt.show()
```

## 5. 因果推論への入り口

相関関係は因果関係を意味しません。競馬データを用いて因果推論の基本的な考え方を学びましょう。

### 交絡因子（Confounding Variables）の理解

```python
# 見せかけの相関の例：距離と着順の関係
plt.figure(figsize=(15, 5))

# 元の相関
plt.subplot(1, 3, 1)
plt.scatter(df['race_distance'], df['finish_position'], alpha=0.6)
plt.xlabel('レース距離')
plt.ylabel('着順')
plt.title(f'距離 vs 着順\n相関係数: {df["race_distance"].corr(df["finish_position"]):.3f}')

# 年齢で層別化
plt.subplot(1, 3, 2)
for age in sorted(df['age'].unique()):
    age_data = df[df['age'] == age]
    plt.scatter(age_data['race_distance'], age_data['finish_position'], 
               alpha=0.6, label=f'{age}歳')
plt.xlabel('レース距離')
plt.ylabel('着順')
plt.title('年齢別：距離 vs 着順')
plt.legend()

# 賞金で層別化
plt.subplot(1, 3, 3)
df['prize_quartile'] = pd.qcut(df['prize_money'], q=4, labels=['Q1', 'Q2', 'Q3', 'Q4'])
for quartile in df['prize_quartile'].unique():
    quartile_data = df[df['prize_quartile'] == quartile]
    plt.scatter(quartile_data['race_distance'], quartile_data['finish_position'], 
               alpha=0.6, label=f'賞金{quartile}')
plt.xlabel('レース距離')
plt.ylabel('着順')
plt.title('賞金四分位別：距離 vs 着順')
plt.legend()

plt.tight_layout()
plt.show()
```

### シンプソンのパラドックス

```python
# シンプソンのパラドックスの例を作成
def demonstrate_simpsons_paradox():
    # グループAとBで異なる傾向を持つデータを作成
    np.random.seed(123)
    
    # グループA（若い馬）：距離が長いほど成績が良い傾向
    group_a = pd.DataFrame({
        'distance': np.random.choice([1200, 1400], 100),
        'age_group': 'young'
    })
    group_a['performance'] = (group_a['distance'] - 1200) * 0.002 + np.random.normal(0.4, 0.1, 100)
    
    # グループB（古い馬）：距離が長いほど成績が良い傾向（より強い）
    group_b = pd.DataFrame({
        'distance': np.random.choice([1800, 2000], 100),
        'age_group': 'old'
    })
    group_b['performance'] = (group_b['distance'] - 1800) * 0.003 + np.random.normal(0.6, 0.1, 100)
    
    combined = pd.concat([group_a, group_b])
    
    # 全体の相関と各グループの相関を計算
    overall_corr = combined['distance'].corr(combined['performance'])
    young_corr = group_a['distance'].corr(group_a['performance'])
    old_corr = group_b['distance'].corr(group_b['performance'])
    
    plt.figure(figsize=(12, 4))
    
    # 全体のプロット
    plt.subplot(1, 3, 1)
    plt.scatter(combined['distance'], combined['performance'], alpha=0.6)
    plt.xlabel('レース距離')
    plt.ylabel('パフォーマンス')
    plt.title(f'全体\n相関係数: {overall_corr:.3f}')
    
    # グループ別のプロット
    plt.subplot(1, 3, 2)
    colors = ['blue', 'red']
    for i, (group, data) in enumerate(combined.groupby('age_group')):
        plt.scatter(data['distance'], data['performance'], 
                   alpha=0.6, color=colors[i], label=group)
    plt.xlabel('レース距離')
    plt.ylabel('パフォーマンス')
    plt.title('年齢グループ別')
    plt.legend()
    
    # 各グループ内の相関
    plt.subplot(1, 3, 3)
    correlations = [young_corr, old_corr]
    groups = ['young', 'old']
    plt.bar(groups, correlations)
    plt.ylabel('相関係数')
    plt.title('各グループ内の相関')
    plt.axhline(y=0, color='black', linestyle='-', alpha=0.3)
    
    plt.tight_layout()
    plt.show()
    
    print("=== シンプソンのパラドックス ===")
    print(f"全体の相関係数: {overall_corr:.3f}")
    print(f"若い馬の相関係数: {young_corr:.3f}")
    print(f"古い馬の相関係数: {old_corr:.3f}")

demonstrate_simpsons_paradox()
```

## 6. 統計的学習の評価

```python
from sklearn.model_selection import cross_val_score, learning_curve
from sklearn.ensemble import RandomForestRegressor

# 交差検証による汎化性能の評価
def evaluate_models():
    X = df[['age', 'weight', 'jockey_experience', 'race_distance']].values
    y = df['finish_position'].values
    
    models = {
        'Linear Regression': LinearRegression(),
        'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42)
    }
    
    results = {}
    
    for name, model in models.items():
        # 5-fold交差検証
        cv_scores = cross_val_score(model, X, y, cv=5, scoring='neg_mean_squared_error')
        results[name] = {
            'mean_rmse': np.sqrt(-cv_scores.mean()),
            'std_rmse': np.sqrt(cv_scores.std())
        }
    
    return results

# 学習曲線の描画
def plot_learning_curves():
    X = df[['age', 'weight', 'jockey_experience', 'race_distance']].values
    y = df['finish_position'].values
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    
    train_sizes, train_scores, val_scores = learning_curve(
        model, X, y, train_sizes=np.linspace(0.1, 1.0, 10),
        cv=5, scoring='neg_mean_squared_error', random_state=42
    )
    
    # RMSEに変換
    train_rmse = np.sqrt(-train_scores)
    val_rmse = np.sqrt(-val_scores)
    
    plt.figure(figsize=(10, 6))
    plt.plot(train_sizes, train_rmse.mean(axis=1), 'o-', label='訓練誤差', linewidth=2)
    plt.fill_between(train_sizes, 
                     train_rmse.mean(axis=1) - train_rmse.std(axis=1),
                     train_rmse.mean(axis=1) + train_rmse.std(axis=1), 
                     alpha=0.3)
    
    plt.plot(train_sizes, val_rmse.mean(axis=1), 'o-', label='検証誤差', linewidth=2)
    plt.fill_between(train_sizes, 
                     val_rmse.mean(axis=1) - val_rmse.std(axis=1),
                     val_rmse.mean(axis=1) + val_rmse.std(axis=1), 
                     alpha=0.3)
    
    plt.xlabel('訓練サンプル数')
    plt.ylabel('RMSE')
    plt.title('学習曲線：Random Forest')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()

# モデル評価の実行
evaluation_results = evaluate_models()
print("=== モデル評価結果 ===")
for model_name, results in evaluation_results.items():
    print(f"{model_name}:")
    print(f"  RMSE (平均): {results['mean_rmse']:.4f}")
    print(f"  RMSE (標準偏差): {results['std_rmse']:.4f}")

plot_learning_curves()
```

## まとめ

この記事では、競馬データを用いて統計分析の基礎から応用まで学習しました：

### 学習した統計手法

1. **探索的データ分析（EDA）**: データの分布と特性の理解
2. **相関分析**: 変数間の関係性の定量化
3. **回帰分析**: 関係性のモデル化と予測
4. **仮説検定**: 統計的有意性の検証
5. **因果推論の基礎**: 相関と因果の違いの理解

### 重要なポイント

- **相関 ≠ 因果**: 相関関係があっても因果関係があるとは限らない
- **交絡因子**: 見せかけの相関を生む第三の変数の存在
- **統計的有意性**: p値の解釈と多重検定の問題
- **モデル評価**: 交差検証による汎化性能の評価

### 実践的な教訓

競馬データ分析から得られる統計学の教訓は、ビジネスや研究の様々な場面で活用できます：

1. **データドリブン意思決定**: 感覚や経験だけでなく、データに基づいた判断
2. **仮説の立案と検証**: 明確な仮説を立て、データで検証するプロセス
3. **バイアスの認識**: 確証バイアスや生存者バイアスへの注意
4. **不確実性の定量化**: 予測の信頼区間と限界の理解

統計分析は、データから価値ある洞察を得るための強力なツールです。競馬データのような身近な題材を通じて学んだ手法は、より複雑な問題解決にも応用できるでしょう。次のステップとして、機械学習手法やより高度な因果推論手法への発展を検討してみてください。