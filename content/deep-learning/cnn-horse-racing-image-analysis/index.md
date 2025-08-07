---
title: "CNNによる競馬画像データ分析 - 馬体重の自動判定"
date: 2024-11-17T10:00:00+09:00
description: "畳み込みニューラルネットワーク（CNN）を使用して競馬の馬体画像から体重や体調を自動判定する方法を詳しく解説します。コンピュータビジョン技術とTensorFlow/PyTorchを活用した実践的な画像認識システムの構築手法を学べます。"
categories: ["深層学習", "コンピュータビジョン", "スポーツアナリティクス"]
tags: ["CNN", "画像認識", "競馬", "TensorFlow", "PyTorch", "コンピュータビジョン", "馬体重判定", "深層学習", "画像解析"]
slug: "cnn-horse-racing-image-analysis"
image: "cnn_horse_analysis.jpg"
weight: 100
---

## はじめに

競馬において、馬の体調や体重は競走成績に大きく影響する重要な要因です。従来、これらの情報は専門家の目視による判断や実際の体重計測に依存していましたが、近年のコンピュータビジョン技術の発達により、画像から自動的に馬の体重や体調を判定することが可能になってきました。

本記事では、畳み込みニューラルネットワーク（CNN）を活用して、競馬の馬体画像から体重を自動判定するシステムの構築方法を詳しく解説します。画像データの収集・前処理から、CNNモデルの設計・訓練、実際の判定システムまで、実践的なアプローチを紹介します。

## CNNによる画像解析の基礎理論

### 畳み込みニューラルネットワークの仕組み

CNNは画像認識において最も効果的な深層学習手法の一つで、以下の特徴的な層から構成されます：

1. **畳み込み層（Convolution Layer）**: 特徴マップの抽出
2. **プーリング層（Pooling Layer）**: 特徴マップのダウンサンプリング
3. **全結合層（Dense Layer）**: 最終的な分類・回帰

### 馬体画像解析における課題

競馬の馬体画像解析には以下のような特有の課題があります：

- **個体差**: 馬種、年齢、性別による体型の違い
- **撮影条件**: 角度、照明、背景の多様性
- **動的な対象**: 馬の動きによる画像のブレ
- **部分的な隠蔽**: 他の馬や障害物による遮蔽
- **季節変動**: 毛色や体調の季節的変化

## データセットの構築と前処理

### 画像データの準備

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image, ImageDraw, ImageFilter
import cv2
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, callbacks
from tensorflow.keras.applications import ResNet50, VGG16, EfficientNetB0
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import torch
import torch.nn as nn
import torch.optim as optim
import torchvision
from torchvision import transforms, models as torch_models
from torch.utils.data import Dataset, DataLoader

