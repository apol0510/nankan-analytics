---
title: "南関競馬データの特徴量設計 - 50個の変数で精度向上"
description: "競馬AI予想の精度を左右する特徴量設計について、実用的な50種類の変数を例に具体的な手法を解説します。"
pubDate: 2024-01-20
tags: ["特徴量設計", "機械学習", "データ分析", "南関競馬"]
category: "機械学習"
featured: true
heroImage: "/img/blog/feature-engineering.jpg"
---

## 特徴量設計の重要性

機械学習における「Garbage in, Garbage out」という格言があるように、モデルの性能は入力する特徴量の質に大きく依存します。

競馬予想においても、適切な特徴量設計が予想精度の向上に直結します。本記事では、南関競馬に特化した実用的な特徴量50種類を紹介します。

## 基本的な特徴量群

### 1. 馬に関する特徴量 (15種類)

```python
def create_horse_features(df):
    """馬に関する特徴量を作成"""
    
    # 基本情報
    df['馬齢'] = df['馬齢']
    df['性別_牝馬フラグ'] = (df['性別'] == '牝').astype(int)
    df['性別_去勢フラグ'] = (df['性別'] == 'セ').astype(int)
    
    # 体重関連
    df['馬体重'] = df['馬体重']
    df['馬体重変化'] = df['馬体重変化']
    df['馬体重変化率'] = df['馬体重変化'] / df['馬体重']
    df['馬体重_標準化'] = (df['馬体重'] - df['馬体重'].mean()) / df['馬体重'].std()
    
    # 過去成績
    df['通算勝率'] = df['1着回数'] / df['出走回数']
    df['通算連対率'] = (df['1着回数'] + df['2着回数']) / df['出走回数']
    df['通算複勝率'] = (df['1着回数'] + df['2着回数'] + df['3着回数']) / df['出走回数']
    
    # 距離適性
    df['短距離勝率'] = df['短距離1着'] / df['短距離出走'] if '短距離出走' in df else 0
    df['中距離勝率'] = df['中距離1着'] / df['中距離出走'] if '中距離出走' in df else 0
    df['長距離勝率'] = df['長距離1着'] / df['長距離出走'] if '長距離出走' in df else 0
    
    # 馬場適性
    df['ダート勝率'] = df['ダート1着'] / df['ダート出走'] if 'ダート出走' in df else 0
    df['重馬場勝率'] = df['重馬場1着'] / df['重馬場出走'] if '重馬場出走' in df else 0
    
    return df
```

### 2. 騎手に関する特徴量 (10種類)

```python
def create_jockey_features(df):
    """騎手に関する特徴量を作成"""
    
    # 基本勝率
    jockey_stats = df.groupby('騎手名').agg({
        '着順': ['count', lambda x: (x == 1).sum(), lambda x: (x <= 2).sum(), lambda x: (x <= 3).sum()]
    }).round(3)
    
    jockey_stats.columns = ['出走数', '1着数', '2着以内数', '3着以内数']
    jockey_stats['勝率'] = jockey_stats['1着数'] / jockey_stats['出走数']
    jockey_stats['連対率'] = jockey_stats['2着以内数'] / jockey_stats['出走数']
    jockey_stats['複勝率'] = jockey_stats['3着以内数'] / jockey_stats['出走数']
    
    # 距離別成績
    for distance_cat in ['短距離', '中距離', '長距離']:
        mask = df['距離カテゴリ'] == distance_cat
        if mask.any():
            dist_stats = df[mask].groupby('騎手名')['着順'].apply(lambda x: (x == 1).mean())
            jockey_stats[f'{distance_cat}_勝率'] = dist_stats
    
    # 馬場状態別成績
    for condition in ['良', '稍重', '重', '不良']:
        mask = df['馬場状態'] == condition
        if mask.any():
            cond_stats = df[mask].groupby('騎手名')['着順'].apply(lambda x: (x == 1).mean())
            jockey_stats[f'{condition}_勝率'] = cond_stats
    
    # メインデータにマージ
    for col in jockey_stats.columns:
        df[f'騎手_{col}'] = df['騎手名'].map(jockey_stats[col]).fillna(0)
    
    return df
```

### 3. 調教師に関する特徴量 (8種類)

