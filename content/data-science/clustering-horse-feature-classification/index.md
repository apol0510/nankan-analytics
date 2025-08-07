---
title: "クラスタリングで似た特徴の馬を自動分類"
date: 2025-08-07T12:00:00+09:00
description: "競馬データにクラスタリング手法を適用し、似た特徴を持つ馬グループを自動識別。K-means、階層クラスタリング、DBSCANをPythonで実装し、馬のタイプ分類を実現。"
categories: ["データサイエンス"]
tags: ["クラスタリング", "K-means", "階層クラスタリング", "DBSCAN", "競馬データ", "Python", "scikit-learn", "matplotlib", "教師なし学習"]
slug: "clustering-horse-feature-classification"
---

競馬の世界では、馬はそれぞれ異なる特徴を持っています。「スピード馬」「スタミナ馬」「先行馬」「追込馬」など、競馬ファンなら一度は聞いたことがある分類でしょう。これらの分類は長年の経験と観察に基づいていますが、データサイエンスのクラスタリング手法を使えば、客観的で再現可能な馬の分類システムを構築できます。

この記事では、様々なクラスタリング手法を用いて競馬データから馬のタイプを自動分類し、それぞれの手法の特徴や適用場面を詳しく解説します。

## クラスタリングとは何か

クラスタリングは、教師なし学習の代表的手法の一つで、データポイント間の類似性に基づいてグループ（クラスター）を形成する技術です。正解ラベルが存在しない状況で、データの潜在的な構造を発見することができます。

### クラスタリングの基本概念

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score
from sklearn.manifold import TSNE
from scipy.cluster.hierarchy import dendrogram, linkage
from scipy.spatial.distance import pdist, squareform
import warnings
warnings.filterwarnings('ignore')

# 日本語フォント設定
plt.rcParams['font.family'] = 'DejaVu Sans'

# 競馬データの生成
np.random.seed(42)
n_horses = 500

# 馬の基本特徴量を生成（6つの潜在的なタイプを想定）
horse_types = ['スピード', 'スタミナ', 'バランス', '逃げ', '先行', '追込']
true_labels = np.random.choice(range(6), n_horses)

def generate_horse_data(n_horses, true_labels):
    """競馬データの生成"""
    
    data = []
    
    for i in range(n_horses):
        horse_type = true_labels[i]
        
        if horse_type == 0:  # スピード馬
            speed = np.random.normal(85, 5)
            stamina = np.random.normal(65, 8)
            acceleration = np.random.normal(80, 6)
            early_position = np.random.normal(40, 10)  # 後方寄り
        elif horse_type == 1:  # スタミナ馬
            speed = np.random.normal(70, 6)
            stamina = np.random.normal(90, 4)
            acceleration = np.random.normal(70, 8)
            early_position = np.random.normal(60, 10)
        elif horse_type == 2:  # バランス馬
            speed = np.random.normal(75, 5)
            stamina = np.random.normal(75, 5)
            acceleration = np.random.normal(75, 5)
            early_position = np.random.normal(50, 10)
        elif horse_type == 3:  # 逃げ馬
            speed = np.random.normal(80, 6)
            stamina = np.random.normal(70, 8)
            acceleration = np.random.normal(85, 5)
            early_position = np.random.normal(85, 5)  # 前方
        elif horse_type == 4:  # 先行馬
            speed = np.random.normal(78, 6)
            stamina = np.random.normal(72, 6)
            acceleration = np.random.normal(78, 6)
            early_position = np.random.normal(70, 8)
        else:  # 追込馬
            speed = np.random.normal(82, 5)
            stamina = np.random.normal(68, 7)
            acceleration = np.random.normal(88, 4)
            early_position = np.random.normal(25, 8)  # 後方
        
        # その他の特徴量
        weight = np.random.normal(480, 25)
        age = np.random.choice([3, 4, 5, 6, 7], p=[0.3, 0.25, 0.2, 0.15, 0.1])
        prize_money = np.random.lognormal(15, 1.5)
        
        data.append({
            'horse_id': i,
            'speed': max(0, min(100, speed)),
            'stamina': max(0, min(100, stamina)),
            'acceleration': max(0, min(100, acceleration)),
            'early_position': max(0, min(100, early_position)),
            'weight': weight,
            'age': age,
            'prize_money': prize_money,
            'true_type': horse_type,
            'true_type_name': horse_types[horse_type]
        })
    
    return pd.DataFrame(data)

