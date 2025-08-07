---
title: "ニューラルネットワークで競馬オッズを予測する"
date: 2024-11-16T10:00:00+09:00
description: "深層学習を用いて競馬のオッズ予測モデルを構築する方法を詳しく解説します。馬のパフォーマンスデータ、騎手情報、レース条件などを総合的に分析し、TensorFlowとPyTorchで実装する実践的な予測システムを学べます。"
categories: ["深層学習", "スポーツアナリティクス"]
tags: ["ニューラルネットワーク", "競馬", "オッズ予測", "TensorFlow", "PyTorch", "深層学習", "予測モデル", "スポーツベッティング", "機械学習"]
slug: "neural-network-betting-odds-prediction"
image: "horse_racing_prediction.jpg"
weight: 100
---

## はじめに

競馬は複雑な要因が絡み合うスポーツであり、従来の統計的手法だけでは予測が困難な分野です。馬の能力、騎手の技術、レース条件、過去の成績など、多次元のデータを総合的に分析する必要があります。

本記事では、深層学習のニューラルネットワークを活用して、これらの複雑な要因を学習し、競馬のオッズを予測するシステムの構築方法を詳しく解説します。データの収集・前処理から、モデルの設計・訓練、実際の予測まで、実践的なアプローチを紹介します。

## 競馬オッズ予測の課題と深層学習の適用意義

### 競馬予測の複雑性

競馬予測には以下のような特徴的な課題があります：

1. **多次元データの複雑な相互作用**: 馬の能力、騎手、馬場状態、距離、重量など
2. **非線形関係**: 各要因間の複雑な相互作用
3. **時系列要素**: 馬や騎手の調子の変化
4. **不確実性**: 当日のコンディションや偶発的要因

### ニューラルネットワークの優位性

深層学習は以下の理由で競馬予測に適しています：

- **高次元特徴量の自動抽出**: 人手では発見困難なパターンの学習
- **非線形関係のモデリング**: 複雑な相互作用の表現
- **大量データの処理能力**: 過去の大量レースデータの活用
- **アンサンブル効果**: 複数の予測要因の統合

## データ構造と特徴量エンジニアリング

### 競馬データの種類と構造

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization, Input, Concatenate
from tensorflow.keras.optimizers import Adam
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

# サンプル競馬データの生成
def generate_horse_racing_data(n_races=10000, n_horses_per_race=12):
    """
    競馬データのサンプル生成
    """
    np.random.seed(42)
    
    data = []
    race_id = 0
    
    for race in range(n_races):
        race_id += 1
        
        # レース条件の設定
        race_distance = np.random.choice([1200, 1400, 1600, 1800, 2000, 2400])
        track_condition = np.random.choice(['良', '稍重', '重', '不良'])
        weather = np.random.choice(['晴', '曇', '雨', '雪'])
        race_grade = np.random.choice(['G1', 'G2', 'G3', 'OP', '3勝', '2勝', '1勝', '未勝利'])
        
        # 各馬のデータ生成
        for horse in range(n_horses_per_race):
            horse_data = {
                'race_id': race_id,
                'horse_id': f'horse_{race}_{horse}',
                'horse_number': horse + 1,
                
                # 馬の基本情報
                'age': np.random.randint(3, 8),
                'weight': np.random.normal(480, 20),
                'sex': np.random.choice(['牡', '牝', 'セ']),
                
                # 過去成績（勝率、連対率、複勝率）
                'win_rate': np.random.beta(2, 8),
                'place_rate': np.random.beta(3, 5),
                'show_rate': np.random.beta(4, 4),
                
                # 騎手情報
                'jockey_id': f'jockey_{np.random.randint(1, 100)}',
                'jockey_win_rate': np.random.beta(3, 7),
                'jockey_experience': np.random.randint(1, 30),
                
                # 調教師情報
                'trainer_id': f'trainer_{np.random.randint(1, 50)}',
                'trainer_win_rate': np.random.beta(2, 8),
                
                # レース固有情報
                'distance': race_distance,
                'track_condition': track_condition,
                'weather': weather,
                'race_grade': race_grade,
                'post_position': horse + 1,
                'weight_carried': np.random.randint(52, 60),
                
                # 最近の成績
                'last_5_races_avg_time': np.random.normal(race_distance * 0.06, 2),
                'last_race_position': np.random.randint(1, 16),
                'days_since_last_race': np.random.randint(14, 365),
                
                # 血統情報（簡略化）
                'pedigree_score': np.random.normal(50, 15),
                
                # 目的変数（着順とオッズ）
                'finish_position': 0,  # 後で設定
                'odds': 0.0  # 後で設定
            }
            
            data.append(horse_data)
    
    df = pd.DataFrame(data)
    
    # 各レースで着順とオッズを設定
    for race_id in df['race_id'].unique():
        race_horses = df[df['race_id'] == race_id].copy()
        
        # 能力値の計算（複数要因の組み合わせ）
        ability_score = (
            race_horses['win_rate'] * 0.3 +
            race_horses['jockey_win_rate'] * 0.2 +
            race_horses['trainer_win_rate'] * 0.1 +
            (100 - race_horses['last_race_position']) * 0.01 +
            race_horses['pedigree_score'] * 0.005 +
            np.random.normal(0, 0.1, len(race_horses))  # ランダム要素
        )
        
        # 着順の決定（能力値順 + ランダム要素）
        finish_positions = np.argsort(-ability_score) + 1
        
        # オッズの計算（能力値に基づく）
        probability = ability_score / ability_score.sum()
        odds = np.maximum(1.0, 1.0 / probability)
        
        # データフレームに反映
        df.loc[df['race_id'] == race_id, 'finish_position'] = finish_positions
        df.loc[df['race_id'] == race_id, 'odds'] = odds
    
    return df

