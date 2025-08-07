---
title: "ベイズ統計で競馬予想の不確実性を定量化"
date: 2025-08-07T11:00:00+09:00
description: "ベイズ統計を用いて競馬予想の不確実性を定量化し、事前知識と観測データから事後分布を求める方法をPythonで実装。信頼区間や予測区間の計算も解説。"
categories: ["データサイエンス"]
tags: ["ベイズ統計", "競馬予想", "不確実性定量化", "Python", "scipy", "pymc", "matplotlib", "事前分布", "事後分布"]
slug: "bayesian-statistics-horse-prediction-uncertainty"
---

競馬予想は本質的に不確実性を伴う問題です。どんなに詳細にデータを分析しても、100%の確率で結果を予測することは不可能です。この不確実性を適切に扱い、定量化する手法として注目されているのがベイズ統計学です。

この記事では、ベイズ統計の基本概念から始まり、競馬データを用いた実践的な応用まで段階的に学んでいきます。

## ベイズ統計学とは何か

### 頻度主義統計学 vs ベイズ統計学

従来の頻度主義統計学では、パラメータは固定された未知の値として扱われます。一方、ベイズ統計学では、パラメータ自体も確率分布を持つ確率変数として扱います。

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.optimize import minimize
import warnings
warnings.filterwarnings('ignore')

# 日本語フォント設定
plt.rcParams['font.family'] = 'DejaVu Sans'

# ベイズの定理の可視化
def visualize_bayes_theorem():
    """ベイズの定理を可視化"""
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    
    # 事前分布 P(θ)
    x = np.linspace(0, 1, 100)
    prior = stats.beta(2, 2)  # 事前分布：Beta(2, 2)
    
    axes[0].plot(x, prior.pdf(x), 'b-', linewidth=2, label='事前分布')
    axes[0].set_xlabel('パラメータ θ')
    axes[0].set_ylabel('確率密度')
    axes[0].set_title('事前分布 P(θ)')
    axes[0].grid(True, alpha=0.3)
    axes[0].legend()
    
    # 尤度 P(データ|θ)
    theta_values = [0.2, 0.5, 0.8]
    n_trials = 10
    successes = 7
    
    for i, theta in enumerate(theta_values):
        likelihood = stats.binom(n_trials, theta)
        x_binom = np.arange(0, n_trials + 1)
        axes[1].plot(x_binom, likelihood.pmf(x_binom), 'o-', 
                    label=f'θ={theta}', alpha=0.7)
    axes[1].axvline(x=successes, color='red', linestyle='--', 
                   label=f'観測データ: {successes}勝')
    axes[1].set_xlabel('成功回数')
    axes[1].set_ylabel('確率')
    axes[1].set_title('尤度 P(データ|θ)')
    axes[1].grid(True, alpha=0.3)
    axes[1].legend()
    
    # 事後分布 P(θ|データ)
    # Beta-Binomial共役性を利用
    posterior = stats.beta(2 + successes, 2 + n_trials - successes)
    
    axes[2].plot(x, prior.pdf(x), 'b-', linewidth=2, label='事前分布', alpha=0.5)
    axes[2].plot(x, posterior.pdf(x), 'r-', linewidth=2, label='事後分布')
    axes[2].set_xlabel('パラメータ θ')
    axes[2].set_ylabel('確率密度')
    axes[2].set_title('事後分布 P(θ|データ)')
    axes[2].grid(True, alpha=0.3)
    axes[2].legend()
    
    plt.tight_layout()
    plt.show()
    
    # 統計値の比較
    print("=== ベイズ更新の結果 ===")
    print(f"事前分布の平均: {prior.mean():.3f}")
    print(f"事後分布の平均: {posterior.mean():.3f}")
    print(f"事後分布の95%信頼区間: [{posterior.ppf(0.025):.3f}, {posterior.ppf(0.975):.3f}]")

