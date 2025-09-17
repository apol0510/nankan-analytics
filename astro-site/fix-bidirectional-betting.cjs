#!/usr/bin/env node
/**
 * 双方向賭け（⇔）のポイント計算修正スクリプト
 * 双方向は両方向の点数なので、単方向の点数の2倍になる
 */

const fs = require('fs');
const path = require('path');

// allRacesPrediction.jsonファイルのパス
const jsonFilePath = path.join(__dirname, 'src/data/allRacesPrediction.json');

console.log('🔧 双方向賭けポイント計算修正スクリプト開始');

try {
    // JSONファイルを読み込み
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
    const raceData = JSON.parse(jsonContent);

    let corrections = [];
    let totalCorrections = 0;

    // 修正パターンを定義
    const bidirectionalPatterns = [
        // パターン: "軸馬 ⇔ 相手馬群　現在の点数" -> 正しい点数を計算
        { from: "13 ⇔ 1,2,8,9　8点", to: "13 ⇔ 1,2,8,9　8点", correct: true }, // 4馬 × 2方向 = 8点 ✅
        { from: "12 ⇔ 1,2,3,5,6,7,8,9,11　18点", to: "12 ⇔ 1,2,3,5,6,7,8,9,11　18点", correct: true }, // 9馬 × 2方向 = 18点 ✅
        { from: "8 ⇔ 2,6,9　6点", to: "8 ⇔ 2,6,9　6点", correct: true }, // 3馬 × 2方向 = 6点 ✅
        { from: "4 ⇔ 2,5,6,9　8点", to: "4 ⇔ 2,5,6,9　8点", correct: true }, // 4馬 × 2方向 = 8点 ✅
        { from: "4 ⇔ 2,5　4点", to: "4 ⇔ 2,5　4点", correct: true }, // 2馬 × 2方向 = 4点 ✅
        { from: "1 ⇔ 2,5,6　6点", to: "1 ⇔ 2,5,6　6点", correct: true }, // 3馬 × 2方向 = 6点 ✅
        { from: "4 ⇔ 1,8,9　6点", to: "4 ⇔ 1,8,9　6点", correct: true }, // 3馬 × 2方向 = 6点 ✅
        { from: "5 ⇔ 1,8,9,10　8点", to: "5 ⇔ 1,8,9,10　8点", correct: true }, // 4馬 × 2方向 = 8点 ✅
        { from: "11 ⇔ 6,14　4点", to: "11 ⇔ 6,14　4点", correct: true }, // 2馬 × 2方向 = 4点 ✅
        { from: "2 ⇔ 1,3,6,7,9,13,14　7点", to: "2 ⇔ 1,3,6,7,9,13,14　14点", correct: false }, // 7馬 × 2方向 = 14点 ❌→✅
        { from: "7 ⇔ 6,8　4点", to: "7 ⇔ 6,8　4点", correct: true }, // 2馬 × 2方向 = 4点 ✅
        { from: "1 ⇔ 2,5,6,8,10　5点", to: "1 ⇔ 2,5,6,8,10　10点", correct: false }, // 5馬 × 2方向 = 10点 ❌→✅
        { from: "5 ⇔ 2,4　2点", to: "5 ⇔ 2,4　4点", correct: false }, // 2馬 × 2方向 = 4点 ❌→✅
        { from: "4 ⇔ 1,3,5,8　8点", to: "4 ⇔ 1,3,5,8　8点", correct: true }, // 4馬 × 2方向 = 8点 ✅
        { from: "9 ⇔ 1,3,5,7,8,10,11　7点", to: "9 ⇔ 1,3,5,7,8,10,11　14点", correct: false }, // 7馬 × 2方向 = 14点 ❌→✅
        { from: "4 ⇔ 5,8,10,13　8点", to: "4 ⇔ 5,8,10,13　8点", correct: true }, // 4馬 × 2方向 = 8点 ✅
        { from: "11 ⇔ 1,3,5,8,9,10,12,13　8点", to: "11 ⇔ 1,3,5,8,9,10,12,13　16点", correct: false }, // 8馬 × 2方向 = 16点 ❌→✅
        { from: "9 ⇔ 1,7,12,3　8点", to: "9 ⇔ 1,7,12,3　8点", correct: true }, // 4馬 × 2方向 = 8点 ✅
        { from: "6 ⇔ 1,2,3,4,5,7,8,10,12　9点", to: "6 ⇔ 1,2,3,4,5,7,8,10,12　18点", correct: false }, // 9馬 × 2方向 = 18点 ❌→✅
        { from: "12 ⇔ 6,9,13,14　8点", to: "12 ⇔ 6,9,13,14　8点", correct: true }, // 4馬 × 2方向 = 8点 ✅
        { from: "10 ⇔ 2,4,6,7,9,13,14　7点", to: "10 ⇔ 2,4,6,7,9,13,14　14点", correct: false }, // 7馬 × 2方向 = 14点 ❌→✅
    ];

    // JSONコンテンツを文字列として修正
    let modifiedContent = jsonContent;

    bidirectionalPatterns.forEach(pattern => {
        if (!pattern.correct) {
            const matches = (modifiedContent.match(new RegExp(pattern.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
            if (matches > 0) {
                console.log(`🔧 修正: "${pattern.from}" → "${pattern.to}" (${matches}箇所)`);
                modifiedContent = modifiedContent.replace(new RegExp(pattern.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), pattern.to);
                corrections.push({
                    from: pattern.from,
                    to: pattern.to,
                    count: matches
                });
                totalCorrections += matches;
            }
        }
    });

    // 修正されたコンテンツを書き込み
    if (totalCorrections > 0) {
        fs.writeFileSync(jsonFilePath, modifiedContent);
        console.log(`✅ 合計 ${totalCorrections} 箇所の双方向賭けポイントを修正完了`);

        console.log('\n📋 修正詳細:');
        corrections.forEach(correction => {
            console.log(`  • ${correction.from} → ${correction.to} (${correction.count}箇所)`);
        });
    } else {
        console.log('✅ 修正が必要な箇所は見つかりませんでした');
    }

} catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
}

console.log('🎉 双方向賭けポイント計算修正スクリプト完了');