# 馬体画像データセットの生成（実際の使用では実画像を使用）
def generate_synthetic_horse_images(n_samples=5000, image_size=(224, 224)):
    """
    合成馬体画像データの生成
    実際の実装では実際の競馬画像データを使用
    """
    np.random.seed(42)
    
    images = []
    labels = []
    metadata = []
    
    for i in range(n_samples):
        # 基本的な楕円形状で馬のシルエットを模倣
        img = Image.new('RGB', image_size, color='lightgray')
        draw = ImageDraw.Draw(img)
        
        # 馬の体重に応じたサイズ変化（400-600kg範囲）
        weight = np.random.uniform(400, 600)
        
        # 体重に基づく形状パラメータ
        body_width = int(80 + (weight - 400) / 200 * 40)  # 80-120px
        body_height = int(120 + (weight - 400) / 200 * 30)  # 120-150px
        
        # 馬体の描画
        center_x, center_y = image_size[0] // 2, image_size[1] // 2
        
        # メインボディ（楕円）
        draw.ellipse([
            center_x - body_width//2, center_y - body_height//2,
            center_x + body_width//2, center_y + body_height//2
        ], fill='brown', outline='darkbrown', width=2)
        
        # 首部分
        neck_width = int(body_width * 0.3)
        neck_height = int(body_height * 0.4)
        draw.ellipse([
            center_x - neck_width//2, center_y - body_height//2 - neck_height//2,
            center_x + neck_width//2, center_y - body_height//2 + neck_height//2
        ], fill='brown', outline='darkbrown', width=2)
        
        # 脚部分（簡略化）
        leg_positions = [
            (center_x - body_width//3, center_y + body_height//2),
            (center_x + body_width//3, center_y + body_height//2),
            (center_x - body_width//6, center_y + body_height//2),
            (center_x + body_width//6, center_y + body_height//2)
        ]
        
        for x, y in leg_positions:
            draw.rectangle([x-5, y, x+5, y+30], fill='brown', outline='darkbrown')
        
        # ノイズとバリエーションの追加
        img_array = np.array(img)
        
        # 色彩変動
        color_variation = np.random.normal(0, 10, img_array.shape)
        img_array = np.clip(img_array + color_variation, 0, 255).astype(np.uint8)
        
        # ぼかし効果（動きによるブレを模倣）
        if np.random.random() < 0.3:
            img = Image.fromarray(img_array)
            img = img.filter(ImageFilter.GaussianBlur(radius=np.random.uniform(0.5, 2.0)))
            img_array = np.array(img)
        
        # 回転
        if np.random.random() < 0.5:
            img = Image.fromarray(img_array)
            angle = np.random.uniform(-15, 15)
            img = img.rotate(angle, fillcolor='lightgray')
            img_array = np.array(img)
        
        # 背景ノイズ
        background_noise = np.random.normal(0, 5, img_array.shape)
        img_array = np.clip(img_array + background_noise, 0, 255).astype(np.uint8)
        
        images.append(img_array)
        labels.append(weight)
        
        # メタデータ
        metadata.append({
            'horse_id': f'horse_{i:05d}',
            'age': np.random.randint(3, 8),
            'sex': np.random.choice(['牡', '牝', 'セ']),
            'breed': np.random.choice(['サラブレッド', 'アラブ', '日本在来馬']),
            'season': np.random.choice(['春', '夏', '秋', '冬']),
            'body_condition': np.random.choice(['良', '普通', '痩せ', '太め']),
            'actual_weight': weight
        })
    
    return np.array(images), np.array(labels), pd.DataFrame(metadata)

# データセット生成
print("馬体画像データセットを生成中...")
images, weights, metadata = generate_synthetic_horse_images(5000, (224, 224))

print(f"画像データ形状: {images.shape}")
print(f"体重ラベル形状: {weights.shape}")
print(f"体重統計: 平均={weights.mean():.1f}kg, 標準偏差={weights.std():.1f}kg")
print(f"体重範囲: {weights.min():.1f}kg - {weights.max():.1f}kg")
```

### データ前処理と拡張

```python
class HorseImagePreprocessor:
    """
    馬体画像の前処理クラス
    """
    
    def __init__(self, target_size=(224, 224), augmentation=True):
        self.target_size = target_size
        self.augmentation = augmentation
        self.scaler = StandardScaler()
        
    def preprocess_images(self, images):
        """
        画像の基本前処理
        """
        # 正規化 (0-255 → 0-1)
        normalized_images = images.astype(np.float32) / 255.0
        
        # チャンネル毎の標準化
        for i in range(normalized_images.shape[-1]):
            channel_data = normalized_images[:, :, :, i]
            mean_val = channel_data.mean()
            std_val = channel_data.std()
            normalized_images[:, :, :, i] = (channel_data - mean_val) / (std_val + 1e-8)
        
        return normalized_images
    
    def create_data_generators(self, X_train, y_train, X_val, y_val, batch_size=32):
        """
        データ拡張ジェネレータの作成
        """
        if self.augmentation:
            train_datagen = ImageDataGenerator(
                rotation_range=20,
                width_shift_range=0.1,
                height_shift_range=0.1,
                horizontal_flip=True,
                zoom_range=0.1,
                brightness_range=[0.8, 1.2],
                fill_mode='nearest'
            )
        else:
            train_datagen = ImageDataGenerator()
        
        val_datagen = ImageDataGenerator()
        
        train_generator = train_datagen.flow(
            X_train, y_train,
            batch_size=batch_size,
            shuffle=True
        )
        
        val_generator = val_datagen.flow(
            X_val, y_val,
            batch_size=batch_size,
            shuffle=False
        )
        
        return train_generator, val_generator
    
    def extract_visual_features(self, images):
        """
        手作り視覚特徴量の抽出
        """
        features = []
        
        for img in images:
            # グレースケール変換
            if len(img.shape) == 3:
                gray = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
            else:
                gray = img
            
            # 形状特徴量
            contours, _ = cv2.findContours(
                cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)[1],
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE
            )
            
            if contours:
                # 最大の輪郭を馬体として認識
                largest_contour = max(contours, key=cv2.contourArea)
                
                # 面積
                area = cv2.contourArea(largest_contour)
                
                # 外接矩形
                x, y, w, h = cv2.boundingRect(largest_contour)
                aspect_ratio = w / h if h > 0 else 0
                
                # 周囲長
                perimeter = cv2.arcLength(largest_contour, True)
                
                # 円形度
                circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0
                
                features.append([area, aspect_ratio, perimeter, circularity, w, h])
            else:
                features.append([0, 0, 0, 0, 0, 0])
        
        return np.array(features)

# 前処理の実行
preprocessor = HorseImagePreprocessor(target_size=(224, 224))
processed_images = preprocessor.preprocess_images(images)

# 手作り特徴量の抽出
visual_features = preprocessor.extract_visual_features(processed_images)

print(f"前処理済み画像形状: {processed_images.shape}")
print(f"視覚特徴量形状: {visual_features.shape}")

# データ分割
X_train, X_test, y_train, y_test = train_test_split(
    processed_images, weights, test_size=0.2, random_state=42
)
X_train, X_val, y_train, y_val = train_test_split(
    X_train, y_train, test_size=0.2, random_state=42
)

print(f"訓練データ: {X_train.shape}")
print(f"検証データ: {X_val.shape}")
print(f"テストデータ: {X_test.shape}")
```

## CNNモデルの設計と実装

### 基本的なCNNモデル

```python
def create_basic_cnn_model(input_shape=(224, 224, 3)):
    """
    基本的なCNNモデルの構築
    """
    model = models.Sequential([
        # 第1ブロック
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=input_shape),
        layers.BatchNormalization(),
        layers.Conv2D(32, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        # 第2ブロック
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.BatchNormalization(),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        # 第3ブロック
        layers.Conv2D(128, (3, 3), activation='relu'),
        layers.BatchNormalization(),
        layers.Conv2D(128, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        # 第4ブロック
        layers.Conv2D(256, (3, 3), activation='relu'),
        layers.BatchNormalization(),
        layers.Conv2D(256, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        # 分類器部分
        layers.GlobalAveragePooling2D(),
        layers.Dense(512, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.5),
        layers.Dense(256, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.5),
        layers.Dense(1, activation='linear')  # 回帰問題
    ])
    
    return model

# 基本モデルの構築
basic_model = create_basic_cnn_model()
basic_model.compile(
    optimizer=optimizers.Adam(learning_rate=0.001),
    loss='mse',
    metrics=['mae']
)

basic_model.summary()
```

### 転移学習を活用したモデル

```python
def create_transfer_learning_model(base_model_name='resnet50', input_shape=(224, 224, 3)):
    """
    転移学習を活用したモデル構築
    """
    # ベースモデルの選択
    if base_model_name == 'resnet50':
        base_model = ResNet50(
            weights='imagenet',
            include_top=False,
            input_shape=input_shape
        )
    elif base_model_name == 'vgg16':
        base_model = VGG16(
            weights='imagenet',
            include_top=False,
            input_shape=input_shape
        )
    elif base_model_name == 'efficientnet':
        base_model = EfficientNetB0(
            weights='imagenet',
            include_top=False,
            input_shape=input_shape
        )
    
    # ベースモデルの重みを凍結
    base_model.trainable = False
    
    # カスタム分類器の追加
    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dense(512, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.5),
        layers.Dense(256, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(128, activation='relu'),
        layers.BatchNormalization(),
        layers.Dropout(0.2),
        layers.Dense(1, activation='linear')
    ])
    
    return model, base_model

# 転移学習モデルの構築
transfer_model, base_model = create_transfer_learning_model('resnet50')
transfer_model.compile(
    optimizer=optimizers.Adam(learning_rate=0.001),
    loss='mse',
    metrics=['mae']
)

print(f"転移学習モデル構築完了")
print(f"総パラメータ数: {transfer_model.count_params():,}")
```

### マルチモーダルモデル（画像 + 構造化データ）

```python
def create_multimodal_model(image_shape=(224, 224, 3), metadata_features=5):
    """
    画像と構造化データを組み合わせたマルチモーダルモデル
    """
    # 画像入力ブランチ
    image_input = layers.Input(shape=image_shape, name='image_input')
    
    # CNN部分
    x = layers.Conv2D(64, (3, 3), activation='relu')(image_input)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D((2, 2))(x)
    
    x = layers.Conv2D(128, (3, 3), activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D((2, 2))(x)
    
    x = layers.Conv2D(256, (3, 3), activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D((2, 2))(x)
    
    x = layers.GlobalAveragePooling2D()(x)
    image_features = layers.Dense(256, activation='relu')(x)
    
    # メタデータ入力ブランチ
    metadata_input = layers.Input(shape=(metadata_features,), name='metadata_input')
    metadata_features_dense = layers.Dense(64, activation='relu')(metadata_input)
    metadata_features_dense = layers.BatchNormalization()(metadata_features_dense)
    metadata_features_dense = layers.Dense(32, activation='relu')(metadata_features_dense)
    
    # 特徴量の結合
    combined = layers.Concatenate()([image_features, metadata_features_dense])
    
    # 最終的な予測層
    x = layers.Dense(256, activation='relu')(combined)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.5)(x)
    
    x = layers.Dense(128, activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.3)(x)
    
    output = layers.Dense(1, activation='linear', name='weight_output')(x)
    
    model = models.Model(inputs=[image_input, metadata_input], outputs=output)
    
    return model

# マルチモーダルモデルの構築
multimodal_model = create_multimodal_model(
    image_shape=(224, 224, 3),
    metadata_features=visual_features.shape[1]
)

multimodal_model.compile(
    optimizer=optimizers.Adam(learning_rate=0.001),
    loss='mse',
    metrics=['mae']
)

print("マルチモーダルモデル構築完了")
multimodal_model.summary()
```

## モデルの訓練と評価

### 基本CNNモデルの訓練

```python
class HorseWeightTrainer:
    """
    馬体重予測モデルの訓練クラス
    """
    
    def __init__(self, model, model_name="cnn_model"):
        self.model = model
        self.model_name = model_name
        self.history = None
        
    def train_model(self, X_train, y_train, X_val, y_val, epochs=100, batch_size=32):
        """
        モデルの訓練
        """
        # コールバックの設定
        callbacks_list = [
            callbacks.EarlyStopping(
                monitor='val_loss',
                patience=15,
                restore_best_weights=True,
                verbose=1
            ),
            callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=8,
                min_lr=1e-7,
                verbose=1
            ),
            callbacks.ModelCheckpoint(
                f'best_{self.model_name}.h5',
                monitor='val_loss',
                save_best_only=True,
                verbose=1
            )
        ]
        
        # 訓練実行
        self.history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks_list,
            verbose=1
        )
        
        return self.history
    
    def evaluate_model(self, X_test, y_test):
        """
        モデルの評価
        """
        # テストデータでの評価
        test_loss, test_mae = self.model.evaluate(X_test, y_test, verbose=0)
        
        # 予測実行
        predictions = self.model.predict(X_test, verbose=0)
        
        # 詳細な評価指標
        mse = np.mean((y_test - predictions.flatten()) ** 2)
        rmse = np.sqrt(mse)
        mae = np.mean(np.abs(y_test - predictions.flatten()))
        mape = np.mean(np.abs((y_test - predictions.flatten()) / y_test)) * 100
        
        # 体重範囲別の精度
        weight_ranges = [(400, 450), (450, 500), (500, 550), (550, 600)]
        range_accuracies = {}
        
        for min_w, max_w in weight_ranges:
            mask = (y_test >= min_w) & (y_test < max_w)
            if mask.sum() > 0:
                range_mae = np.mean(np.abs(y_test[mask] - predictions.flatten()[mask]))
                range_accuracies[f'{min_w}-{max_w}kg'] = range_mae
        
        results = {
            'test_loss': test_loss,
            'mse': mse,
            'rmse': rmse,
            'mae': mae,
            'mape': mape,
            'range_accuracies': range_accuracies,
            'predictions': predictions.flatten()
        }
        
        return results

# 基本CNNモデルの訓練
print("基本CNNモデルの訓練を開始...")
basic_trainer = HorseWeightTrainer(basic_model, "basic_cnn")
basic_history = basic_trainer.train_model(X_train, y_train, X_val, y_val, epochs=50)

# 基本モデルの評価
basic_results = basic_trainer.evaluate_model(X_test, y_test)
print(f"\n基本CNNモデルの結果:")
print(f"RMSE: {basic_results['rmse']:.2f} kg")
print(f"MAE: {basic_results['mae']:.2f} kg")
print(f"MAPE: {basic_results['mape']:.2f}%")
```

### 転移学習モデルの訓練

```python
# 転移学習モデルの訓練
print("転移学習モデルの訓練を開始...")
transfer_trainer = HorseWeightTrainer(transfer_model, "transfer_learning")
transfer_history = transfer_trainer.train_model(X_train, y_train, X_val, y_val, epochs=30)

# 転移学習モデルの評価
transfer_results = transfer_trainer.evaluate_model(X_test, y_test)
print(f"\n転移学習モデルの結果:")
print(f"RMSE: {transfer_results['rmse']:.2f} kg")
print(f"MAE: {transfer_results['mae']:.2f} kg")
print(f"MAPE: {transfer_results['mape']:.2f}%")

# Fine-tuning（微調整）の実行
print("\nFine-tuningを実行中...")
base_model.trainable = True

# 後半の層のみ訓練可能にする
for layer in base_model.layers[:-10]:
    layer.trainable = False

# 学習率を下げて再コンパイル
transfer_model.compile(
    optimizer=optimizers.Adam(learning_rate=0.0001),
    loss='mse',
    metrics=['mae']
)

# Fine-tuning訓練
finetune_history = transfer_model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=20,
    batch_size=16,
    callbacks=[
        callbacks.EarlyStopping(monitor='val_loss', patience=10),
        callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5)
    ],
    verbose=1
)

# Fine-tuning後の評価
finetune_results = transfer_trainer.evaluate_model(X_test, y_test)
print(f"\nFine-tuning後の結果:")
print(f"RMSE: {finetune_results['rmse']:.2f} kg")
print(f"MAE: {finetune_results['mae']:.2f} kg")
print(f"MAPE: {finetune_results['mape']:.2f}%")
```

### マルチモーダルモデルの訓練

```python
# マルチモーダルデータの準備
metadata_train = visual_features[X_train.shape[0]:][:X_train.shape[0]]
metadata_val = visual_features[X_train.shape[0]+X_val.shape[0]:][:X_val.shape[0]]
metadata_test = visual_features[-X_test.shape[0]:]

# マルチモーダルモデルの訓練
print("マルチモーダルモデルの訓練を開始...")
multimodal_history = multimodal_model.fit(
    [X_train, metadata_train], y_train,
    validation_data=([X_val, metadata_val], y_val),
    epochs=50,
    batch_size=32,
    callbacks=[
        callbacks.EarlyStopping(monitor='val_loss', patience=15),
        callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=8),
        callbacks.ModelCheckpoint('best_multimodal.h5', monitor='val_loss', save_best_only=True)
    ],
    verbose=1
)