# データの生成と表示
df = generate_horse_data(n_horses, true_labels)

print("=== 生成された競馬データの概要 ===")
print(df.describe())
print(f"\n真の馬タイプ分布:")
print(df['true_type_name'].value_counts())

# データの可視化
fig, axes = plt.subplots(2, 3, figsize=(18, 12))
feature_pairs = [
    ('speed', 'stamina'),
    ('speed', 'acceleration'),
    ('stamina', 'early_position'),
    ('acceleration', 'early_position'),
    ('weight', 'age'),
    ('speed', 'prize_money')
]

for i, (x_feat, y_feat) in enumerate(feature_pairs):
    row, col = i // 3, i % 3
    scatter = axes[row, col].scatter(df[x_feat], df[y_feat], 
                                   c=df['true_type'], cmap='tab10', alpha=0.7)
    axes[row, col].set_xlabel(x_feat)
    axes[row, col].set_ylabel(y_feat)
    axes[row, col].set_title(f'{x_feat} vs {y_feat}')
    axes[row, col].grid(True, alpha=0.3)

plt.colorbar(scatter, ax=axes, shrink=0.8, label='馬タイプ')
plt.tight_layout()
plt.show()
```

## データの前処理とスケーリング

クラスタリングを適用する前に、データの前処理が重要です。特に、異なるスケールの特徴量がある場合は正規化が必須です。

```python
# クラスタリング用の特徴量選択
clustering_features = ['speed', 'stamina', 'acceleration', 'early_position', 'weight', 'age']
X = df[clustering_features].copy()

# 外れ値の確認
plt.figure(figsize=(15, 10))

for i, feature in enumerate(clustering_features):
    plt.subplot(2, 3, i+1)
    plt.boxplot(X[feature])
    plt.title(f'{feature}の箱ひげ図')
    plt.ylabel('値')

plt.tight_layout()
plt.show()

# スケーリング手法の比較
scalers = {
    'StandardScaler': StandardScaler(),
    'MinMaxScaler': MinMaxScaler(),
    'No Scaling': None
}

scaled_data = {}

for name, scaler in scalers.items():
    if scaler is not None:
        scaled_data[name] = pd.DataFrame(
            scaler.fit_transform(X), 
            columns=X.columns, 
            index=X.index
        )
    else:
        scaled_data[name] = X.copy()

# スケーリング結果の可視化
fig, axes = plt.subplots(1, 3, figsize=(18, 5))

for i, (name, data) in enumerate(scaled_data.items()):
    data.boxplot(ax=axes[i])
    axes[i].set_title(f'{name}')
    axes[i].set_ylabel('値')
    axes[i].tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.show()

# 標準化されたデータを使用
X_scaled = scaled_data['StandardScaler']