# データ生成
horse_data = generate_horse_racing_data(5000, 12)
print(f"生成されたデータ形状: {horse_data.shape}")
print(f"レース数: {horse_data['race_id'].nunique()}")
print("\nデータサンプル:")
print(horse_data.head())
```

### 特徴量エンジニアリング

```python
class HorseRacingFeatureEngineer:
    """
    競馬データの特徴量エンジニアリングクラス
    """
    
    def __init__(self):
        self.label_encoders = {}
        self.scaler = StandardScaler()
        
    def create_advanced_features(self, df):
        """
        高度な特徴量の作成
        """
        df = df.copy()
        
        # 1. 相対的特徴量
        df['weight_per_age'] = df['weight'] / df['age']
        df['experience_ratio'] = df['jockey_experience'] / df['age']
        
        # 2. 組み合わせ特徴量
        df['jockey_trainer_synergy'] = df['jockey_win_rate'] * df['trainer_win_rate']
        df['total_win_rate'] = (df['win_rate'] + df['jockey_win_rate'] + df['trainer_win_rate']) / 3
        
        # 3. レース固有特徴量
        df['distance_category'] = pd.cut(df['distance'], 
                                       bins=[0, 1300, 1700, 2100, 3000], 
                                       labels=['短距離', '中距離', '長距離', '超長距離'])
        
        # 4. 調子に関する特徴量
        df['rest_days_category'] = pd.cut(df['days_since_last_race'],
                                        bins=[0, 30, 90, 180, 365],
                                        labels=['短期', '中期', '長期', '超長期'])
        
        # 5. ポジション関連特徴量
        df['post_position_advantage'] = np.where(df['post_position'] <= 6, 1, 0)
        
        # 6. 血統と距離の適性
        df['pedigree_distance_fit'] = df['pedigree_score'] * np.log(df['distance'])
        
        return df
    
    def encode_categorical_features(self, df):
        """
        カテゴリカル変数のエンコーディング
        """
        categorical_columns = ['sex', 'track_condition', 'weather', 'race_grade', 
                             'distance_category', 'rest_days_category']
        
        df_encoded = df.copy()
        
        for col in categorical_columns:
            if col not in self.label_encoders:
                self.label_encoders[col] = LabelEncoder()
                df_encoded[col + '_encoded'] = self.label_encoders[col].fit_transform(df[col].astype(str))
            else:
                df_encoded[col + '_encoded'] = self.label_encoders[col].transform(df[col].astype(str))
        
        return df_encoded
    
    def prepare_features(self, df, is_training=True):
        """
        特徴量の準備
        """
        # 高度な特徴量の作成
        df = self.create_advanced_features(df)
        
        # カテゴリカル変数のエンコーディング
        df = self.encode_categorical_features(df)
        
        # 数値特徴量の選択
        numerical_features = [
            'age', 'weight', 'win_rate', 'place_rate', 'show_rate',
            'jockey_win_rate', 'jockey_experience', 'trainer_win_rate',
            'distance', 'post_position', 'weight_carried',
            'last_5_races_avg_time', 'last_race_position', 'days_since_last_race',
            'pedigree_score', 'weight_per_age', 'experience_ratio',
            'jockey_trainer_synergy', 'total_win_rate', 'pedigree_distance_fit'
        ]
        
        # エンコードされたカテゴリカル特徴量の追加
        categorical_features = [
            'sex_encoded', 'track_condition_encoded', 'weather_encoded',
            'race_grade_encoded', 'distance_category_encoded', 'rest_days_category_encoded',
            'post_position_advantage'
        ]
        
        all_features = numerical_features + categorical_features
        X = df[all_features]
        
        # 欠損値の処理
        X = X.fillna(X.mean())
        
        # 正規化
        if is_training:
            X_scaled = self.scaler.fit_transform(X)
        else:
            X_scaled = self.scaler.transform(X)
        
        return X_scaled, all_features

# 特徴量エンジニアリングの実行
feature_engineer = HorseRacingFeatureEngineer()
X, feature_names = feature_engineer.prepare_features(horse_data, is_training=True)