```python
def create_trainer_features(df):
    """調教師に関する特徴量を作成"""
    
    trainer_stats = df.groupby('調教師名').agg({
        '着順': ['count', lambda x: (x == 1).sum(), lambda x: (x <= 2).sum()]
    }).round(3)
    
    trainer_stats.columns = ['出走数', '1着数', '2着以内数']
    trainer_stats['勝率'] = trainer_stats['1着数'] / trainer_stats['出走数']
    trainer_stats['連対率'] = trainer_stats['2着以内数'] / trainer_stats['出走数']
    
    # 最近の成績（直近100走）
    df_recent = df.tail(100)
    recent_stats = df_recent.groupby('調教師名')['着順'].apply(lambda x: (x == 1).mean())
    trainer_stats['最近勝率'] = recent_stats
    
    # 馬齢別成績
    for age in [3, 4, 5]:
        age_mask = df['馬齢'] == age
        if age_mask.any():
            age_stats = df[age_mask].groupby('調教師名')['着順'].apply(lambda x: (x == 1).mean())
            trainer_stats[f'{age}歳馬勝率'] = age_stats
    
    # メインデータにマージ
    for col in trainer_stats.columns:
        df[f'調教師_{col}'] = df['調教師名'].map(trainer_stats[col]).fillna(0)
    
    return df
```

## 高度な特徴量群

### 4. レース条件に関する特徴量 (10種類)

```python
def create_race_features(df):
    """レース条件に関する特徴量を作成"""
    
    # 距離関連
    df['距離'] = df['距離']
    df['距離カテゴリ_短距離'] = (df['距離'] <= 1400).astype(int)
    df['距離カテゴリ_中距離'] = ((df['距離'] > 1400) & (df['距離'] <= 1800)).astype(int)
    df['距離カテゴリ_長距離'] = (df['距離'] > 1800).astype(int)
    
    # 馬場状態
    df['馬場_良'] = (df['馬場状態'] == '良').astype(int)
    df['馬場_稍重'] = (df['馬場状態'] == '稍重').astype(int)
    df['馬場_重'] = (df['馬場状態'] == '重').astype(int)
    df['馬場_不良'] = (df['馬場状態'] == '不良').astype(int)
    
    # 競走条件
    df['グレード_重賞'] = df['グレード'].isin(['G1', 'G2', 'G3']).astype(int)
    df['出走頭数'] = df.groupby(['開催日', 'レース番号'])['馬番'].transform('count')
    
    return df
```

### 5. 相対的な特徴量 (7種類)

```python
def create_relative_features(df):
    """他の出走馬との相対的な特徴量を作成"""
    
    # レース内での相対順位
    race_groups = df.groupby(['開催日', 'レース番号'])
    
    # 人気順位
    df['人気順位'] = race_groups['人気'].rank(method='min')
    df['人気順位_正規化'] = df['人気順位'] / race_groups['人気'].transform('count')
    
    # オッズランキング
    df['オッズ順位'] = race_groups['単勝オッズ'].rank(method='min')
    df['オッズ順位_正規化'] = df['オッズ順位'] / race_groups['単勝オッズ'].transform('count')
    
    # 馬体重ランキング
    df['馬体重順位'] = race_groups['馬体重'].rank(method='max', ascending=False)
    df['馬体重順位_正規化'] = df['馬体重順位'] / race_groups['馬体重'].transform('count')
    
    # 経験値ランキング
    df['出走回数順位'] = race_groups['出走回数'].rank(method='max', ascending=False)
    df['出走回数順位_正規化'] = df['出走回数順位'] / race_groups['出走回数'].transform('count')
    
    return df
```

## 時系列特徴量の活用

### 6. 過去走に基づく特徴量 (10種類)