print("=== スケーリング後の統計情報 ===")
print(X_scaled.describe().round(3))
```

## K-meansクラスタリング

K-meansは最も広く使われているクラスタリング手法の一つです。クラスター数を事前に指定し、各データポイントを最も近いクラスター中心に割り当てます。

### 最適クラスター数の決定

```python
class ClusteringAnalyzer:
    """クラスタリング分析のための包括的クラス"""
    
    def __init__(self, data, true_labels=None):
        self.data = data
        self.true_labels = true_labels
        self.results = {}
    
    def find_optimal_k(self, k_range=range(2, 11), methods=['elbow', 'silhouette']):
        """最適なクラスター数を見つける"""
        
        results = {
            'k_values': list(k_range),
            'inertia': [],
            'silhouette': [],
            'calinski_harabasz': [],
            'davies_bouldin': []
        }
        
        for k in k_range:
            # K-meansクラスタリング
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = kmeans.fit_predict(self.data)
            
            # 各種評価指標
            results['inertia'].append(kmeans.inertia_)
            results['silhouette'].append(silhouette_score(self.data, labels))
            results['calinski_harabasz'].append(calinski_harabasz_score(self.data, labels))
            results['davies_bouldin'].append(davies_bouldin_score(self.data, labels))
        
        return results
    
    def plot_optimal_k_analysis(self, results):
        """最適K分析の可視化"""
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # エルボー法
        axes[0, 0].plot(results['k_values'], results['inertia'], 'o-', linewidth=2)
        axes[0, 0].set_xlabel('クラスター数 (k)')
        axes[0, 0].set_ylabel('慣性（Within-cluster sum of squares）')
        axes[0, 0].set_title('エルボー法')
        axes[0, 0].grid(True, alpha=0.3)
        
        # シルエット係数
        axes[0, 1].plot(results['k_values'], results['silhouette'], 'o-', 
                       linewidth=2, color='orange')
        axes[0, 1].set_xlabel('クラスター数 (k)')
        axes[0, 1].set_ylabel('シルエット係数')
        axes[0, 1].set_title('シルエット分析')
        axes[0, 1].grid(True, alpha=0.3)
        
        # Calinski-Harabasz指数
        axes[1, 0].plot(results['k_values'], results['calinski_harabasz'], 'o-', 
                       linewidth=2, color='green')
        axes[1, 0].set_xlabel('クラスター数 (k)')
        axes[1, 0].set_ylabel('Calinski-Harabasz指数')
        axes[1, 0].set_title('Calinski-Harabasz指数')
        axes[1, 0].grid(True, alpha=0.3)
        
        # Davies-Bouldin指数
        axes[1, 1].plot(results['k_values'], results['davies_bouldin'], 'o-', 
                       linewidth=2, color='red')
        axes[1, 1].set_xlabel('クラスター数 (k)')
        axes[1, 1].set_ylabel('Davies-Bouldin指数')
        axes[1, 1].set_title('Davies-Bouldin指数（小さいほど良い）')
        axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.show()
        
        # 最適値の提案
        optimal_silhouette = results['k_values'][np.argmax(results['silhouette'])]
        optimal_calinski = results['k_values'][np.argmax(results['calinski_harabasz'])]
        optimal_davies = results['k_values'][np.argmin(results['davies_bouldin'])]
        
        print("=== 最適クラスター数の提案 ===")
        print(f"シルエット係数最大: k={optimal_silhouette} (値: {max(results['silhouette']):.3f})")
        print(f"Calinski-Harabasz最大: k={optimal_calinski} (値: {max(results['calinski_harabasz']):.1f})")
        print(f"Davies-Bouldin最小: k={optimal_davies} (値: {min(results['davies_bouldin']):.3f})")

# 分析の実行
analyzer = ClusteringAnalyzer(X_scaled, df['true_type'])
k_analysis = analyzer.find_optimal_k()
analyzer.plot_optimal_k_analysis(k_analysis)
```

### K-meansクラスタリングの実行と評価

```python
# 最適なクラスター数でK-meansを実行
optimal_k = 6  # 真のクラスター数と同じに設定

kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
kmeans_labels = kmeans.fit_predict(X_scaled)

# 結果をデータフレームに追加
df['kmeans_cluster'] = kmeans_labels

# クラスター中心の分析
cluster_centers = pd.DataFrame(
    kmeans.cluster_centers_, 
    columns=X_scaled.columns,
    index=[f'クラスター{i}' for i in range(optimal_k)]
)

print("=== K-meansクラスター中心 ===")
print(cluster_centers.round(3))

# クラスター特性の分析
def analyze_cluster_characteristics(df, cluster_col, features):
    """クラスター特性の分析"""
    
    cluster_stats = df.groupby(cluster_col)[features].agg(['mean', 'std']).round(3)
    cluster_sizes = df[cluster_col].value_counts().sort_index()
    
    return cluster_stats, cluster_sizes

cluster_stats, cluster_sizes = analyze_cluster_characteristics(
    df, 'kmeans_cluster', clustering_features
)

print(f"\n=== クラスターサイズ ===")
print(cluster_sizes)
print(f"\n=== クラスター特性（平均値） ===")
print(cluster_stats.xs('mean', level=1, axis=1))