print(f"特徴量数: {X.shape[1]}")
print(f"サンプル数: {X.shape[0]}")
print(f"特徴量名: {feature_names}")
```

## ニューラルネットワークモデルの設計

### TensorFlowによる基本実装

```python
class HorseRacingPredictor:
    """
    競馬オッズ予測のニューラルネットワークモデル
    """
    
    def __init__(self, input_dim, hidden_layers=[256, 128, 64], dropout_rate=0.3):
        self.input_dim = input_dim
        self.hidden_layers = hidden_layers
        self.dropout_rate = dropout_rate
        self.model = None
        self.history = None
        
    def build_model(self):
        """
        ニューラルネットワークモデルの構築
        """
        model = Sequential()
        
        # 入力層
        model.add(Dense(self.hidden_layers[0], input_dim=self.input_dim, activation='relu'))
        model.add(BatchNormalization())
        model.add(Dropout(self.dropout_rate))
        
        # 隠れ層
        for units in self.hidden_layers[1:]:
            model.add(Dense(units, activation='relu'))
            model.add(BatchNormalization())
            model.add(Dropout(self.dropout_rate))
        
        # 出力層（オッズ予測）
        model.add(Dense(1, activation='linear'))
        
        # モデルのコンパイル
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae', 'mse']
        )
        
        self.model = model
        return model
    
    def train(self, X_train, y_train, X_val, y_val, epochs=100, batch_size=32):
        """
        モデルの訓練
        """
        if self.model is None:
            self.build_model()
        
        # コールバックの設定
        callbacks = [
            tf.keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=15,
                restore_best_weights=True
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=8,
                min_lr=1e-7
            )
        ]
        
        # 訓練実行
        self.history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        return self.history
    
    def predict(self, X):
        """
        オッズの予測
        """
        return self.model.predict(X)
    
    def evaluate(self, X_test, y_test):
        """
        モデルの評価
        """
        return self.model.evaluate(X_test, y_test)

# データの準備
y = horse_data['odds'].values
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
X_train, X_val, y_train, y_val = train_test_split(X_train, y_train, test_size=0.2, random_state=42)

print(f"訓練データ: {X_train.shape}, {y_train.shape}")
print(f"検証データ: {X_val.shape}, {y_val.shape}")
print(f"テストデータ: {X_test.shape}, {y_test.shape}")

# モデルの構築と訓練
predictor = HorseRacingPredictor(input_dim=X.shape[1])
model = predictor.build_model()
history = predictor.train(X_train, y_train, X_val, y_val, epochs=100)

# 予測とEvaluation
test_loss, test_mae, test_mse = predictor.evaluate(X_test, y_test)
predictions = predictor.predict(X_test)

print(f"\nテスト結果:")
print(f"損失: {test_loss:.4f}")
print(f"MAE: {test_mae:.4f}")
print(f"MSE: {test_mse:.4f}")
print(f"RMSE: {np.sqrt(test_mse):.4f}")
```

### PyTorchによる実装

```python
class HorseRacingNet(nn.Module):
    """
    PyTorchベースの競馬オッズ予測ネットワーク
    """
    
    def __init__(self, input_dim, hidden_layers=[256, 128, 64], dropout_rate=0.3):
        super(HorseRacingNet, self).__init__()
        
        layers = []
        prev_dim = input_dim
        
        for hidden_dim in hidden_layers:
            layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.ReLU(),
                nn.BatchNorm1d(hidden_dim),
                nn.Dropout(dropout_rate)
            ])
            prev_dim = hidden_dim
        
        # 出力層
        layers.append(nn.Linear(prev_dim, 1))
        
        self.network = nn.Sequential(*layers)
    
    def forward(self, x):
        return self.network(x)