```python
def create_past_performance_features(df):
    """過去走データに基づく特徴量を作成"""
    
    # 馬ごとにソート
    df = df.sort_values(['馬名', '開催日'])
    
    # 前走成績
    df['前走着順'] = df.groupby('馬名')['着順'].shift(1)
    df['前走人気'] = df.groupby('馬名')['人気'].shift(1)
    df['前走オッズ'] = df.groupby('馬名')['単勝オッズ'].shift(1)
    
    # 連続成績
    df['連続馬券内'] = df.groupby('馬名')['着順'].rolling(3).apply(lambda x: (x <= 3).sum()).reset_index(level=0, drop=True)
    df['連続馬券外'] = df.groupby('馬名')['着順'].rolling(3).apply(lambda x: (x > 3).sum()).reset_index(level=0, drop=True)
    
    # 最近の平均着順
    df['直近3走平均着順'] = df.groupby('馬名')['着順'].rolling(3).mean().reset_index(level=0, drop=True)
    df['直近5走平均着順'] = df.groupby('馬名')['着順'].rolling(5).mean().reset_index(level=0, drop=True)
    
    # 休養期間
    df['前走からの日数'] = df.groupby('馬名')['開催日'].diff().dt.days
    df['休養明け'] = (df['前走からの日数'] > 90).astype(int)
    
    # 上昇・下降傾向
    df['着順改善傾向'] = df.groupby('馬名')['着順'].rolling(3).apply(
        lambda x: 1 if len(x) >= 2 and x.iloc[-1] < x.iloc[0] else 0
    ).reset_index(level=0, drop=True)
    
    return df
```

## 特徴量の重要度評価

```python
def evaluate_feature_importance(X, y, feature_names):
    """特徴量の重要度を評価"""
    
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.feature_selection import mutual_info_classif
    
    # Random Forestによる重要度
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X, y)
    rf_importance = rf.feature_importances_
    
    # 相互情報量による重要度
    mi_scores = mutual_info_classif(X, y)
    
    # 結果をまとめ
    importance_df = pd.DataFrame({
        'feature': feature_names,
        'rf_importance': rf_importance,
        'mutual_info': mi_scores
    })
    
    importance_df['combined_score'] = (
        importance_df['rf_importance'] * 0.6 + 
        importance_df['mutual_info'] * 0.4
    )
    
    return importance_df.sort_values('combined_score', ascending=False)

# 使用例
# importance_result = evaluate_feature_importance(X, y, X.columns)
# print(importance_result.head(10))
```

## 特徴量選択の実装

```python
def select_top_features(X, y, feature_names, n_features=30):
    """上位の特徴量を選択"""
    
    from sklearn.feature_selection import SelectKBest, f_classif
    
    # 分散による選択（低分散特徴量を除去）
    from sklearn.feature_selection import VarianceThreshold
    variance_selector = VarianceThreshold(threshold=0.01)
    X_variance = variance_selector.fit_transform(X)
    
    # 統計的検定による選択
    selector = SelectKBest(score_func=f_classif, k=n_features)
    X_selected = selector.fit_transform(X_variance, y)
    
    # 選択された特徴量名を取得
    selected_indices = selector.get_support(indices=True)
    variance_selected_features = feature_names[variance_selector.get_support()]
    selected_features = variance_selected_features[selected_indices]
    
    return X_selected, selected_features

# 使用例
# X_selected, selected_features = select_top_features(X, y, X.columns, n_features=30)
# print(f"選択された特徴量: {list(selected_features)}")
```

## 実践的な活用例

```python
def create_all_features(df):
    """すべての特徴量を統合して作成"""
    
    # 各特徴量群を順次適用
    df = create_horse_features(df)
    df = create_jockey_features(df)
    df = create_trainer_features(df)
    df = create_race_features(df)
    df = create_relative_features(df)
    df = create_past_performance_features(df)
    
    # 欠損値処理
    df = df.fillna(0)
    
    # 特徴量リストの定義
    feature_columns = [col for col in df.columns if col not in [
        '馬名', '騎手名', '調教師名', '開催日', 'レース名', '着順'
    ]]
    
    return df, feature_columns

# 実行例
# processed_data, features = create_all_features(race_data)
# print(f"作成された特徴量数: {len(features)}")
# print(f"特徴量リスト: {features[:10]}...")  # 最初の10個を表示
```

## まとめ

本記事では、競馬AI予想の精度向上に寄与する50種類の特徴量設計手法を紹介しました。

### 特徴量設計のポイント
1. **多角的な視点**: 馬、騎手、調教師、レース条件すべてを考慮
2. **相対的な評価**: 同一レース内での相対的な強さを数値化
3. **時系列情報**: 過去走データから傾向を抽出
4. **ドメイン知識**: 競馬の特性を理解した特徴量設計

### 注意点
- **過学習防止**: 特徴量が多すぎる場合は適切な選択が必要
- **データの質**: 元データの品質が特徴量の有効性を左右
- **継続的改善**: 新しい観点からの特徴量を継続的に検討

次回は、これらの特徴量を活用したより高度なモデル構築手法について解説します。