# 可視化
def plot_clustering_results(df, features, cluster_col, method_name, true_col=None):
    """クラスタリング結果の可視化"""
    
    # PCAによる次元削減
    pca = PCA(n_components=2, random_state=42)
    X_pca = pca.fit_transform(df[features])
    
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    
    # クラスタリング結果
    scatter1 = axes[0].scatter(X_pca[:, 0], X_pca[:, 1], 
                              c=df[cluster_col], cmap='tab10', alpha=0.7)
    axes[0].set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]:.2%})')
    axes[0].set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]:.2%})')
    axes[0].set_title(f'{method_name}クラスタリング結果')
    axes[0].grid(True, alpha=0.3)
    plt.colorbar(scatter1, ax=axes[0])
    
    # 真のラベル（比較用）
    if true_col is not None:
        scatter2 = axes[1].scatter(X_pca[:, 0], X_pca[:, 1], 
                                  c=df[true_col], cmap='tab10', alpha=0.7)
        axes[1].set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]:.2%})')
        axes[1].set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]:.2%})')
        axes[1].set_title('真のラベル')
        axes[1].grid(True, alpha=0.3)
        plt.colorbar(scatter2, ax=axes[1])
    
    # 特徴量空間での可視化（主要2特徴）
    scatter3 = axes[2].scatter(df['speed'], df['stamina'], 
                              c=df[cluster_col], cmap='tab10', alpha=0.7)
    axes[2].set_xlabel('スピード')
    axes[2].set_ylabel('スタミナ')
    axes[2].set_title(f'{method_name}結果（スピード vs スタミナ）')
    axes[2].grid(True, alpha=0.3)
    plt.colorbar(scatter3, ax=axes[2])
    
    plt.tight_layout()
    plt.show()

plot_clustering_results(df, clustering_features, 'kmeans_cluster', 'K-means', 'true_type')

# クラスター品質の評価
kmeans_silhouette = silhouette_score(X_scaled, kmeans_labels)
kmeans_calinski = calinski_harabasz_score(X_scaled, kmeans_labels)
kmeans_davies = davies_bouldin_score(X_scaled, kmeans_labels)

print(f"\n=== K-meansクラスタリング評価 ===")
print(f"シルエット係数: {kmeans_silhouette:.3f}")
print(f"Calinski-Harabasz指数: {kmeans_calinski:.1f}")
print(f"Davies-Bouldin指数: {kmeans_davies:.3f}")
```

## 階層クラスタリング

階層クラスタリングは、データポイント間の距離に基づいてツリー構造（デンドログラム）を作成し、クラスターを形成します。

```python
def hierarchical_clustering_analysis(X, method='ward', n_clusters=6):
    """階層クラスタリングの実行と分析"""
    
    # 階層クラスタリングの実行
    hierarchical = AgglomerativeClustering(
        n_clusters=n_clusters, 
        linkage=method
    )
    hierarchical_labels = hierarchical.fit_predict(X)
    
    # デンドログラムの作成（距離行列から）
    linkage_matrix = linkage(X, method=method)
    
    return hierarchical_labels, linkage_matrix

# 異なる結合方法の比較
linkage_methods = ['ward', 'complete', 'average', 'single']
hierarchical_results = {}

fig, axes = plt.subplots(2, 2, figsize=(20, 16))

for i, method in enumerate(linkage_methods):
    row, col = i // 2, i % 2
    
    # 階層クラスタリング実行
    h_labels, linkage_matrix = hierarchical_clustering_analysis(X_scaled, method)
    hierarchical_results[method] = h_labels
    
    # デンドログラム表示
    dendrogram(linkage_matrix, ax=axes[row, col], truncate_mode='lastp', p=30)
    axes[row, col].set_title(f'{method}法デンドログラム')
    axes[row, col].set_xlabel('クラスターまたはサンプル番号')
    axes[row, col].set_ylabel('距離')

plt.tight_layout()
plt.show()

# 各手法の評価比較
print("=== 階層クラスタリング手法比較 ===")
for method, labels in hierarchical_results.items():
    silhouette = silhouette_score(X_scaled, labels)
    calinski = calinski_harabasz_score(X_scaled, labels)
    davies = davies_bouldin_score(X_scaled, labels)
    
    print(f"{method}法:")
    print(f"  シルエット係数: {silhouette:.3f}")
    print(f"  Calinski-Harabasz: {calinski:.1f}")
    print(f"  Davies-Bouldin: {davies:.3f}")

# 最良の手法（ward法）で詳細分析
df['hierarchical_cluster'] = hierarchical_results['ward']

plot_clustering_results(df, clustering_features, 'hierarchical_cluster', 
                       '階層クラスタリング', 'true_type')

# 階層クラスタリング結果の特性分析
h_cluster_stats, h_cluster_sizes = analyze_cluster_characteristics(
    df, 'hierarchical_cluster', clustering_features
)