class PyTorchHorsePredictor:
    """
    PyTorchベースの競馬予測クラス
    """
    
    def __init__(self, input_dim, hidden_layers=[256, 128, 64], dropout_rate=0.3):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = HorseRacingNet(input_dim, hidden_layers, dropout_rate).to(self.device)
        self.criterion = nn.MSELoss()
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.001)
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', patience=8, factor=0.5
        )
        
    def prepare_data(self, X, y, batch_size=32):
        """
        データをPyTorch形式に変換
        """
        X_tensor = torch.FloatTensor(X)
        y_tensor = torch.FloatTensor(y.reshape(-1, 1))
        dataset = TensorDataset(X_tensor, y_tensor)
        return DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    def train(self, X_train, y_train, X_val, y_val, epochs=100, batch_size=32):
        """
        モデルの訓練
        """
        train_loader = self.prepare_data(X_train, y_train, batch_size)
        val_loader = self.prepare_data(X_val, y_val, batch_size)
        
        train_losses = []
        val_losses = []
        
        best_val_loss = float('inf')
        patience_counter = 0
        
        for epoch in range(epochs):
            # 訓練フェーズ
            self.model.train()
            train_loss = 0.0
            
            for batch_X, batch_y in train_loader:
                batch_X, batch_y = batch_X.to(self.device), batch_y.to(self.device)
                
                self.optimizer.zero_grad()
                outputs = self.model(batch_X)
                loss = self.criterion(outputs, batch_y)
                loss.backward()
                self.optimizer.step()
                
                train_loss += loss.item()
            
            # 検証フェーズ
            self.model.eval()
            val_loss = 0.0
            
            with torch.no_grad():
                for batch_X, batch_y in val_loader:
                    batch_X, batch_y = batch_X.to(self.device), batch_y.to(self.device)
                    outputs = self.model(batch_X)
                    loss = self.criterion(outputs, batch_y)
                    val_loss += loss.item()
            
            train_loss /= len(train_loader)
            val_loss /= len(val_loader)
            
            train_losses.append(train_loss)
            val_losses.append(val_loss)
            
            # 学習率調整
            self.scheduler.step(val_loss)
            
            # Early Stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                torch.save(self.model.state_dict(), 'best_model.pth')
            else:
                patience_counter += 1
                if patience_counter >= 15:
                    print(f"Early stopping at epoch {epoch}")
                    break
            
            if epoch % 10 == 0:
                print(f'Epoch [{epoch}/{epochs}], Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}')
        
        # ベストモデルのロード
        self.model.load_state_dict(torch.load('best_model.pth'))
        
        return train_losses, val_losses
    
    def predict(self, X):
        """
        予測の実行
        """
        self.model.eval()
        X_tensor = torch.FloatTensor(X).to(self.device)
        
        with torch.no_grad():
            predictions = self.model(X_tensor)
        
        return predictions.cpu().numpy()

# PyTorchモデルの訓練と評価
pytorch_predictor = PyTorchHorsePredictor(input_dim=X.shape[1])
train_losses, val_losses = pytorch_predictor.train(X_train, y_train, X_val, y_val)

# 予測と評価
pytorch_predictions = pytorch_predictor.predict(X_test)
pytorch_mse = np.mean((y_test.reshape(-1, 1) - pytorch_predictions) ** 2)
pytorch_mae = np.mean(np.abs(y_test.reshape(-1, 1) - pytorch_predictions))

print(f"\nPyTorchモデルの結果:")
print(f"MSE: {pytorch_mse:.4f}")
print(f"MAE: {pytorch_mae:.4f}")
print(f"RMSE: {np.sqrt(pytorch_mse):.4f}")
```

## 高度なモデル設計

### アンサンブル学習の実装

```python
class HorseRacingEnsemble:
    """
    複数モデルによるアンサンブル学習
    """
    
    def __init__(self, input_dim, n_models=5):
        self.input_dim = input_dim
        self.n_models = n_models
        self.models = []
        self.histories = []
        
    def create_diverse_models(self):
        """
        多様なアーキテクチャのモデルを作成
        """
        model_configs = [
            {'hidden_layers': [256, 128, 64], 'dropout_rate': 0.3, 'lr': 0.001},
            {'hidden_layers': [512, 256, 128], 'dropout_rate': 0.2, 'lr': 0.0005},
            {'hidden_layers': [128, 64, 32], 'dropout_rate': 0.4, 'lr': 0.002},
            {'hidden_layers': [256, 256, 128, 64], 'dropout_rate': 0.25, 'lr': 0.001},
            {'hidden_layers': [384, 192, 96], 'dropout_rate': 0.35, 'lr': 0.0015}
        ]
        
        for i, config in enumerate(model_configs):
            model = Sequential()
            
            # 最初の層
            model.add(Dense(config['hidden_layers'][0], input_dim=self.input_dim, activation='relu'))
            model.add(BatchNormalization())
            model.add(Dropout(config['dropout_rate']))
            
            # 隠れ層
            for units in config['hidden_layers'][1:]:
                model.add(Dense(units, activation='relu'))
                model.add(BatchNormalization())
                model.add(Dropout(config['dropout_rate']))
            
            # 出力層
            model.add(Dense(1, activation='linear'))
            
            # コンパイル
            model.compile(
                optimizer=Adam(learning_rate=config['lr']),
                loss='mse',
                metrics=['mae']
            )
            
            self.models.append(model)
    
    def train_ensemble(self, X_train, y_train, X_val, y_val, epochs=100):
        """
        アンサンブルの訓練
        """
        if not self.models:
            self.create_diverse_models()
        
        for i, model in enumerate(self.models):
            print(f"\nモデル {i+1}/{self.n_models} を訓練中...")
            
            callbacks = [
                tf.keras.callbacks.EarlyStopping(
                    monitor='val_loss', patience=15, restore_best_weights=True
                ),
                tf.keras.callbacks.ReduceLROnPlateau(
                    monitor='val_loss', factor=0.5, patience=8
                )
            ]
            
            history = model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val),
                epochs=epochs,
                batch_size=32,
                callbacks=callbacks,
                verbose=0
            )
            
            self.histories.append(history)
    
    def predict_ensemble(self, X, method='mean'):
        """
        アンサンブル予測
        """
        predictions = []
        
        for model in self.models:
            pred = model.predict(X, verbose=0)
            predictions.append(pred)
        
        predictions = np.array(predictions)
        
        if method == 'mean':
            return np.mean(predictions, axis=0)
        elif method == 'median':
            return np.median(predictions, axis=0)
        elif method == 'weighted':
            # 検証性能に基づく重み付き平均
            weights = self.calculate_weights()
            return np.average(predictions, axis=0, weights=weights)
        
    def calculate_weights(self):
        """
        各モデルの重みを計算
        """
        val_losses = [min(history.history['val_loss']) for history in self.histories]
        inv_losses = 1.0 / np.array(val_losses)
        weights = inv_losses / inv_losses.sum()
        return weights