# マルチモーダルモデルの評価
multimodal_predictions = multimodal_model.predict([X_test, metadata_test], verbose=0)
multimodal_mse = np.mean((y_test - multimodal_predictions.flatten()) ** 2)
multimodal_rmse = np.sqrt(multimodal_mse)
multimodal_mae = np.mean(np.abs(y_test - multimodal_predictions.flatten()))
multimodal_mape = np.mean(np.abs((y_test - multimodal_predictions.flatten()) / y_test)) * 100

print(f"\nマルチモーダルモデルの結果:")
print(f"RMSE: {multimodal_rmse:.2f} kg")
print(f"MAE: {multimodal_mae:.2f} kg")
print(f"MAPE: {multimodal_mape:.2f}%")
```

## PyTorchによる実装

### PyTorchカスタムデータセット

```python
class HorseImageDataset(Dataset):
    """
    馬体画像のカスタムデータセット
    """
    
    def __init__(self, images, weights, transform=None):
        self.images = images
        self.weights = weights
        self.transform = transform
        
    def __len__(self):
        return len(self.images)
    
    def __getitem__(self, idx):
        image = self.images[idx]
        weight = self.weights[idx]
        
        # PILイメージに変換
        if isinstance(image, np.ndarray):
            image = Image.fromarray((image * 255).astype(np.uint8))
        
        if self.transform:
            image = self.transform(image)
        
        return image, torch.FloatTensor([weight])