print(f"\n=== 階層クラスタリング クラスターサイズ ===")
print(h_cluster_sizes)
print(f"\n=== 階層クラスタリング クラスター特性（平均値） ===")
print(h_cluster_stats.xs('mean', level=1, axis=1))
```

## DBSCAN（密度ベースクラスタリング）

DBSCANは密度ベースのクラスタリング手法で、事前にクラスター数を指定する必要がなく、ノイズを自動的に検出できます。

```python
def dbscan_parameter_tuning(X, eps_range=np.arange(0.3, 2.0, 0.1), 
                           min_samples_range=range(3, 15)):
    """DBSCANのパラメータチューニング"""
    
    results = []
    
    for eps in eps_range:
        for min_samples in min_samples_range:
            dbscan = DBSCAN(eps=eps, min_samples=min_samples)
            labels = dbscan.fit_predict(X)
            
            n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
            n_noise = list(labels).count(-1)
            
            if n_clusters > 1:  # 少なくとも2つのクラスターがある場合のみ評価
                silhouette = silhouette_score(X, labels) if n_clusters > 1 else -1
                results.append({
                    'eps': eps,
                    'min_samples': min_samples,
                    'n_clusters': n_clusters,
                    'n_noise': n_noise,
                    'silhouette': silhouette,
                    'labels': labels.copy()
                })
    
    return pd.DataFrame(results)

# DBSCANパラメータの探索
print("DBSCANパラメータチューニング中...")
dbscan_results = dbscan_parameter_tuning(X_scaled)

# 上位結果の表示
if len(dbscan_results) > 0:
    top_results = dbscan_results.nlargest(10, 'silhouette')
    print("=== DBSCAN上位パラメータ ===")
    print(top_results[['eps', 'min_samples', 'n_clusters', 'n_noise', 'silhouette']].round(3))
    
    # 最良のパラメータで実行
    best_params = top_results.iloc[0]
    best_dbscan = DBSCAN(eps=best_params['eps'], min_samples=best_params['min_samples'])
    dbscan_labels = best_dbscan.fit_predict(X_scaled)
    
    df['dbscan_cluster'] = dbscan_labels
    
    print(f"\n=== 最良のDBSCAN結果 ===")
    print(f"eps: {best_params['eps']:.2f}")
    print(f"min_samples: {best_params['min_samples']}")
    print(f"クラスター数: {best_params['n_clusters']}")
    print(f"ノイズポイント数: {best_params['n_noise']}")
    print(f"シルエット係数: {best_params['silhouette']:.3f}")
    
    # 可視化
    plot_clustering_results(df, clustering_features, 'dbscan_cluster', 
                           'DBSCAN', 'true_type')
    
    # DBSCANのパラメータ感度分析
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    
    # eps vs クラスター数
    eps_cluster_relation = dbscan_results.groupby('eps')['n_clusters'].mean()
    axes[0].plot(eps_cluster_relation.index, eps_cluster_relation.values, 'o-')
    axes[0].set_xlabel('eps')
    axes[0].set_ylabel('平均クラスター数')
    axes[0].set_title('eps vs クラスター数')
    axes[0].grid(True, alpha=0.3)
    
    # min_samples vs クラスター数
    min_samples_cluster_relation = dbscan_results.groupby('min_samples')['n_clusters'].mean()
    axes[1].plot(min_samples_cluster_relation.index, min_samples_cluster_relation.values, 'o-')
    axes[1].set_xlabel('min_samples')
    axes[1].set_ylabel('平均クラスター数')
    axes[1].set_title('min_samples vs クラスター数')
    axes[1].grid(True, alpha=0.3)
    
    # パラメータヒートマップ
    pivot_silhouette = dbscan_results.pivot_table(
        values='silhouette', index='min_samples', columns='eps', aggfunc='mean'
    )
    sns.heatmap(pivot_silhouette, annot=True, fmt='.2f', cmap='viridis', ax=axes[2])
    axes[2].set_title('シルエット係数ヒートマップ')
    
    plt.tight_layout()
    plt.show()
else:
    print("適切なDBSCANパラメータが見つかりませんでした。")