visualize_bayes_theorem()
```

### ベイズの定理の数学的表現

ベイズの定理は以下の式で表されます：

$$P(\theta|D) = \frac{P(D|\theta) \cdot P(\theta)}{P(D)}$$

ここで：
- $P(\theta|D)$: 事後分布（データを観測した後のパラメータの分布）
- $P(D|\theta)$: 尤度（パラメータが与えられたときのデータの確率）
- $P(\theta)$: 事前分布（データを観測する前のパラメータに対する信念）
- $P(D)$: 周辺化尤度（正規化定数）

## 競馬データでのベイズ分析

### データの準備

```python
# 競馬データのシミュレーション
np.random.seed(42)
n_horses = 500
n_races = 100

# 馬の真の能力をベータ分布から生成
true_abilities = np.random.beta(2, 5, n_horses)  # 真の勝率

# レースデータの生成
race_data = []
for race_id in range(n_races):
    # 各レースに8頭が出走
    participating_horses = np.random.choice(n_horses, 8, replace=False)
    
    for position, horse_id in enumerate(participating_horses):
        # 勝利確率に基づいて結果を決定（簡略化）
        win_prob = true_abilities[horse_id]
        # 他の馬との相対的な強さを考慮
        relative_strength = win_prob / np.mean(true_abilities[participating_horses])
        finish_position = max(1, min(8, int(8 - 7 * relative_strength + np.random.normal(0, 1))))
        
        race_data.append({
            'race_id': race_id,
            'horse_id': horse_id,
            'finish_position': finish_position,
            'win': 1 if finish_position == 1 else 0,
            'place': 1 if finish_position <= 3 else 0,
            'true_ability': true_abilities[horse_id]
        })

df = pd.DataFrame(race_data)

# データの概要
print("=== 競馬データの概要 ===")
print(f"総レース数: {n_races}")
print(f"総出走頭数: {len(df)}")
print(f"ユニーク馬数: {df['horse_id'].nunique()}")
print("\n基本統計:")
print(df.groupby('horse_id').agg({
    'win': ['count', 'sum', 'mean'],
    'place': 'mean'
}).head(10))
```

## ベイズ更新による勝率推定

### 共役事前分布を用いたベイズ更新

```python
class BayesianHorseAnalyzer:
    """競馬馬のベイズ分析クラス"""
    
    def __init__(self, alpha_prior=1, beta_prior=1):
        """
        Parameters:
        alpha_prior: ベータ分布の事前パラメータα（成功に対応）
        beta_prior: ベータ分布の事前パラメータβ（失敗に対応）
        """
        self.alpha_prior = alpha_prior
        self.beta_prior = beta_prior
    
    def update_posterior(self, wins, total_races):
        """ベイズ更新により事後分布を計算"""
        alpha_posterior = self.alpha_prior + wins
        beta_posterior = self.beta_prior + total_races - wins
        return alpha_posterior, beta_posterior
    
    def get_posterior_stats(self, alpha_post, beta_post):
        """事後分布の統計量を計算"""
        posterior = stats.beta(alpha_post, beta_post)
        return {
            'mean': posterior.mean(),
            'std': posterior.std(),
            'ci_lower': posterior.ppf(0.025),
            'ci_upper': posterior.ppf(0.975),
            'median': posterior.median()
        }
    
    def analyze_horse(self, horse_id, data):
        """特定の馬の分析"""
        horse_data = data[data['horse_id'] == horse_id]
        wins = horse_data['win'].sum()
        total_races = len(horse_data)
        
        if total_races == 0:
            return None
        
        # 事後分布のパラメータ
        alpha_post, beta_post = self.update_posterior(wins, total_races)
        
        # 統計量の計算
        stats_dict = self.get_posterior_stats(alpha_post, beta_post)
        stats_dict.update({
            'horse_id': horse_id,
            'wins': wins,
            'total_races': total_races,
            'observed_win_rate': wins / total_races if total_races > 0 else 0,
            'alpha_posterior': alpha_post,
            'beta_posterior': beta_post
        })
        
        return stats_dict

# ベイズ分析の実行
analyzer = BayesianHorseAnalyzer(alpha_prior=1, beta_prior=9)  # 弱い事前分布（勝率10%程度を想定）

# 全馬の分析
results = []
for horse_id in df['horse_id'].unique():
    result = analyzer.analyze_horse(horse_id, df)
    if result and result['total_races'] >= 5:  # 5回以上出走した馬のみ
        results.append(result)

