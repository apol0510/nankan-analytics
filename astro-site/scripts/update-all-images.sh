#!/bin/bash

# 🎯 画像自動更新スクリプト（完全版）
# premium-plus: 最新5枚 / withdrawal-upsell: 最新1枚
# 使い方: bash scripts/update-all-images.sh

set -e

echo "🖼️  画像自動更新システム起動"
echo "================================"
echo ""

# ディレクトリ設定
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
IMAGE_DIR="$PROJECT_ROOT/public/upsell-images"
PREMIUM_PLUS="$PROJECT_ROOT/src/pages/premium-plus.astro"
WITHDRAWAL_UPSELL="$PROJECT_ROOT/src/pages/withdrawal-upsell.astro"

# 最新画像を取得
cd "$IMAGE_DIR"
ALL_IMAGES=($(ls -1 upsell-*.png 2>/dev/null | grep -v "^Mobile" | sort -r))
cd - > /dev/null

if [ ${#ALL_IMAGES[@]} -lt 5 ]; then
  echo "❌ エラー: 画像が5枚未満です（${#ALL_IMAGES[@]}枚）"
  exit 1
fi

# 最新5枚と最新1枚
LATEST_5=("${ALL_IMAGES[@]:0:5}")
LATEST_1="${ALL_IMAGES[0]}"

echo "✅ 最新画像を検出:"
echo "   最新1枚（withdrawal-upsell用）: $LATEST_1"
echo ""
echo "   最新5枚（premium-plus用）:"
for i in "${!LATEST_5[@]}"; do
  echo "     $((i+1)). ${LATEST_5[$i]}"
done
echo ""

# ========================================
# 1. withdrawal-upsell.astro 更新（最新1枚）
# ========================================
echo "📝 withdrawal-upsell.astro を更新中..."

# 現在の日付を抽出
CURRENT_WITHDRAWAL=$(grep 'upsell-[0-9]\{8\}\.png' "$WITHDRAWAL_UPSELL" | sed -E 's/.*upsell-([0-9]{8})\.png.*/\1/' | head -1)
NEW_WITHDRAWAL=$(echo "$LATEST_1" | sed -E 's/upsell-([0-9]{8})\.png/\1/')

if [ "$CURRENT_WITHDRAWAL" != "$NEW_WITHDRAWAL" ]; then
  echo "  📅 更新: $CURRENT_WITHDRAWAL → $NEW_WITHDRAWAL"
  sed -i '' "s/upsell-$CURRENT_WITHDRAWAL\.png/upsell-$NEW_WITHDRAWAL.png/g" "$WITHDRAWAL_UPSELL"
else
  echo "  ✓ $NEW_WITHDRAWAL (変更なし)"
fi

echo ""

# ========================================
# 2. premium-plus.astro 更新（最新5枚）
# ========================================
echo "📝 premium-plus.astro を更新中..."

# 現在の5枚の日付を抽出
CURRENT_PREMIUM=($(grep 'upsell-[0-9]\{8\}\.png' "$PREMIUM_PLUS" | sed -E 's/.*upsell-([0-9]{8})\.png.*/\1/' | head -5))

echo ""
echo "🔄 更新内容（premium-plus）:"
for i in {0..4}; do
  OLD_DATE="${CURRENT_PREMIUM[$i]}"
  NEW_IMAGE="${LATEST_5[$i]}"
  NEW_DATE=$(echo "$NEW_IMAGE" | sed -E 's/upsell-([0-9]{8})\.png/\1/')

  if [ "$OLD_DATE" != "$NEW_DATE" ]; then
    echo "  📅 画像$((i+1)): $OLD_DATE → $NEW_DATE"
    # 最初に見つかった箇所のみ置換（順番を保持）
    awk -v old="upsell-$OLD_DATE.png" -v new="upsell-$NEW_DATE.png" '
      !done && /upsell-[0-9]{8}\.png/ && $0 ~ old {
        sub(old, new);
        done=1;
      }
      {print}
    ' "$PREMIUM_PLUS" > "$PREMIUM_PLUS.tmp" && mv "$PREMIUM_PLUS.tmp" "$PREMIUM_PLUS"
  else
    echo "  ✓ 画像$((i+1)): $NEW_DATE (変更なし)"
  fi
done

echo ""
echo "✅ 全ての更新完了！"
echo ""
echo "📋 次のステップ:"
echo "  1. git add src/pages/premium-plus.astro src/pages/withdrawal-upsell.astro"
echo "  2. git commit -m '📸 画像更新・$(date +%Y%m%d)反映（premium-plus5枚・withdrawal-upsell1枚）'"
echo "  3. git push origin main"
echo ""
echo "🎉 デプロイ後、約1-2分で本番反映されます！"