```

## クラスタリング手法の比較と評価

```python
def comprehensive_clustering_comparison(df, features, true_labels_col=None):
    """包括的なクラスタリング手法比較"""
    
    methods = {
        'K-means': 'kmeans_cluster',
        '階層クラスタリング': 'hierarchical_cluster'
    }
    
    if 'dbscan_cluster' in df.columns:
        methods['DBSCAN'] = 'dbscan_cluster'
    
    comparison_results = []
    
    for method_name, cluster_col in methods.items():
        labels = df[cluster_col].values
        
        # ノイズポイントを除外（DBSCANの場合）
        valid_mask = labels != -1
        valid_data = df.loc[valid_mask, features]
        valid_labels = labels[valid_mask]
        
        if len(set(valid_labels)) > 1:
            silhouette = silhouette_score(valid_data, valid_labels)
            calinski = calinski_harabasz_score(valid_data, valid_labels)
            davies = davies_bouldin_score(valid_data, valid_labels)
            
            n_clusters = len(set(valid_labels))
            n_noise = sum(labels == -1) if -1 in labels else 0
            
            # 真のラベルとの比較（調整ランド指数）
            ari = None
            if true_labels_col is not None:
                from sklearn.metrics import adjusted_rand_score
                true_labels = df[true_labels_col].values
                ari = adjusted_rand_score(true_labels[valid_mask], valid_labels)
            
            comparison_results.append({
                'method': method_name,
                'n_clusters': n_clusters,
                'n_noise': n_noise,
                'silhouette': silhouette,
                'calinski_harabasz': calinski,
                'davies_bouldin': davies,
                'adjusted_rand_index': ari
            })
    
    return pd.DataFrame(comparison_results)

# 手法比較の実行
comparison_df = comprehensive_clustering_comparison(
    df, clustering_features, 'true_type'
)

print("=== クラスタリング手法総合比較 ===")
print(comparison_df.round(4))

# 結果の可視化
fig, axes = plt.subplots(2, 2, figsize=(15, 10))

metrics = ['silhouette', 'calinski_harabasz', 'davies_bouldin', 'adjusted_rand_index']
titles = ['シルエット係数', 'Calinski-Harabasz指数', 'Davies-Bouldin指数', '調整ランド指数']

for i, (metric, title) in enumerate(zip(metrics, titles)):
    row, col = i // 2, i % 2
    if metric in comparison_df.columns:
        values = comparison_df[metric].dropna()
        methods = comparison_df.loc[values.index, 'method']
        
        axes[row, col].bar(methods, values)
        axes[row, col].set_title(title)
        axes[row, col].set_ylabel('値')
        axes[row, col].tick_params(axis='x', rotation=45)
        axes[row, col].grid(True, alpha=0.3)
        
        # Davies-Bouldin指数は小さいほど良い
        if metric == 'davies_bouldin':
            axes[row, col].set_title(f'{title} (小さいほど良い)')

plt.tight_layout()
plt.show()
```

## 高度なクラスタリング手法

### t-SNEによる次元削減とクラスタリング

```python
# t-SNEによる次元削減
def tsne_clustering_visualization(df, features, cluster_cols, perplexity=30):
    """t-SNEによるクラスタリング結果の可視化"""
    
    # t-SNE実行
    tsne = TSNE(n_components=2, perplexity=perplexity, random_state=42)
    X_tsne = tsne.fit_transform(df[features])
    
    # 可視化
    n_methods = len(cluster_cols)
    fig, axes = plt.subplots(1, n_methods + 1, figsize=(5 * (n_methods + 1), 5))
    
    if n_methods == 0:
        axes = [axes]
    
    # 真のラベル
    scatter = axes[0].scatter(X_tsne[:, 0], X_tsne[:, 1], 
                             c=df['true_type'], cmap='tab10', alpha=0.7)
    axes[0].set_title('真のラベル (t-SNE)')
    axes[0].set_xlabel('t-SNE1')
    axes[0].set_ylabel('t-SNE2')
    plt.colorbar(scatter, ax=axes[0])
    
    # 各クラスタリング結果
    for i, (method, col) in enumerate(cluster_cols.items()):
        scatter = axes[i + 1].scatter(X_tsne[:, 0], X_tsne[:, 1], 
                                     c=df[col], cmap='tab10', alpha=0.7)
        axes[i + 1].set_title(f'{method} (t-SNE)')
        axes[i + 1].set_xlabel('t-SNE1')
        if i == 0:
            axes[i + 1].set_ylabel('t-SNE2')
        plt.colorbar(scatter, ax=axes[i + 1])
    
    plt.tight_layout()
    plt.show()