results_df = pd.DataFrame(results)

# 結果の可視化
def plot_bayesian_analysis(results_df, sample_horses=10):
    """ベイズ分析結果の可視化"""
    
    # サンプル馬を選択（出走数でソート）
    sample_df = results_df.nlargest(sample_horses, 'total_races')
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    
    # 1. 観測勝率 vs ベイズ推定勝率
    axes[0, 0].scatter(sample_df['observed_win_rate'], sample_df['mean'], 
                      alpha=0.7, s=sample_df['total_races']*10)
    axes[0, 0].plot([0, 0.5], [0, 0.5], 'r--', alpha=0.5)
    axes[0, 0].set_xlabel('観測勝率')
    axes[0, 0].set_ylabel('ベイズ推定勝率（平均）')
    axes[0, 0].set_title('観測勝率 vs ベイズ推定勝率')
    axes[0, 0].grid(True, alpha=0.3)
    
    # 2. 信頼区間の幅 vs 出走数
    sample_df['ci_width'] = sample_df['ci_upper'] - sample_df['ci_lower']
    axes[0, 1].scatter(sample_df['total_races'], sample_df['ci_width'], alpha=0.7)
    axes[0, 1].set_xlabel('出走数')
    axes[0, 1].set_ylabel('95%信頼区間の幅')
    axes[0, 1].set_title('出走数と予測の不確実性')
    axes[0, 1].grid(True, alpha=0.3)
    
    # 3. 事後分布の例（上位3頭）
    top_horses = sample_df.nlargest(3, 'mean')
    x = np.linspace(0, 0.8, 200)
    
    for i, (_, horse) in enumerate(top_horses.iterrows()):
        posterior = stats.beta(horse['alpha_posterior'], horse['beta_posterior'])
        axes[1, 0].plot(x, posterior.pdf(x), label=f"馬{horse['horse_id']:.0f} ({horse['wins']:.0f}/{horse['total_races']:.0f})")
    
    axes[1, 0].set_xlabel('勝率')
    axes[1, 0].set_ylabel('確率密度')
    axes[1, 0].set_title('事後分布の比較（上位3頭）')
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)
    
    # 4. 真の能力 vs 推定能力（真の値が分かる場合）
    # 馬IDに基づいて真の能力を取得
    sample_df['true_ability'] = sample_df['horse_id'].map(lambda x: true_abilities[int(x)])
    
    axes[1, 1].scatter(sample_df['true_ability'], sample_df['mean'], alpha=0.7)
    axes[1, 1].plot([0, 0.6], [0, 0.6], 'r--', alpha=0.5)
    axes[1, 1].set_xlabel('真の能力')
    axes[1, 1].set_ylabel('ベイズ推定勝率')
    axes[1, 1].set_title('真の能力 vs 推定能力')
    axes[1, 1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.show()
    
    return sample_df

sample_results = plot_bayesian_analysis(results_df)

# 統計的サマリー
print("\n=== ベイズ分析結果サマリー ===")
print(f"分析対象馬数: {len(results_df)}")
print(f"平均出走数: {results_df['total_races'].mean():.1f}")
print(f"平均観測勝率: {results_df['observed_win_rate'].mean():.3f}")
print(f"平均ベイズ推定勝率: {results_df['mean'].mean():.3f}")
print(f"平均信頼区間幅: {(results_df['ci_upper'] - results_df['ci_lower']).mean():.3f}")
```

## 階層ベイズモデル

個々の馬の能力は完全に独立ではありません。血統、厩舎、調教師などの共通要因があります。階層ベイズモデルでこれを表現してみましょう。

```python
# 階層ベイズモデルのシミュレーション
def hierarchical_bayesian_model():
    """階層ベイズモデルの実装"""
    
    # 厩舎グループを追加
    n_stables = 20
    stable_effects = np.random.normal(0, 0.1, n_stables)  # 厩舎効果
    
    # 各馬に厩舎を割り当て
    horse_stables = np.random.choice(n_stables, n_horses)
    
    # 階層構造を考慮した真の能力
    hierarchical_abilities = np.zeros(n_horses)
    for i in range(n_horses):
        stable_id = horse_stables[i]
        base_ability = np.random.beta(2, 5)  # 基本能力
        stable_bonus = stable_effects[stable_id]  # 厩舎効果
        hierarchical_abilities[i] = np.clip(base_ability + stable_bonus, 0, 1)
    
    return horse_stables, stable_effects, hierarchical_abilities

horse_stables, stable_effects, hierarchical_abilities = hierarchical_bayesian_model()

# 厩舎別分析
stable_analysis = []
for stable_id in range(len(stable_effects)):
    horses_in_stable = np.where(horse_stables == stable_id)[0]
    if len(horses_in_stable) > 0:
        stable_data = df[df['horse_id'].isin(horses_in_stable)]
        if len(stable_data) > 0:
            total_races = len(stable_data)
            total_wins = stable_data['win'].sum()
            stable_analysis.append({
                'stable_id': stable_id,
                'n_horses': len(horses_in_stable),
                'total_races': total_races,
                'total_wins': total_wins,
                'win_rate': total_wins / total_races,
                'true_stable_effect': stable_effects[stable_id]
            })

stable_df = pd.DataFrame(stable_analysis)

# 厩舎効果の可視化
plt.figure(figsize=(12, 8))

plt.subplot(2, 2, 1)
plt.scatter(stable_df['true_stable_effect'], stable_df['win_rate'], 
           s=stable_df['total_races'], alpha=0.7)
plt.xlabel('真の厩舎効果')
plt.ylabel('観測勝率')
plt.title('厩舎効果 vs 観測勝率')
plt.grid(True, alpha=0.3)

plt.subplot(2, 2, 2)
plt.hist(stable_df['win_rate'], bins=15, edgecolor='black', alpha=0.7)
plt.xlabel('厩舎別勝率')
plt.ylabel('頻度')
plt.title('厩舎別勝率の分布')

plt.subplot(2, 2, 3)
plt.boxplot([stable_df[stable_df['n_horses'] == n]['win_rate'].values 
            for n in sorted(stable_df['n_horses'].unique()) if n >= 3])
plt.xlabel('厩舎内馬数')
plt.ylabel('勝率')
plt.title('厩舎規模別勝率')

plt.subplot(2, 2, 4)
plt.scatter(stable_df['total_races'], stable_df['win_rate'], alpha=0.7)
plt.xlabel('総出走数')
plt.ylabel('勝率')
plt.title('出走数 vs 勝率')
plt.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

print("=== 階層分析結果 ===")
print(f"厩舎数: {len(stable_df)}")
print(f"厩舎別勝率の標準偏差: {stable_df['win_rate'].std():.3f}")
print(f"真の厩舎効果の標準偏差: {stable_df['true_stable_effect'].std():.3f}")
```

## 予測分布と不確実性の定量化

### 新しい馬の勝率予測

```python
class BayesianPredictor:
    """ベイズ予測器"""
    
    def __init__(self, alpha_prior=1, beta_prior=9):
        self.alpha_prior = alpha_prior
        self.beta_prior = beta_prior
    
    def predict_win_probability(self, past_wins, past_races, n_future_races=1):
        """将来の勝利確率を予測"""
        
        # 事後分布のパラメータ
        alpha_post = self.alpha_prior + past_wins
        beta_post = self.beta_prior + past_races - past_wins
        
        # 予測分布（ベータ二項分布）
        predictions = []
        for n_wins in range(n_future_races + 1):
            prob = self.beta_binomial_pmf(n_wins, n_future_races, alpha_post, beta_post)
            predictions.append(prob)
        
        return predictions, alpha_post, beta_post
    
    def beta_binomial_pmf(self, k, n, alpha, beta):
        """ベータ二項分布の確率質量関数"""
        from math import comb
        from scipy.special import beta as beta_func
        
        coeff = comb(n, k)
        beta_ratio = beta_func(k + alpha, n - k + beta) / beta_func(alpha, beta)
        return coeff * beta_ratio
    
    def prediction_interval(self, alpha_post, beta_post, confidence=0.95):
        """予測区間の計算"""
        posterior = stats.beta(alpha_post, beta_post)
        lower = (1 - confidence) / 2
        upper = 1 - lower
        return posterior.ppf(lower), posterior.ppf(upper)

# 予測分析の実行
predictor = BayesianPredictor()

# サンプル馬での予測例
sample_horse = results_df.iloc[0]
print(f"=== 馬ID {sample_horse['horse_id']:.0f} の予測分析 ===")
print(f"過去の成績: {sample_horse['wins']:.0f}勝/{sample_horse['total_races']:.0f}戦")
print(f"観測勝率: {sample_horse['observed_win_rate']:.3f}")
print(f"ベイズ推定勝率: {sample_horse['mean']:.3f} (95%CI: {sample_horse['ci_lower']:.3f}-{sample_horse['ci_upper']:.3f})")

# 次回レースでの勝利確率予測
future_predictions, alpha_post, beta_post = predictor.predict_win_probability(
    sample_horse['wins'], sample_horse['total_races'], n_future_races=1
)

print(f"\n次回レースでの予測:")
print(f"勝利確率: {future_predictions[1]:.3f}")
print(f"敗北確率: {future_predictions[0]:.3f}")

# 複数レースでの予測
n_future = 5
multi_predictions, _, _ = predictor.predict_win_probability(
    sample_horse['wins'], sample_horse['total_races'], n_future_races=n_future
)

# 予測分布の可視化
plt.figure(figsize=(15, 10))

# 事後分布
plt.subplot(2, 3, 1)
x = np.linspace(0, 0.5, 200)
posterior = stats.beta(alpha_post, beta_post)
plt.plot(x, posterior.pdf(x), 'b-', linewidth=2)
plt.axvline(sample_horse['mean'], color='red', linestyle='--', label='事後平均')
plt.axvline(sample_horse['observed_win_rate'], color='green', linestyle='--', label='観測勝率')
plt.xlabel('勝率')
plt.ylabel('確率密度')
plt.title('事後分布')
plt.legend()
plt.grid(True, alpha=0.3)

# 次回レース予測
plt.subplot(2, 3, 2)
plt.bar(['敗北', '勝利'], future_predictions, alpha=0.7)
plt.ylabel('確率')
plt.title('次回レース予測')
plt.grid(True, alpha=0.3)

# 5戦での勝数予測分布
plt.subplot(2, 3, 3)
plt.bar(range(n_future + 1), multi_predictions, alpha=0.7)
plt.xlabel('勝数')
plt.ylabel('確率')
plt.title(f'今後{n_future}戦での勝数予測')
plt.grid(True, alpha=0.3)

# 信頼度別の予測区間
confidence_levels = [0.5, 0.8, 0.9, 0.95, 0.99]
intervals = []
for conf in confidence_levels:
    lower, upper = predictor.prediction_interval(alpha_post, beta_post, conf)
    intervals.append((conf, lower, upper, upper - lower))

intervals_df = pd.DataFrame(intervals, columns=['confidence', 'lower', 'upper', 'width'])

plt.subplot(2, 3, 4)
plt.plot(intervals_df['confidence'], intervals_df['width'], 'o-', linewidth=2)
plt.xlabel('信頼度')
plt.ylabel('予測区間幅')
plt.title('信頼度と予測区間幅')
plt.grid(True, alpha=0.3)

# 事前分布の感度分析
plt.subplot(2, 3, 5)
prior_settings = [(1, 1), (1, 9), (2, 8), (5, 5)]  # (alpha, beta)
x = np.linspace(0, 1, 200)

for alpha_p, beta_p in prior_settings:
    alpha_post_sens = alpha_p + sample_horse['wins']
    beta_post_sens = beta_p + sample_horse['total_races'] - sample_horse['wins']
    posterior_sens = stats.beta(alpha_post_sens, beta_post_sens)
    plt.plot(x, posterior_sens.pdf(x), label=f'Prior: Beta({alpha_p},{beta_p})')

plt.xlabel('勝率')
plt.ylabel('確率密度')
plt.title('事前分布の感度分析')
plt.legend()
plt.grid(True, alpha=0.3)

# モデル比較（AIC/BIC風）
plt.subplot(2, 3, 6)
model_names = ['一様事前分布', '弱情報事前分布', '中程度情報事前分布']
model_scores = []

for alpha_p, beta_p in [(1, 1), (1, 9), (2, 8)]:
    # 対数周辺尤度の近似計算
    alpha_post = alpha_p + sample_horse['wins']
    beta_post = beta_p + sample_horse['total_races'] - sample_horse['wins']
    
    # ベータ関数を用いた周辺尤度の計算
    from scipy.special import beta as beta_func
    log_marginal = (
        beta_func(alpha_post, beta_post) / beta_func(alpha_p, beta_p)
    )
    model_scores.append(np.log(log_marginal))

plt.bar(model_names, model_scores, alpha=0.7)
plt.ylabel('対数周辺尤度（近似）')
plt.title('事前分布設定の比較')
plt.xticks(rotation=45)
plt.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

print("\n=== 予測区間一覧 ===")
print(intervals_df.round(4))
```

## ベイズファクターによるモデル選択

```python
def calculate_bayes_factor(data, model1_params, model2_params):
    """ベイズファクターの計算"""
    
    def marginal_likelihood(wins, total, alpha, beta):
        """周辺尤度の計算"""
        from scipy.special import beta as beta_func
        
        alpha_post = alpha + wins
        beta_post = beta + total - wins
        
        # ベータ二項分布の周辺尤度
        marginal = (
            beta_func(alpha_post, beta_post) / beta_func(alpha, beta)
        )
        return marginal
    
    horse_comparisons = []
    
    for _, horse in results_df.iterrows():
        if horse['total_races'] >= 5:
            ml1 = marginal_likelihood(
                horse['wins'], horse['total_races'], 
                model1_params[0], model1_params[1]
            )
            ml2 = marginal_likelihood(
                horse['wins'], horse['total_races'], 
                model2_params[0], model2_params[1]
            )
            
            bayes_factor = ml1 / ml2
            
            horse_comparisons.append({
                'horse_id': horse['horse_id'],
                'wins': horse['wins'],
                'total_races': horse['total_races'],
                'bayes_factor': bayes_factor,
                'log_bayes_factor': np.log(bayes_factor),
                'evidence': 'Model1' if bayes_factor > 3 else ('Model2' if bayes_factor < 1/3 else 'Inconclusive')
            })
    
    return pd.DataFrame(horse_comparisons)

# モデル比較の実行
model1 = (1, 9)    # 弱情報事前分布
model2 = (2, 8)    # 中程度情報事前分布

comparison_results = calculate_bayes_factor(df, model1, model2)

# 結果の可視化
plt.figure(figsize=(12, 8))

plt.subplot(2, 2, 1)
plt.hist(comparison_results['log_bayes_factor'], bins=20, edgecolor='black', alpha=0.7)
plt.axvline(x=0, color='red', linestyle='--', label='BF=1')
plt.axvline(x=np.log(3), color='orange', linestyle='--', label='BF=3')
plt.axvline(x=np.log(1/3), color='orange', linestyle='--', label='BF=1/3')
plt.xlabel('log(ベイズファクター)')
plt.ylabel('頻度')
plt.title('ベイズファクターの分布')
plt.legend()
plt.grid(True, alpha=0.3)

plt.subplot(2, 2, 2)
evidence_counts = comparison_results['evidence'].value_counts()
plt.pie(evidence_counts.values, labels=evidence_counts.index, autopct='%1.1f%%')
plt.title('モデル選択結果')

plt.subplot(2, 2, 3)
plt.scatter(comparison_results['total_races'], comparison_results['log_bayes_factor'], alpha=0.7)
plt.xlabel('出走数')
plt.ylabel('log(ベイズファクター)')
plt.title('出走数とベイズファクター')
plt.axhline(y=0, color='red', linestyle='--', alpha=0.5)
plt.grid(True, alpha=0.3)

plt.subplot(2, 2, 4)
win_rates = comparison_results['wins'] / comparison_results['total_races']
plt.scatter(win_rates, comparison_results['log_bayes_factor'], alpha=0.7)
plt.xlabel('勝率')
plt.ylabel('log(ベイズファクター)')
plt.title('勝率とベイズファクター')
plt.axhline(y=0, color='red', linestyle='--', alpha=0.5)
plt.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

print("=== ベイズファクター分析結果 ===")
print(f"Model1支持: {len(comparison_results[comparison_results['evidence'] == 'Model1'])}")
print(f"Model2支持: {len(comparison_results[comparison_results['evidence'] == 'Model2'])}")
print(f"判定不能: {len(comparison_results[comparison_results['evidence'] == 'Inconclusive'])}")
print(f"\n平均log(ベイズファクター): {comparison_results['log_bayes_factor'].mean():.3f}")
```

## 実戦での意思決定支援

ベイズ統計を用いた競馬予想の実戦応用を考えてみましょう。

```python
class BayesianBettingAdvisor:
    """ベイズ統計に基づく馬券購入アドバイザー"""
    
    def __init__(self):
        self.predictor = BayesianPredictor()
    
    def expected_value_analysis(self, horses_data, odds_data):
        """期待値分析"""
        
        recommendations = []
        
        for i, horse in horses_data.iterrows():
            if horse['total_races'] >= 3:  # 最低出走回数
                # ベイズ推定による勝利確率
                win_prob = horse['mean']
                ci_lower = horse['ci_lower']
                ci_upper = horse['ci_upper']
                
                # オッズから払戻率を計算（仮想データ）
                odds = np.random.uniform(2.0, 15.0)  # オッズの仮想生成
                payout = odds
                
                # 期待値の計算
                expected_value = win_prob * payout - 1
                
                # 信頼区間を考慮した期待値範囲
                ev_lower = ci_lower * payout - 1
                ev_upper = ci_upper * payout - 1
                
                # Kelly基準による推奨投資比率
                if win_prob * payout > 1:  # 正の期待値の場合
                    kelly_ratio = (win_prob * payout - 1) / (payout - 1)
                else:
                    kelly_ratio = 0
                
                recommendations.append({
                    'horse_id': horse['horse_id'],
                    'win_prob': win_prob,
                    'ci_lower': ci_lower,
                    'ci_upper': ci_upper,
                    'odds': odds,
                    'expected_value': expected_value,
                    'ev_lower': ev_lower,
                    'ev_upper': ev_upper,
                    'kelly_ratio': min(kelly_ratio, 0.25),  # 最大25%に制限
                    'uncertainty': ci_upper - ci_lower,
                    'recommendation': self._get_recommendation(expected_value, kelly_ratio, ci_upper - ci_lower)
                })
        
        return pd.DataFrame(recommendations)
    
    def _get_recommendation(self, ev, kelly, uncertainty):
        """推奨レベルの決定"""
        if ev > 0.2 and kelly > 0.05 and uncertainty < 0.3:
            return "強く推奨"
        elif ev > 0.1 and kelly > 0.02:
            return "推奨"
        elif ev > 0:
            return "やや推奨"
        else:
            return "非推奨"
    
    def portfolio_optimization(self, recommendations, total_budget=10000):
        """ポートフォリオ最適化"""
        
        positive_ev = recommendations[recommendations['expected_value'] > 0]
        
        if len(positive_ev) == 0:
            return None, "投資推奨馬なし"
        
        # Kelly基準による配分
        total_kelly = positive_ev['kelly_ratio'].sum()
        
        if total_kelly > 1:  # 過剰投資の場合は比例配分
            positive_ev = positive_ev.copy()
            positive_ev['kelly_ratio'] = positive_ev['kelly_ratio'] / total_kelly
        
        # 投資額の計算
        positive_ev = positive_ev.copy()
        positive_ev['investment'] = positive_ev['kelly_ratio'] * total_budget
        
        return positive_ev, f"総投資額: ¥{positive_ev['investment'].sum():.0f}"

# 投資アドバイザーの実行
advisor = BayesianBettingAdvisor()
recommendations = advisor.expected_value_analysis(sample_results, None)

print("=== 投資推奨結果 ===")
print(recommendations[['horse_id', 'win_prob', 'expected_value', 'kelly_ratio', 'recommendation']].head(10).round(4))

# ポートフォリオ最適化
portfolio, message = advisor.portfolio_optimization(recommendations)
print(f"\n=== ポートフォリオ最適化 ===")
print(message)
if portfolio is not None:
    print("\n推奨投資配分:")
    print(portfolio[['horse_id', 'win_prob', 'expected_value', 'investment']].round(2))

# 可視化
plt.figure(figsize=(15, 10))

plt.subplot(2, 3, 1)
plt.scatter(recommendations['win_prob'], recommendations['expected_value'], 
           alpha=0.7, c=recommendations['uncertainty'], cmap='viridis')
plt.colorbar(label='不確実性')
plt.xlabel('勝利確率')
plt.ylabel('期待値')
plt.title('勝利確率 vs 期待値')
plt.axhline(y=0, color='red', linestyle='--', alpha=0.5)
plt.grid(True, alpha=0.3)

plt.subplot(2, 3, 2)
plt.scatter(recommendations['odds'], recommendations['expected_value'], alpha=0.7)
plt.xlabel('オッズ')
plt.ylabel('期待値')
plt.title('オッズ vs 期待値')
plt.axhline(y=0, color='red', linestyle='--', alpha=0.5)
plt.grid(True, alpha=0.3)

plt.subplot(2, 3, 3)
rec_counts = recommendations['recommendation'].value_counts()
plt.pie(rec_counts.values, labels=rec_counts.index, autopct='%1.1f%%')
plt.title('推奨レベル分布')

plt.subplot(2, 3, 4)
plt.hist(recommendations['kelly_ratio'], bins=20, edgecolor='black', alpha=0.7)
plt.xlabel('Kelly比率')
plt.ylabel('頻度')
plt.title('Kelly比率の分布')
plt.grid(True, alpha=0.3)

plt.subplot(2, 3, 5)
plt.scatter(recommendations['uncertainty'], recommendations['expected_value'], alpha=0.7)
plt.xlabel('不確実性（CI幅）')
plt.ylabel('期待値')
plt.title('不確実性 vs 期待値')
plt.axhline(y=0, color='red', linestyle='--', alpha=0.5)
plt.grid(True, alpha=0.3)

plt.subplot(2, 3, 6)
if portfolio is not None:
    plt.bar(range(len(portfolio)), portfolio['investment'])
    plt.xlabel('馬ID')
    plt.ylabel('推奨投資額（円）')
    plt.title('推奨投資配分')
    plt.xticks(range(len(portfolio)), [f"馬{int(x)}" for x in portfolio['horse_id']], rotation=45)

plt.tight_layout()
plt.show()
```

## まとめ

この記事では、ベイズ統計学の基本概念から競馬データでの実践的な応用まで幅広く学習しました。

### 重要なポイント

1. **不確実性の定量化**: ベイズ統計により予測の不確実性を明示的に扱える
2. **事前知識の活用**: 過去の経験や専門知識を事前分布として組み込める
3. **継続的な学習**: 新しいデータで事後分布を更新し続けられる
4. **意思決定支援**: 期待値とリスクを考慮した合理的な判断が可能

### ベイズ統計の利点

- **直感的解釈**: 確率を直接的に解釈できる
- **小サンプル対応**: 少ないデータでも有効な推論が可能
- **階層構造**: 複雑な依存関係をモデル化できる
- **予測分布**: 将来の不確実性を適切に評価できる

### 実用上の注意点

1. **事前分布の選択**: 主観的な要素が含まれるため慎重に設定
2. **計算複雑性**: 複雑なモデルでは近似手法が必要
3. **モデル選択**: 複数のモデルを比較検討する必要性
4. **過信の危険**: 数値的結果への過度な信頼は禁物

### 今後の発展

競馬データを用いたベイズ分析は、以下の方向で発展させることができます：

- **より複雑な階層モデル**: 騎手、調教師、血統を考慮した多層構造
- **時系列ベイズモデル**: 馬の能力変化を動的にモデル化
- **ベイズニューラルネット**: 深層学習とベイズ統計の融合
- **リアルタイム更新**: レース中の情報による逐次更新

ベイズ統計学は、不確実性に満ちた現実世界での意思決定を支援する強力なツールです。競馬という身近な題材を通じて学んだ概念は、ビジネス、医療、工学など様々な分野で応用できるでしょう。