# アンサンブルモデルの訓練と評価
ensemble = HorseRacingEnsemble(input_dim=X.shape[1], n_models=3)
ensemble.train_ensemble(X_train, y_train, X_val, y_val)

# アンサンブル予測
ensemble_predictions = ensemble.predict_ensemble(X_test, method='weighted')
ensemble_mse = np.mean((y_test.reshape(-1, 1) - ensemble_predictions) ** 2)
ensemble_mae = np.mean(np.abs(y_test.reshape(-1, 1) - ensemble_predictions))

print(f"\nアンサンブルモデルの結果:")
print(f"MSE: {ensemble_mse:.4f}")
print(f"MAE: {ensemble_mae:.4f}")
print(f"RMSE: {np.sqrt(ensemble_mse):.4f}")
```

### 階層的ニューラルネットワークの実装

```python
def create_hierarchical_model(input_dim):
    """
    階層的構造を持つニューラルネットワーク
    馬の特徴量、騎手特徴量、レース特徴量を別々に処理
    """
    
    # 入力層
    input_layer = Input(shape=(input_dim,))
    
    # 馬関連特徴量の処理（0-15番目の特徴量）
    horse_features = input_layer[:, :16]
    horse_branch = Dense(128, activation='relu')(horse_features)
    horse_branch = BatchNormalization()(horse_branch)
    horse_branch = Dropout(0.3)(horse_branch)
    horse_branch = Dense(64, activation='relu')(horse_branch)
    horse_branch = BatchNormalization()(horse_branch)
    horse_branch = Dropout(0.2)(horse_branch)
    
    # 騎手関連特徴量の処理（16-20番目の特徴量）
    jockey_features = input_layer[:, 16:21]
    jockey_branch = Dense(64, activation='relu')(jockey_features)
    jockey_branch = BatchNormalization()(jockey_branch)
    jockey_branch = Dropout(0.2)(jockey_branch)
    jockey_branch = Dense(32, activation='relu')(jockey_branch)
    
    # レース条件関連特徴量の処理（残りの特徴量）
    race_features = input_layer[:, 21:]
    race_branch = Dense(64, activation='relu')(race_features)
    race_branch = BatchNormalization()(race_branch)
    race_branch = Dropout(0.2)(race_branch)
    race_branch = Dense(32, activation='relu')(race_branch)
    
    # 全ブランチの結合
    merged = Concatenate()([horse_branch, jockey_branch, race_branch])
    
    # 統合層
    x = Dense(128, activation='relu')(merged)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)
    
    x = Dense(64, activation='relu')(x)
    x = BatchNormalization()(x)
    x = Dropout(0.2)(x)
    
    # 出力層
    output = Dense(1, activation='linear')(x)
    
    model = Model(inputs=input_layer, outputs=output)
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae']
    )
    
    return model

# 階層的モデルの訓練
hierarchical_model = create_hierarchical_model(X.shape[1])
hierarchical_history = hierarchical_model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=100,
    batch_size=32,
    callbacks=[
        tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=15),
        tf.keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=8)
    ],
    verbose=1
)

# 階層的モデルの評価
hierarchical_predictions = hierarchical_model.predict(X_test)
hierarchical_mse = np.mean((y_test.reshape(-1, 1) - hierarchical_predictions) ** 2)
hierarchical_mae = np.mean(np.abs(y_test.reshape(-1, 1) - hierarchical_predictions))

print(f"\n階層的モデルの結果:")
print(f"MSE: {hierarchical_mse:.4f}")
print(f"MAE: {hierarchical_mae:.4f}")
print(f"RMSE: {np.sqrt(hierarchical_mse):.4f}")
```

## モデルの解釈可能性と特徴量重要度

```python
import shap
from lime.tabular import LimeTabularExplainer