# t-SNE可視化の実行
cluster_methods = {
    'K-means': 'kmeans_cluster',
    '階層クラスタリング': 'hierarchical_cluster'
}

if 'dbscan_cluster' in df.columns:
    cluster_methods['DBSCAN'] = 'dbscan_cluster'

tsne_clustering_visualization(df, clustering_features, cluster_methods)
```

### クラスター安定性の評価

```python
def cluster_stability_analysis(X, n_iterations=100, sample_ratio=0.8):
    """クラスター安定性の分析"""
    
    from sklearn.metrics import adjusted_rand_score
    
    n_samples = len(X)
    sample_size = int(n_samples * sample_ratio)
    
    methods = {
        'K-means': lambda x: KMeans(n_clusters=6, random_state=42).fit_predict(x),
        '階層クラスタリング': lambda x: AgglomerativeClustering(n_clusters=6).fit_predict(x)
    }
    
    stability_results = {method: [] for method in methods}
    
    # 基準となるクラスタリング結果
    reference_results = {}
    for method_name, method_func in methods.items():
        reference_results[method_name] = method_func(X)
    
    print("安定性分析実行中...")
    for i in range(n_iterations):
        # ランダムサンプリング
        sample_indices = np.random.choice(n_samples, sample_size, replace=False)
        X_sample = X[sample_indices]
        
        for method_name, method_func in methods.items():
            # サンプルでクラスタリング
            sample_labels = method_func(X_sample)
            
            # 元の結果と比較（共通インデックス）
            reference_sample = reference_results[method_name][sample_indices]
            
            # 調整ランド指数で安定性を測定
            ari = adjusted_rand_score(reference_sample, sample_labels)
            stability_results[method_name].append(ari)
    
    return stability_results

# 安定性分析の実行
stability_results = cluster_stability_analysis(X_scaled.values)

# 結果の可視化
plt.figure(figsize=(12, 6))

plt.subplot(1, 2, 1)
for method, scores in stability_results.items():
    plt.hist(scores, alpha=0.7, label=method, bins=20)
plt.xlabel('調整ランド指数')
plt.ylabel('頻度')
plt.title('クラスター安定性分布')
plt.legend()
plt.grid(True, alpha=0.3)

plt.subplot(1, 2, 2)
box_data = [scores for scores in stability_results.values()]
box_labels = list(stability_results.keys())
plt.boxplot(box_data, labels=box_labels)
plt.ylabel('調整ランド指数')
plt.title('クラスター安定性比較')
plt.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

print("=== クラスター安定性分析結果 ===")
for method, scores in stability_results.items():
    print(f"{method}:")
    print(f"  平均ARI: {np.mean(scores):.3f}")
    print(f"  標準偏差: {np.std(scores):.3f}")
    print(f"  最小値: {np.min(scores):.3f}")
    print(f"  最大値: {np.max(scores):.3f}")
```

## 実用的なクラスター解釈

```python
def interpret_horse_clusters(df, cluster_col, features):
    """馬のクラスター解釈"""
    
    cluster_profiles = df.groupby(cluster_col)[features].mean()
    cluster_sizes = df[cluster_col].value_counts().sort_index()
    
    # 各クラスターの特徴を言語化
    interpretations = {}
    
    for cluster_id in cluster_profiles.index:
        profile = cluster_profiles.loc[cluster_id]
        
        # 特徴の解釈
        characteristics = []
        
        if profile['speed'] > profile['stamina'] + 5:
            characteristics.append("スピード重視")
        elif profile['stamina'] > profile['speed'] + 5:
            characteristics.append("スタミナ重視")
        else:
            characteristics.append("バランス型")
        
        if profile['early_position'] > 70:
            characteristics.append("前付け")
        elif profile['early_position'] < 40:
            characteristics.append("後方待機")
        else:
            characteristics.append("中団")
        
        if profile['acceleration'] > 80:
            characteristics.append("高い瞬発力")
        
        interpretations[cluster_id] = {
            'characteristics': characteristics,
            'size': cluster_sizes[cluster_id],
            'profile': profile
        }
    
    return interpretations, cluster_profiles

# K-meansクラスターの解釈
interpretations, profiles = interpret_horse_clusters(
    df, 'kmeans_cluster', clustering_features
)