# データ変換の定義
train_transform = transforms.Compose([
    transforms.RandomRotation(20),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

val_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

# データセットとデータローダーの作成
train_dataset = HorseImageDataset(X_train, y_train, transform=train_transform)
val_dataset = HorseImageDataset(X_val, y_val, transform=val_transform)
test_dataset = HorseImageDataset(X_test, y_test, transform=val_transform)

train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)
```

### PyTorchモデル定義

```python
class HorseWeightCNN(nn.Module):
    """
    PyTorchベースの馬体重予測CNN
    """
    
    def __init__(self, num_classes=1):
        super(HorseWeightCNN, self).__init__()
        
        # 特徴抽出部
        self.features = nn.Sequential(
            # Block 1
            nn.Conv2d(3, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Dropout2d(0.25),
            
            # Block 2
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Dropout2d(0.25),
            
            # Block 3
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),
            nn.Dropout2d(0.25),
            
            # Block 4
            nn.Conv2d(256, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            nn.Conv2d(512, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((1, 1))
        )
        
        # 回帰ヘッド
        self.regressor = nn.Sequential(
            nn.Flatten(),
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(128, num_classes)
        )
    
    def forward(self, x):
        x = self.features(x)
        x = self.regressor(x)
        return x

# PyTorchモデルの訓練クラス
class PyTorchHorseWeightTrainer:
    """
    PyTorchベースの訓練クラス
    """
    
    def __init__(self, model, device=None):
        self.device = device or torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = model.to(self.device)
        self.criterion = nn.MSELoss()
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.001)
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', patience=8, factor=0.5
        )
        
    def train_epoch(self, train_loader):
        """
        1エポックの訓練
        """
        self.model.train()
        total_loss = 0.0
        num_batches = 0
        
        for images, targets in train_loader:
            images, targets = images.to(self.device), targets.to(self.device)
            
            self.optimizer.zero_grad()
            outputs = self.model(images)
            loss = self.criterion(outputs, targets)
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
            num_batches += 1
        
        return total_loss / num_batches
    
    def validate_epoch(self, val_loader):
        """
        1エポックの検証
        """
        self.model.eval()
        total_loss = 0.0
        all_predictions = []
        all_targets = []
        
        with torch.no_grad():
            for images, targets in val_loader:
                images, targets = images.to(self.device), targets.to(self.device)
                outputs = self.model(images)
                loss = self.criterion(outputs, targets)
                
                total_loss += loss.item()
                all_predictions.extend(outputs.cpu().numpy())
                all_targets.extend(targets.cpu().numpy())
        
        avg_loss = total_loss / len(val_loader)
        predictions = np.array(all_predictions).flatten()
        targets = np.array(all_targets).flatten()
        mae = np.mean(np.abs(predictions - targets))
        
        return avg_loss, mae
    
    def train_model(self, train_loader, val_loader, epochs=100):
        """
        モデルの訓練
        """
        best_val_loss = float('inf')
        patience_counter = 0
        train_losses = []
        val_losses = []
        val_maes = []
        
        for epoch in range(epochs):
            # 訓練
            train_loss = self.train_epoch(train_loader)
            
            # 検証
            val_loss, val_mae = self.validate_epoch(val_loader)
            
            # 学習率調整
            self.scheduler.step(val_loss)
            
            # 記録
            train_losses.append(train_loss)
            val_losses.append(val_loss)
            val_maes.append(val_mae)
            
            # Early stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                torch.save(self.model.state_dict(), 'best_pytorch_model.pth')
            else:
                patience_counter += 1
                if patience_counter >= 15:
                    print(f"Early stopping at epoch {epoch}")
                    break
            
            if epoch % 10 == 0:
                print(f'Epoch {epoch}: Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}, Val MAE: {val_mae:.2f}kg')
        
        # ベストモデルのロード
        self.model.load_state_dict(torch.load('best_pytorch_model.pth'))
        
        return {
            'train_losses': train_losses,
            'val_losses': val_losses,
            'val_maes': val_maes
        }

# PyTorchモデルの訓練と評価
pytorch_model = HorseWeightCNN()
pytorch_trainer = PyTorchHorseWeightTrainer(pytorch_model)

print("PyTorchモデルの訓練を開始...")
pytorch_history = pytorch_trainer.train_model(train_loader, val_loader, epochs=50)

# テストデータでの評価
pytorch_trainer.model.eval()
test_predictions = []
test_targets = []

with torch.no_grad():
    for images, targets in test_loader:
        images, targets = images.to(pytorch_trainer.device), targets.to(pytorch_trainer.device)
        outputs = pytorch_trainer.model(images)
        test_predictions.extend(outputs.cpu().numpy())
        test_targets.extend(targets.cpu().numpy())

test_predictions = np.array(test_predictions).flatten()
test_targets = np.array(test_targets).flatten()

pytorch_rmse = np.sqrt(np.mean((test_targets - test_predictions) ** 2))
pytorch_mae = np.mean(np.abs(test_targets - test_predictions))
pytorch_mape = np.mean(np.abs((test_targets - test_predictions) / test_targets)) * 100

print(f"\nPyTorchモデルの結果:")
print(f"RMSE: {pytorch_rmse:.2f} kg")
print(f"MAE: {pytorch_mae:.2f} kg")
print(f"MAPE: {pytorch_mape:.2f}%")
```

## 高度な解析手法

### Grad-CAM による注目領域の可視化

```python
import tensorflow.keras.backend as K

class GradCAM:
    """
    Grad-CAMによる注目領域の可視化
    """
    
    def __init__(self, model, layer_name):
        self.model = model
        self.layer_name = layer_name
        
    def generate_heatmap(self, image, class_idx=None):
        """
        ヒートマップの生成
        """
        # 勾配テープの使用
        with tf.GradientTape() as tape:
            # 指定した層の出力を取得
            conv_layer = self.model.get_layer(self.layer_name)
            conv_output = conv_layer.output
            
            # モデルの分割
            grad_model = tf.keras.models.Model(
                inputs=self.model.inputs,
                outputs=[conv_output, self.model.output]
            )
            
            # 勾配の計算
            conv_outputs, predictions = grad_model(np.expand_dims(image, 0))
            loss = predictions[0]
        
        # 勾配の取得
        grads = tape.gradient(loss, conv_outputs)
        
        # チャンネル毎の重み計算
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # 特徴マップと勾配の積
        conv_outputs = conv_outputs[0]
        heatmap = tf.reduce_mean(tf.multiply(pooled_grads, conv_outputs), axis=-1)
        
        # 正規化
        heatmap = tf.maximum(heatmap, 0)
        heatmap /= tf.reduce_max(heatmap)
        
        return heatmap.numpy()
    
    def visualize_heatmap(self, image, heatmap, alpha=0.4):
        """
        ヒートマップの可視化
        """
        # ヒートマップのリサイズ
        heatmap_resized = cv2.resize(heatmap, (image.shape[1], image.shape[0]))
        
        # カラーマップの適用
        heatmap_colored = cv2.applyColorMap(
            (heatmap_resized * 255).astype(np.uint8), 
            cv2.COLORMAP_JET
        )
        
        # 元画像との合成
        if image.max() <= 1.0:
            image = (image * 255).astype(np.uint8)
        
        superimposed = heatmap_colored * alpha + image * (1 - alpha)
        superimposed = np.clip(superimposed, 0, 255).astype(np.uint8)
        
        return superimposed

# Grad-CAMの適用例
def analyze_model_attention(model, test_images, test_weights, n_samples=5):
    """
    モデルの注目領域分析
    """
    # 最後の畳み込み層を特定
    conv_layer_names = [layer.name for layer in model.layers if isinstance(layer, layers.Conv2D)]
    last_conv_layer = conv_layer_names[-1] if conv_layer_names else None
    
    if last_conv_layer is None:
        print("畳み込み層が見つかりません")
        return
    
    grad_cam = GradCAM(model, last_conv_layer)
    
    fig, axes = plt.subplots(n_samples, 3, figsize=(15, n_samples * 5))
    
    for i in range(n_samples):
        image = test_images[i]
        actual_weight = test_weights[i]
        predicted_weight = model.predict(np.expand_dims(image, 0), verbose=0)[0][0]
        
        # ヒートマップ生成
        heatmap = grad_cam.generate_heatmap(image)
        superimposed = grad_cam.visualize_heatmap(image, heatmap)
        
        # 可視化
        axes[i, 0].imshow(image)
        axes[i, 0].set_title(f'元画像\n実際: {actual_weight:.1f}kg')
        axes[i, 0].axis('off')
        
        axes[i, 1].imshow(heatmap, cmap='jet')
        axes[i, 1].set_title('注目領域')
        axes[i, 1].axis('off')
        
        axes[i, 2].imshow(superimposed)
        axes[i, 2].set_title(f'重畳表示\n予測: {predicted_weight:.1f}kg')
        axes[i, 2].axis('off')
    
    plt.tight_layout()
    plt.show()

# Grad-CAM分析の実行
if len(conv_layer_names) > 0:
    analyze_model_attention(transfer_model, X_test[:5], y_test[:5])
```

### アンサンブル学習とモデル統合

```python
class HorseWeightEnsemble:
    """
    複数のCNNモデルを組み合わせたアンサンブル
    """
    
    def __init__(self):
        self.models = {}
        self.weights = {}
        
    def add_model(self, name, model, weight=1.0):
        """
        モデルの追加
        """
        self.models[name] = model
        self.weights[name] = weight
        
    def predict(self, X):
        """
        アンサンブル予測
        """
        predictions = {}
        
        # 各モデルで予測
        for name, model in self.models.items():
            if name == 'multimodal':
                # マルチモーダルモデルの場合
                pred = model.predict([X, metadata_test], verbose=0)
            else:
                pred = model.predict(X, verbose=0)
            predictions[name] = pred.flatten()
        
        # 重み付き平均
        ensemble_pred = np.zeros(len(X))
        total_weight = sum(self.weights.values())
        
        for name, pred in predictions.items():
            weight = self.weights[name] / total_weight
            ensemble_pred += weight * pred
        
        return ensemble_pred, predictions
    
    def evaluate_ensemble(self, X_test, y_test):
        """
        アンサンブルの評価
        """
        ensemble_pred, individual_preds = self.predict(X_test)
        
        # アンサンブル性能
        ensemble_rmse = np.sqrt(np.mean((y_test - ensemble_pred) ** 2))
        ensemble_mae = np.mean(np.abs(y_test - ensemble_pred))
        
        # 個別モデル性能
        individual_rmse = {}
        for name, pred in individual_preds.items():
            rmse = np.sqrt(np.mean((y_test - pred) ** 2))
            individual_rmse[name] = rmse
        
        return {
            'ensemble_rmse': ensemble_rmse,
            'ensemble_mae': ensemble_mae,
            'individual_rmse': individual_rmse,
            'predictions': ensemble_pred
        }

# アンサンブルモデルの構築
ensemble = HorseWeightEnsemble()
ensemble.add_model('basic_cnn', basic_model, weight=0.2)
ensemble.add_model('transfer_learning', transfer_model, weight=0.4)
ensemble.add_model('multimodal', multimodal_model, weight=0.4)

# アンサンブルの評価
ensemble_results = ensemble.evaluate_ensemble(X_test, y_test)

print(f"\nアンサンブル結果:")
print(f"RMSE: {ensemble_results['ensemble_rmse']:.2f} kg")
print(f"MAE: {ensemble_results['ensemble_mae']:.2f} kg")

print(f"\n個別モデル性能:")
for name, rmse in ensemble_results['individual_rmse'].items():
    print(f"{name}: {rmse:.2f} kg")
```

## 実用的な応用システム

### リアルタイム体重推定システム

```python
class RealTimeHorseWeightEstimator:
    """
    リアルタイム馬体重推定システム
    """
    
    def __init__(self, model, preprocessor):
        self.model = model
        self.preprocessor = preprocessor
        self.weight_history = []
        
    def process_single_image(self, image_path):
        """
        単一画像の処理
        """
        try:
            # 画像の読み込み
            if isinstance(image_path, str):
                image = cv2.imread(image_path)
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                image = image_path
            
            # リサイズ
            image_resized = cv2.resize(image, (224, 224))
            
            # 前処理
            processed_image = self.preprocessor.preprocess_images(
                np.expand_dims(image_resized, 0)
            )
            
            # 予測
            weight_prediction = self.model.predict(processed_image, verbose=0)[0][0]
            
            # 信頼度の計算（簡略化）
            confidence = self.calculate_confidence(processed_image)
            
            result = {
                'predicted_weight': float(weight_prediction),
                'confidence': confidence,
                'timestamp': pd.Timestamp.now(),
                'image_quality': self.assess_image_quality(image)
            }
            
            self.weight_history.append(result)
            
            return result
            
        except Exception as e:
            return {
                'error': str(e),
                'predicted_weight': None,
                'confidence': 0.0
            }
    
    def calculate_confidence(self, image):
        """
        予測信頼度の計算
        """
        # 複数回予測してばらつきを確認
        predictions = []
        for _ in range(5):
            # 軽微な変更を加えて予測
            noise = np.random.normal(0, 0.01, image.shape)
            noisy_image = np.clip(image + noise, 0, 1)
            pred = self.model.predict(noisy_image, verbose=0)[0][0]
            predictions.append(pred)
        
        # 標準偏差が小さいほど信頼度が高い
        std_pred = np.std(predictions)
        confidence = max(0.0, 1.0 - std_pred / 50)  # 50kgで正規化
        
        return float(confidence)
    
    def assess_image_quality(self, image):
        """
        画像品質の評価
        """
        # グレースケール変換
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # ぼかし度合い（Laplacian分散）
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # 明度
        brightness = gray.mean()
        
        # コントラスト
        contrast = gray.std()
        
        # 品質スコア（0-1）
        quality_score = min(1.0, laplacian_var / 100) * 0.4 + \
                       min(1.0, max(0, (brightness - 50) / 100)) * 0.3 + \
                       min(1.0, contrast / 50) * 0.3
        
        return {
            'overall_quality': float(quality_score),
            'sharpness': float(laplacian_var),
            'brightness': float(brightness),
            'contrast': float(contrast)
        }
    
    def batch_process_images(self, image_paths):
        """
        複数画像の一括処理
        """
        results = []
        
        for path in image_paths:
            result = self.process_single_image(path)
            results.append(result)
        
        return pd.DataFrame(results)
    
    def get_statistics(self):
        """
        処理統計の取得
        """
        if not self.weight_history:
            return None
        
        df = pd.DataFrame(self.weight_history)
        
        return {
            'total_processed': len(df),
            'average_weight': df['predicted_weight'].mean(),
            'weight_std': df['predicted_weight'].std(),
            'average_confidence': df['confidence'].mean(),
            'processing_timeline': df.groupby(df['timestamp'].dt.floor('H')).size().to_dict()
        }

# リアルタイムシステムの使用例
estimator = RealTimeHorseWeightEstimator(transfer_model, preprocessor)

# サンプル画像での推定例（実際の画像を使用する場合）
sample_results = []
for i in range(5):
    sample_image = X_test[i]
    result = estimator.process_single_image(sample_image)
    result['actual_weight'] = y_test[i]
    sample_results.append(result)

sample_df = pd.DataFrame(sample_results)
print("リアルタイム推定結果:")
print(sample_df[['predicted_weight', 'actual_weight', 'confidence']])
```

### ウェブAPI システム

```python
from flask import Flask, request, jsonify
import base64
import io

app = Flask(__name__)

# グローバルでモデルをロード
global_estimator = None

def initialize_model():
    """
    モデルの初期化
    """
    global global_estimator
    # 実際の実装では保存済みモデルをロード
    global_estimator = RealTimeHorseWeightEstimator(transfer_model, preprocessor)

@app.route('/predict_weight', methods=['POST'])
def predict_weight():
    """
    体重予測API
    """
    try:
        data = request.json
        
        # Base64エンコードされた画像の処理
        if 'image_base64' in data:
            image_data = base64.b64decode(data['image_base64'])
            image = Image.open(io.BytesIO(image_data))
            image_array = np.array(image)
            
            # 推定実行
            result = global_estimator.process_single_image(image_array)
            
            return jsonify({
                'success': True,
                'predicted_weight': result['predicted_weight'],
                'confidence': result['confidence'],
                'image_quality': result['image_quality'],
                'timestamp': result['timestamp'].isoformat()
            })
        
        else:
            return jsonify({
                'success': False,
                'error': '画像データが必要です'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/batch_predict', methods=['POST'])
def batch_predict():
    """
    バッチ予測API
    """
    try:
        data = request.json
        images_base64 = data.get('images', [])
        
        results = []
        for img_b64 in images_base64:
            image_data = base64.b64decode(img_b64)
            image = Image.open(io.BytesIO(image_data))
            image_array = np.array(image)
            
            result = global_estimator.process_single_image(image_array)
            results.append({
                'predicted_weight': result['predicted_weight'],
                'confidence': result['confidence']
            })
        
        return jsonify({
            'success': True,
            'results': results,
            'count': len(results)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/statistics', methods=['GET'])
def get_statistics():
    """
    処理統計API
    """
    try:
        stats = global_estimator.get_statistics()
        return jsonify({
            'success': True,
            'statistics': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    initialize_model()
    app.run(debug=True, host='0.0.0.0', port=5001)
```

## 結果の可視化と分析

```python
def comprehensive_visualization(models_results, test_data):
    """
    包括的な結果可視化
    """
    fig, axes = plt.subplots(3, 3, figsize=(20, 15))
    
    # 1. モデル性能比較
    model_names = list(models_results.keys())
    rmse_scores = [results['rmse'] for results in models_results.values()]
    mae_scores = [results['mae'] for results in models_results.values()]
    
    x = np.arange(len(model_names))
    width = 0.35
    
    axes[0, 0].bar(x - width/2, rmse_scores, width, label='RMSE', alpha=0.8)
    axes[0, 0].bar(x + width/2, mae_scores, width, label='MAE', alpha=0.8)
    axes[0, 0].set_xlabel('モデル')
    axes[0, 0].set_ylabel('誤差 (kg)')
    axes[0, 0].set_title('モデル性能比較')
    axes[0, 0].set_xticks(x)
    axes[0, 0].set_xticklabels(model_names, rotation=45)
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)
    
    # 2. 予測vs実際の散布図（最良モデル）
    best_model = min(models_results.keys(), key=lambda k: models_results[k]['rmse'])
    best_predictions = models_results[best_model]['predictions']
    
    axes[0, 1].scatter(test_data['actual'], best_predictions, alpha=0.6)
    axes[0, 1].plot([test_data['actual'].min(), test_data['actual'].max()], 
                    [test_data['actual'].min(), test_data['actual'].max()], 'r--', lw=2)
    axes[0, 1].set_xlabel('実際の体重 (kg)')
    axes[0, 1].set_ylabel('予測体重 (kg)')
    axes[0, 1].set_title(f'最良モデル ({best_model}) の予測精度')
    axes[0, 1].grid(True, alpha=0.3)
    
    # 3. 残差分析
    residuals = test_data['actual'] - best_predictions
    axes[0, 2].scatter(best_predictions, residuals, alpha=0.6)
    axes[0, 2].axhline(y=0, color='r', linestyle='--')
    axes[0, 2].set_xlabel('予測体重 (kg)')
    axes[0, 2].set_ylabel('残差 (kg)')
    axes[0, 2].set_title('残差分析')
    axes[0, 2].grid(True, alpha=0.3)
    
    # 4. 体重範囲別精度
    weight_ranges = [(400, 450), (450, 500), (500, 550), (550, 600)]
    range_maes = []
    range_labels = []
    
    for min_w, max_w in weight_ranges:
        mask = (test_data['actual'] >= min_w) & (test_data['actual'] < max_w)
        if mask.sum() > 0:
            range_mae = np.mean(np.abs(test_data['actual'][mask] - best_predictions[mask]))
            range_maes.append(range_mae)
            range_labels.append(f'{min_w}-{max_w}kg')
    
    axes[1, 0].bar(range_labels, range_maes, alpha=0.8)
    axes[1, 0].set_xlabel('体重範囲')
    axes[1, 0].set_ylabel('MAE (kg)')
    axes[1, 0].set_title('体重範囲別予測精度')
    axes[1, 0].grid(True, alpha=0.3)
    
    # 5. 誤差分布
    axes[1, 1].hist(residuals, bins=30, alpha=0.7, edgecolor='black')
    axes[1, 1].axvline(x=0, color='r', linestyle='--')
    axes[1, 1].set_xlabel('予測誤差 (kg)')
    axes[1, 1].set_ylabel('頻度')
    axes[1, 1].set_title('誤差分布')
    axes[1, 1].grid(True, alpha=0.3)
    
    # 6. 信頼度vs精度（利用可能な場合）
    if 'confidence' in test_data.columns:
        axes[1, 2].scatter(test_data['confidence'], np.abs(residuals), alpha=0.6)
        axes[1, 2].set_xlabel('予測信頼度')
        axes[1, 2].set_ylabel('絶対誤差 (kg)')
        axes[1, 2].set_title('信頼度と予測精度の関係')
        axes[1, 2].grid(True, alpha=0.3)
    else:
        axes[1, 2].text(0.5, 0.5, '信頼度データなし', ha='center', va='center', 
                       transform=axes[1, 2].transAxes, fontsize=14)
        axes[1, 2].set_title('信頼度分析')
    
    # 7-9. 訓練履歴（利用可能な場合）
    if 'history' in models_results[best_model]:
        history = models_results[best_model]['history']
        
        # 損失履歴
        axes[2, 0].plot(history.history['loss'], label='訓練損失')
        axes[2, 0].plot(history.history['val_loss'], label='検証損失')
        axes[2, 0].set_xlabel('エポック')
        axes[2, 0].set_ylabel('損失')
        axes[2, 0].set_title('訓練履歴 - 損失')
        axes[2, 0].legend()
        axes[2, 0].grid(True, alpha=0.3)
        
        # MAE履歴
        axes[2, 1].plot(history.history['mae'], label='訓練MAE')
        axes[2, 1].plot(history.history['val_mae'], label='検証MAE')
        axes[2, 1].set_xlabel('エポック')
        axes[2, 1].set_ylabel('MAE (kg)')
        axes[2, 1].set_title('訓練履歴 - MAE')
        axes[2, 1].legend()
        axes[2, 1].grid(True, alpha=0.3)
    
    # 8. 予測値の分布比較
    axes[2, 2].hist(test_data['actual'], alpha=0.5, label='実際', bins=30)
    axes[2, 2].hist(best_predictions, alpha=0.5, label='予測', bins=30)
    axes[2, 2].set_xlabel('体重 (kg)')
    axes[2, 2].set_ylabel('頻度')
    axes[2, 2].set_title('体重分布比較')
    axes[2, 2].legend()
    axes[2, 2].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.show()

# 結果の統合と可視化
models_results = {
    'Basic CNN': {
        'rmse': basic_results['rmse'], 
        'mae': basic_results['mae'],
        'predictions': basic_results['predictions'],
        'history': basic_history
    },
    'Transfer Learning': {
        'rmse': finetune_results['rmse'], 
        'mae': finetune_results['mae'],
        'predictions': finetune_results['predictions'],
        'history': transfer_history
    },
    'Multimodal': {
        'rmse': multimodal_rmse, 
        'mae': multimodal_mae,
        'predictions': multimodal_predictions.flatten()
    },
    'Ensemble': {
        'rmse': ensemble_results['ensemble_rmse'], 
        'mae': ensemble_results['ensemble_mae'],
        'predictions': ensemble_results['predictions']
    }
}

test_data_df = pd.DataFrame({
    'actual': y_test,
    'confidence': np.random.uniform(0.5, 1.0, len(y_test))  # 模擬信頼度
})

comprehensive_visualization(models_results, test_data_df)

# 最終的な性能比較表
print("\n" + "="*80)
print("馬体重予測モデル 最終性能比較")
print("="*80)
print(f"{'モデル名':<20} {'RMSE (kg)':<12} {'MAE (kg)':<12} {'MAPE (%)':<12}")
print("-"*80)

for name, results in models_results.items():
    mape = np.mean(np.abs((test_data_df['actual'] - results['predictions']) / test_data_df['actual'])) * 100
    print(f"{name:<20} {results['rmse']:<12.2f} {results['mae']:<12.2f} {mape:<12.2f}")

print("="*80)
```

## まとめ

本記事では、CNNを用いた競馬画像からの馬体重自動判定システムについて詳細に解説しました。重要なポイントを以下にまとめます：

### 技術的成果

1. **画像解析技術の適用**: CNNを用いた馬体画像からの体重推定
2. **マルチモーダル学習**: 画像データと構造化データの統合
3. **転移学習の活用**: 事前訓練モデルを活用した効率的な学習
4. **アンサンブル手法**: 複数モデルの統合による精度向上

### 実装技術

- **TensorFlow/PyTorch**: 両フレームワークでの包括的実装
- **画像前処理**: データ拡張、正規化、品質評価
- **モデル解釈性**: Grad-CAMによる注目領域の可視化
- **リアルタイムシステム**: ウェブAPIとバッチ処理システム

### 実用性の向上

- **自動化**: 従来の目視判定を自動化
- **客観性**: 人間の主観に依存しない定量的評価
- **効率性**: 大量データの高速処理
- **拡張性**: 他の馬体情報への応用可能性

### 今後の発展方向

1. **3D画像解析**: 深度カメラによる立体的な体型解析
2. **動画解析**: 動的な馬の動きからの体調判定
3. **IoT統合**: センサーデータとの組み合わせ
4. **エッジコンピューティング**: 現場での即座な判定

競馬における馬体重の自動判定は、スポーツアナリティクスとコンピュータビジョンの融合による革新的な応用例です。本記事で紹介した手法により、より客観的で効率的な馬の評価システムの構築が可能になります。これらの技術は、競馬以外の畜産業や動物医療分野にも応用できる汎用性の高いソリューションとなっています。