class ModelInterpreter:
    """
    モデルの解釈可能性分析クラス
    """
    
    def __init__(self, model, X_train, feature_names):
        self.model = model
        self.X_train = X_train
        self.feature_names = feature_names
        
    def analyze_feature_importance(self):
        """
        特徴量重要度の分析
        """
        # 勾配ベースの特徴量重要度
        grads = []
        
        for i in range(len(self.X_train)):
            with tf.GradientTape() as tape:
                x = tf.Variable(self.X_train[i:i+1], dtype=tf.float32)
                tape.watch(x)
                pred = self.model(x)
            
            grad = tape.gradient(pred, x)
            grads.append(np.abs(grad.numpy()).flatten())
        
        feature_importance = np.mean(grads, axis=0)
        
        # 結果の可視化
        plt.figure(figsize=(12, 8))
        feature_imp_df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': feature_importance
        }).sort_values('importance', ascending=True)
        
        plt.barh(feature_imp_df['feature'][-20:], feature_imp_df['importance'][-20:])
        plt.title('上位20特徴量重要度')
        plt.xlabel('重要度')
        plt.tight_layout()
        plt.show()
        
        return feature_imp_df
    
    def explain_prediction_shap(self, X_explain, n_samples=100):
        """
        SHAP値による予測説明
        """
        # SHAP Explainer
        explainer = shap.KernelExplainer(
            self.model.predict, 
            self.X_train[:n_samples]
        )
        
        shap_values = explainer.shap_values(X_explain[:10])
        
        # SHAP値の可視化
        shap.summary_plot(shap_values, X_explain[:10], feature_names=self.feature_names)
        
        return shap_values
    
    def explain_prediction_lime(self, X_explain, instance_idx=0):
        """
        LIMEによる予測説明
        """
        explainer = LimeTabularExplainer(
            self.X_train,
            feature_names=self.feature_names,
            mode='regression'
        )
        
        explanation = explainer.explain_instance(
            X_explain[instance_idx], 
            self.model.predict,
            num_features=10
        )
        
        explanation.show_in_notebook(show_table=True)
        
        return explanation

# モデル解釈の実行
interpreter = ModelInterpreter(predictor.model, X_train, feature_names)
importance_df = interpreter.analyze_feature_importance()

print("最も重要な特徴量:")
print(importance_df.tail(10))
```

## 実用的な予測システムの構築

```python
class HorseRacingPredictionSystem:
    """
    実用的な競馬予測システム
    """
    
    def __init__(self):
        self.feature_engineer = HorseRacingFeatureEngineer()
        self.models = {}
        self.model_weights = {}
        
    def add_model(self, name, model, weight=1.0):
        """
        予測モデルの追加
        """
        self.models[name] = model
        self.model_weights[name] = weight
        
    def predict_race(self, race_data):
        """
        レース全体の予測
        """
        # 特徴量の準備
        X, _ = self.feature_engineer.prepare_features(race_data, is_training=False)
        
        # 各モデルで予測
        predictions = {}
        for name, model in self.models.items():
            pred = model.predict(X)
            predictions[name] = pred.flatten()
        
        # アンサンブル予測
        ensemble_pred = np.zeros(len(X))
        total_weight = sum(self.model_weights.values())
        
        for name, pred in predictions.items():
            weight = self.model_weights[name] / total_weight
            ensemble_pred += weight * pred
        
        # 結果の整理
        results = race_data.copy()
        results['predicted_odds'] = ensemble_pred
        results['predicted_win_probability'] = 1.0 / ensemble_pred
        
        # 推奨ランキング
        results['predicted_rank'] = results['predicted_odds'].rank()
        
        return results
    
    def calculate_betting_value(self, predictions, actual_odds, threshold=0.1):
        """
        ベッティング価値の計算
        """
        predicted_prob = 1.0 / predictions['predicted_odds']
        market_prob = 1.0 / actual_odds
        
        # バリューベット（予測確率 > マーケット確率 + 閾値）
        value_bets = predicted_prob > (market_prob + threshold)
        
        betting_value = (predicted_prob - market_prob) / market_prob
        
        return {
            'value_bets': value_bets,
            'betting_value': betting_value,
            'expected_return': betting_value * actual_odds
        }
    
    def evaluate_predictions(self, predictions, actual_results):
        """
        予測精度の評価
        """
        # オッズ予測精度
        odds_mae = np.mean(np.abs(predictions['predicted_odds'] - actual_results['actual_odds']))
        
        # 順位予測精度（Spearmanの順位相関）
        from scipy.stats import spearmanr
        rank_correlation, _ = spearmanr(
            predictions['predicted_rank'], 
            actual_results['finish_position']
        )
        
        # 1位予測精度
        predicted_winner = predictions.loc[predictions['predicted_rank'] == 1, 'horse_id'].iloc[0]
        actual_winner = actual_results.loc[actual_results['finish_position'] == 1, 'horse_id'].iloc[0]
        winner_accuracy = int(predicted_winner == actual_winner)
        
        return {
            'odds_mae': odds_mae,
            'rank_correlation': rank_correlation,
            'winner_accuracy': winner_accuracy
        }