print("=== K-meansクラスター解釈 ===")
for cluster_id, info in interpretations.items():
    print(f"\nクラスター {cluster_id} ({info['size']}頭):")
    print(f"特徴: {', '.join(info['characteristics'])}")
    print("主要指標:")
    for feature in ['speed', 'stamina', 'acceleration', 'early_position']:
        print(f"  {feature}: {info['profile'][feature]:.1f}")

# クラスター間の類似性分析
from scipy.spatial.distance import pdist, squareform
from scipy.cluster.hierarchy import dendrogram, linkage

cluster_distances = squareform(pdist(profiles, metric='euclidean'))
cluster_linkage = linkage(cluster_distances, method='ward')

plt.figure(figsize=(10, 6))
dendrogram(cluster_linkage, labels=[f'クラスター{i}' for i in range(len(profiles))])
plt.title('クラスター間の類似性')
plt.ylabel('距離')
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

# レーダーチャートによるクラスタープロファイル
def plot_cluster_radar_chart(profiles, features):
    """レーダーチャートによるクラスタープロファイル表示"""
    
    from math import pi
    
    # 正規化（0-1スケール）
    profiles_norm = profiles.copy()
    for feature in features:
        max_val = profiles[feature].max()
        min_val = profiles[feature].min()
        profiles_norm[feature] = (profiles[feature] - min_val) / (max_val - min_val)
    
    # 角度の計算
    angles = [n / len(features) * 2 * pi for n in range(len(features))]
    angles += angles[:1]  # 円を閉じる
    
    fig, axes = plt.subplots(2, 3, figsize=(18, 12), subplot_kw=dict(projection='polar'))
    axes = axes.ravel()
    
    colors = plt.cm.tab10(np.linspace(0, 1, len(profiles_norm)))
    
    for i, (cluster_id, profile) in enumerate(profiles_norm.iterrows()):
        if i < len(axes):
            values = profile[features].tolist()
            values += values[:1]  # 円を閉じる
            
            axes[i].plot(angles, values, 'o-', linewidth=2, 
                        label=f'クラスター{cluster_id}', color=colors[i])
            axes[i].fill(angles, values, alpha=0.25, color=colors[i])
            axes[i].set_xticks(angles[:-1])
            axes[i].set_xticklabels(features)
            axes[i].set_ylim(0, 1)
            axes[i].set_title(f'クラスター{cluster_id} プロファイル', pad=20)
            axes[i].grid(True)
    
    plt.tight_layout()
    plt.show()

plot_cluster_radar_chart(profiles, ['speed', 'stamina', 'acceleration', 'early_position'])
```

## まとめ

この記事では、競馬データを用いて様々なクラスタリング手法を実践的に学習しました。

### 学習した手法とその特徴

1. **K-means クラスタリング**
   - 長所: 高速、解釈しやすい、スケーラブル
   - 短所: クラスター数を事前指定、球状クラスターを仮定

2. **階層クラスタリング**
   - 長所: クラスター数を事前指定不要、デンドログラムによる視覚化
   - 短所: 計算量が多い、大規模データに不向き

3. **DBSCAN**
   - 長所: ノイズ検出可能、任意形状のクラスター対応
   - 短所: パラメータ調整が困難、密度が一様でないデータに不向き

### 実践的な知見

1. **前処理の重要性**: スケーリングはクラスタリング結果に大きく影響
2. **評価指標の活用**: 複数の指標を組み合わせた総合的な評価が重要
3. **ドメイン知識との組み合わせ**: 統計的結果と専門知識の両方を考慮
4. **安定性の確認**: 異なるデータサンプルでの結果の一貫性

### 競馬データでの応用価値

クラスタリング分析により以下が可能になります：

- **馬のタイプ分類の客観化**: データに基づく科学的分類
- **新馬の能力予測**: 類似クラスターの過去実績から予測
- **レース条件とのマッチング**: クラスター特性と適性の関連分析
- **育成戦略の立案**: クラスター特性に基づく調教方針

### 今後の発展方向

1. **時系列クラスタリング**: 馬の成長や衰退パターンの分析
2. **アンサンブル手法**: 複数手法の結果を統合した分類
3. **深層学習の活用**: オートエンコーダによる特徴抽出
4. **リアルタイム分析**: レース直前の状態変化の考慮

クラスタリングは、大量のデータから潜在的なパターンを発見する強力な手法です。競馬という複雑な世界での応用を通じて学んだ技術は、マーケティング、医療、製造業など様々な分野で価値を発揮するでしょう。