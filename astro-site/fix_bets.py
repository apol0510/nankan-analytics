#!/usr/bin/env python3
# 古い買い目データを削除するスクリプト

import json

# JSONファイルを読み込み
with open('src/data/allRacesPrediction.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def clean_bets(strategy_data):
    """古い買い目データを削除し、馬単のみを残す"""
    if 'bets' in strategy_data:
        # 馬単のみを残す
        new_bets = []
        for bet in strategy_data['bets']:
            if bet.get('type') == '馬単':
                new_bets.append(bet)

        # 古い買い目を削除（馬単以外）
        strategy_data['bets'] = new_bets

    return strategy_data

# 全レースの戦略データをクリーンアップ
for race in data['races']:
    if 'strategies' in race:
        if 'safe' in race['strategies']:
            race['strategies']['safe'] = clean_bets(race['strategies']['safe'])
        if 'balance' in race['strategies']:
            race['strategies']['balance'] = clean_bets(race['strategies']['balance'])
        if 'aggressive' in race['strategies']:
            race['strategies']['aggressive'] = clean_bets(race['strategies']['aggressive'])

# 修正されたJSONを保存
with open('src/data/allRacesPrediction.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✅ 古い買い目データ（馬連、3連複、ワイド）を削除しました")
print("✅ 馬単データは保持されています")
print("✅ 動的生成システムで正しい買い目が表示されます")