# 予測システムの構築
prediction_system = HorseRacingPredictionSystem()

# 複数モデルの追加
prediction_system.add_model('basic_nn', predictor.model, weight=0.3)
prediction_system.add_model('ensemble', ensemble, weight=0.4)
prediction_system.add_model('hierarchical', hierarchical_model, weight=0.3)

# サンプルレースでの予測例
sample_race = horse_data[horse_data['race_id'] == 1].copy()
race_predictions = prediction_system.predict_race(sample_race)

print("レース予測結果:")
print(race_predictions[['horse_id', 'predicted_odds', 'predicted_win_probability', 'predicted_rank']].sort_values('predicted_rank'))
```

## 結果の可視化と分析

```python
def visualize_prediction_results(history, y_true, y_pred, feature_importance):
    """
    予測結果の総合的な可視化
    """
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    
    # 1. 訓練履歴
    axes[0, 0].plot(history.history['loss'], label='訓練損失')
    axes[0, 0].plot(history.history['val_loss'], label='検証損失')
    axes[0, 0].set_title('モデル訓練履歴')
    axes[0, 0].set_xlabel('エポック')
    axes[0, 0].set_ylabel('損失')
    axes[0, 0].legend()
    axes[0, 0].grid(True)
    
    # 2. 予測vs実際の散布図
    axes[0, 1].scatter(y_true, y_pred, alpha=0.5)
    axes[0, 1].plot([y_true.min(), y_true.max()], [y_true.min(), y_true.max()], 'r--', lw=2)
    axes[0, 1].set_xlabel('実際のオッズ')
    axes[0, 1].set_ylabel('予測オッズ')
    axes[0, 1].set_title('予測精度')
    axes[0, 1].grid(True)
    
    # 3. 残差プロット
    residuals = y_true - y_pred.flatten()
    axes[0, 2].scatter(y_pred.flatten(), residuals, alpha=0.5)
    axes[0, 2].axhline(y=0, color='r', linestyle='--')
    axes[0, 2].set_xlabel('予測オッズ')
    axes[0, 2].set_ylabel('残差')
    axes[0, 2].set_title('残差分析')
    axes[0, 2].grid(True)
    
    # 4. オッズ分布比較
    axes[1, 0].hist(y_true, alpha=0.5, label='実際', bins=30)
    axes[1, 0].hist(y_pred.flatten(), alpha=0.5, label='予測', bins=30)
    axes[1, 0].set_xlabel('オッズ')
    axes[1, 0].set_ylabel('頻度')
    axes[1, 0].set_title('オッズ分布比較')
    axes[1, 0].legend()
    axes[1, 0].grid(True)
    
    # 5. 予測誤差分布
    axes[1, 1].hist(residuals, bins=30, edgecolor='black', alpha=0.7)
    axes[1, 1].axvline(x=0, color='r', linestyle='--')
    axes[1, 1].set_xlabel('予測誤差')
    axes[1, 1].set_ylabel('頻度')
    axes[1, 1].set_title('誤差分布')
    axes[1, 1].grid(True)
    
    # 6. 特徴量重要度（上位10個）
    top_features = feature_importance.tail(10)
    axes[1, 2].barh(top_features['feature'], top_features['importance'])
    axes[1, 2].set_title('特徴量重要度（上位10）')
    axes[1, 2].set_xlabel('重要度')
    
    plt.tight_layout()
    plt.show()

# 可視化の実行
visualize_prediction_results(
    history, 
    y_test, 
    predictions, 
    importance_df
)

# 性能指標のまとめ
def print_performance_summary():
    """
    全モデルの性能サマリー
    """
    print("=" * 60)
    print("競馬オッズ予測モデル性能比較")
    print("=" * 60)
    
    models_results = {
        'TensorFlow基本モデル': {'MSE': test_mse, 'MAE': test_mae},
        'PyTorchモデル': {'MSE': pytorch_mse, 'MAE': pytorch_mae},
        'アンサンブルモデル': {'MSE': ensemble_mse, 'MAE': ensemble_mae},
        '階層的モデル': {'MSE': hierarchical_mse, 'MAE': hierarchical_mae}
    }
    
    for model_name, metrics in models_results.items():
        print(f"\n{model_name}:")
        print(f"  MSE:  {metrics['MSE']:.4f}")
        print(f"  MAE:  {metrics['MAE']:.4f}")
        print(f"  RMSE: {np.sqrt(metrics['MSE']):.4f}")
    
    print("\n" + "=" * 60)

print_performance_summary()
```

## 実運用での考慮事項

### データ収集と前処理の自動化

```python
class RaceDataPipeline:
    """
    競馬データの自動収集・前処理パイプライン
    """
    
    def __init__(self):
        self.feature_engineer = HorseRacingFeatureEngineer()
        self.data_quality_checks = []
        
    def collect_daily_data(self, date):
        """
        日次データの収集（実際の実装では外部APIを使用）
        """
        # ここでは模擬的な実装
        print(f"{date}のレースデータを収集中...")
        # 実際の実装: JRA公式API、競馬サイトのスクレイピング等
        return self.generate_mock_race_data()
    
    def generate_mock_race_data(self):
        """
        模擬レースデータの生成
        """
        return generate_horse_racing_data(10, 12)  # 10レース、各12頭
    
    def validate_data_quality(self, data):
        """
        データ品質のチェック
        """
        issues = []
        
        # 欠損値チェック
        missing_rate = data.isnull().sum() / len(data)
        if (missing_rate > 0.1).any():
            issues.append("高い欠損値率を検出")
        
        # 異常値チェック
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            Q1 = data[col].quantile(0.25)
            Q3 = data[col].quantile(0.75)
            IQR = Q3 - Q1
            outliers = ((data[col] < Q1 - 1.5 * IQR) | (data[col] > Q3 + 1.5 * IQR)).sum()
            if outliers > len(data) * 0.1:  # 10%以上が異常値
                issues.append(f"{col}に多数の異常値を検出")
        
        return issues
    
    def preprocess_for_prediction(self, raw_data):
        """
        予測用データの前処理
        """
        # データ品質チェック
        quality_issues = self.validate_data_quality(raw_data)
        if quality_issues:
            print(f"データ品質の問題: {quality_issues}")
        
        # 特徴量エンジニアリング
        processed_data = self.feature_engineer.create_advanced_features(raw_data)
        processed_data = self.feature_engineer.encode_categorical_features(processed_data)
        
        return processed_data

# データパイプラインの使用例
pipeline = RaceDataPipeline()
daily_data = pipeline.collect_daily_data("2024-11-16")
processed_data = pipeline.preprocess_for_prediction(daily_data)
```

### リアルタイム予測API

```python
from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)

# モデルの読み込み（事前に保存済みのモデルを想定）
loaded_models = {
    'ensemble': joblib.load('ensemble_model.pkl'),
    'feature_engineer': joblib.load('feature_engineer.pkl')
}

@app.route('/predict', methods=['POST'])
def predict_race_odds():
    """
    リアルタイムオッズ予測API
    """
    try:
        # リクエストデータの取得
        race_data = request.json
        
        # データフレームに変換
        df = pd.DataFrame(race_data['horses'])
        
        # 特徴量の準備
        X, _ = loaded_models['feature_engineer'].prepare_features(df, is_training=False)
        
        # 予測実行
        predictions = loaded_models['ensemble'].predict_ensemble(X)
        
        # 結果の整理
        results = []
        for i, (_, horse) in enumerate(df.iterrows()):
            results.append({
                'horse_id': horse['horse_id'],
                'horse_name': horse.get('horse_name', ''),
                'predicted_odds': float(predictions[i][0]),
                'predicted_probability': float(1.0 / predictions[i][0]),
                'confidence': 'high' if predictions[i][0] > 2.0 else 'medium'
            })
        
        # 順位付け
        results.sort(key=lambda x: x['predicted_odds'])
        for i, result in enumerate(results):
            result['predicted_rank'] = i + 1
        
        return jsonify({
            'status': 'success',
            'predictions': results,
            'metadata': {
                'model_version': '1.0',
                'prediction_time': pd.Timestamp.now().isoformat()
            }
        })
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

## まとめ

本記事では、ニューラルネットワークを用いた競馬オッズ予測システムの構築について詳細に解説しました。重要なポイントを以下にまとめます：

### 技術的成果

1. **多次元特徴量の効果的活用**: 馬の能力、騎手データ、レース条件などを総合的に分析
2. **高度なモデル設計**: アンサンブル学習、階層的ネットワークによる予測精度向上
3. **実用的システム設計**: リアルタイム予測APIとデータパイプラインの構築

### 実装技術

- **TensorFlow/PyTorch**: 両フレームワークでの実装例
- **特徴量エンジニアリング**: ドメイン知識を活用した効果的な特徴量設計
- **モデル解釈性**: SHAP、LIMEによる予測根拠の可視化
- **性能最適化**: ハイパーパラメータチューニングとアンサンブル学習

### ビジネス適用

- **バリューベット識別**: 市場オッズと予測オッズの比較による投資機会発見
- **リスク管理**: 予測信頼度に基づく賭け金調整
- **継続的改善**: 予測結果のフィードバックによるモデル更新

### 今後の展望

1. **Transformerベースモデル**: 注意機構による長期依存関係の学習
2. **強化学習**: 動的な戦略最適化
3. **グラフニューラルネットワーク**: 馬同士の関係性モデリング
4. **外部データ統合**: 気象データ、ソーシャルメディア情報の活用

競馬オッズ予測は、深層学習の様々な技術を統合的に活用する優れた実践的課題です。本記事で紹介した手法をベースに、実際のデータと要件に合わせてカスタマイズすることで、高精度な予測システムの構築が可能になります。