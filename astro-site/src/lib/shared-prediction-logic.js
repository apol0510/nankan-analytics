// 共有予想ロジック - premium-predictions.astroの更新がstandard/freeに自動反映される

// 印に基づく統一信頼度計算関数（多重印対応・累積加算式）
export function calculateMarkBasedConfidence(horse) {
    const baseConfidence = 62;
    
    // multiMarkがある場合はそれを優先使用
    const targetMark = horse.multiMark || horse.mark;
    
    // 多重印対応: スペース区切りの複数印を累積加算
    if (typeof targetMark === 'string' && targetMark.includes(' ')) {
        // スペースで分割して複数印を処理
        const marks = targetMark.split(' ').filter(m => m.trim());
        const totalValue = marks.reduce((sum, m) => {
            switch (m.trim()) {
                case '◎': return sum + 7;
                case '○': return sum + 6;
                case '▲': return sum + 5;
                case '△': return sum + 4;
                default: return sum;
            }
        }, 0);
        
        return baseConfidence + totalValue;
    }
    
    // 単一印の場合
    switch (targetMark) {
        case '◎': return baseConfidence + 7; // 69
        case '○': return baseConfidence + 6; // 68
        case '▲': return baseConfidence + 5; // 67
        case '△': return baseConfidence + 4; // 66
        default: return baseConfidence; // 62
    }
}

// 馬の印に基づく信頼度を計算する関数（多重印対応）
export function getHorseConfidenceFromMark(horse) {
    return calculateMarkBasedConfidence(horse);
}

// レース全体の信頼度を主力馬の平均で計算する関数
export function getRaceConfidence(horses) {
    const mainHorses = horses.filter(horse => 
        horse.type === '本命' || horse.type === '対抗' || horse.type === '単穴'
    );
    if (mainHorses.length === 0) return 62;
    
    const totalConfidence = mainHorses.reduce((sum, horse) => 
        sum + getHorseConfidenceFromMark(horse), 0);
    return Math.round(totalConfidence / mainHorses.length);
}

// 星評価システム（89以上=4つ星、88以下=3つ星）
export function convertToStarRating(text, horseType, score) {
    // スコアが数値でない場合はテキストをそのまま返す
    if (typeof score !== 'number' && typeof score !== 'string') {
        return text;
    }
    
    const numScore = typeof score === 'string' ? parseInt(score) : score;
    
    // スコアが有効な数値でない場合はデフォルトテキスト
    if (isNaN(numScore)) {
        return text;
    }
    
    // 89以上は4つ星、88以下は3つ星
    const stars = numScore >= 89 ? '★★★★' : '★★★';
    
    return `総合評価:${stars}`;
}

// 動的リスク計算システム（累積スコアベース）
export function calculateDynamicRisk(strategyType, mainHorseScore, subHorseScore = null) {
    let baseRisk;
    let targetScore;
    
    // 戦略別ベースリスク設定
    switch (strategyType) {
        case 'A': // 少点数的中型
            baseRisk = 45; // ベースリスク45%
            targetScore = mainHorseScore; // 本命のみで判定
            break;
        case 'B': // バランス型
            baseRisk = 35; // ベースリスク35%
            targetScore = subHorseScore ? (mainHorseScore + subHorseScore) / 2 : mainHorseScore;
            break;
        case 'C': // 高配当追求型
            baseRisk = 65; // ベースリスク65%
            targetScore = subHorseScore ? (mainHorseScore + subHorseScore) / 2 : mainHorseScore;
            break;
        default:
            baseRisk = 50;
            targetScore = mainHorseScore;
    }
    
    // スコアに応じてリスク調整
    if (targetScore >= 89) {
        // 4つ星：リスク下げる
        return Math.max(baseRisk - 15, 20); // 最低20%
    } else {
        // 3つ星：リスク上げる  
        return Math.min(baseRisk + 15, 80); // 最高80%
    }
}

// リスクレベル文字列変換
export function getRiskLevelText(riskPercentage) {
    if (riskPercentage <= 30) return "低";
    if (riskPercentage <= 50) return "中";
    if (riskPercentage <= 70) return "やや高";
    return "高";
}

// 推奨度計算（リスクの逆数ベース）
export function getRecommendationStars(riskPercentage) {
    if (riskPercentage <= 25) return "★★★★★";
    if (riskPercentage <= 35) return "★★★★☆";
    if (riskPercentage <= 50) return "★★★☆☆";
    if (riskPercentage <= 65) return "★★☆☆☆";
    return "★☆☆☆☆";
}

// 標準化買い目生成システム（ユーザー希望に完全対応）
export function generateStandardizedBets(horses, strategyType) {
    const { main, sub, sub1, sub2, allHorses } = horses;

    if (!allHorses || !Array.isArray(allHorses)) {
        console.error('allHorses data not found or invalid');
        return [`データエラー: 馬の情報が不足しています`];
    }

    // 実際の馬番号を取得（希望に合わせて）
    const mainNumber = main?.number || 9;  // 本命9番
    const subNumber = sub?.number || 11;   // 対抗11番

    // 役割別に馬を分類し、番号順にソート
    const renkuHorses = allHorses.filter(h => h.type === '連下').sort((a, b) => a.number - b.number);
    const osaeHorses = allHorses.filter(h => h.type === '押さえ').sort((a, b) => a.number - b.number);
    const tananaHorses = allHorses.filter(h => h.type === '単穴').sort((a, b) => a.number - b.number);

    let bets = [];

    switch (strategyType) {
        case 'A': // 少点数的中型 - 希望: 9→1,6,11 (3点)
            // 単穴1,単穴2,対抗の順で構成
            const targetsA = [];
            if (tananaHorses[0]) targetsA.push(tananaHorses[0].number); // 単穴1番目
            if (tananaHorses[1]) targetsA.push(tananaHorses[1].number); // 単穴2番目
            targetsA.push(subNumber); // 対抗

            bets = [`${mainNumber} → ${targetsA.join(',')}`];
            break;

        case 'B': // バランス型 - 希望: 9⇔2,3,5,12 (8点) + 11→1,6,9 (3点)
            // 本命⇔連下4頭（8点）
            const renkuNumbers = renkuHorses.slice(0, 4).map(h => h.number);
            if (renkuNumbers.length >= 4) {
                bets.push(`${mainNumber} ⇔ ${renkuNumbers.join(',')}`);
            }

            // 対抗→{単穴1, 単穴2, 本命}（3点）
            const targetsB = [];
            if (tananaHorses[0]) targetsB.push(tananaHorses[0].number); // 単穴1番目
            if (tananaHorses[1]) targetsB.push(tananaHorses[1].number); // 単穴2番目
            targetsB.push(mainNumber); // 本命

            bets.push(`${subNumber} → ${targetsB.join(',')}`);
            break;

        case 'C': // 高配当追求型 - 希望: 9→7,8 (2点) + 11⇔2,3,5,7,8,12 (10点)
            // 本命→押さえ2頭（2点）
            const osaeNumbers = osaeHorses.slice(0, 2).map(h => h.number);
            if (osaeNumbers.length >= 2) {
                bets.push(`${mainNumber} → ${osaeNumbers.join(',')}`);
            }

            // 対抗⇔{連下4頭, 押さえ2頭}（10点）
            const renkuForC = renkuHorses.slice(0, 4).map(h => h.number);
            const allTargetsC = [...renkuForC, ...osaeNumbers];
            if (allTargetsC.length >= 6) {
                bets.push(`${subNumber} ⇔ ${allTargetsC.join(',')}`);
            }
            break;
    }

    if (bets.length === 0) {
        // フォールバック: 最低限の買い目を生成
        return [`${mainNumber} → ${subNumber}`];
    }

    return bets;
}

// 買い目の点数を計算する関数
export function calculateBetPoints(betString) {
    if (!betString) return 1;

    // ⇔記法の場合は双方向なので2倍
    if (betString.includes('⇔')) {
        const targets = betString.split('⇔')[1].split(',').length;
        return targets * 2; // 双方向なので2倍
    }

    // →記法の場合は単方向
    if (betString.includes('→')) {
        const targets = betString.split('→')[1].split(',').length;
        return targets;
    }

    return 1;
}

// 的中率・期待回収率計算（動的リスクベース）
export function calculateHitRateAndReturn(strategyType, riskPercentage) {
    let baseHitRate, baseReturn;
    
    switch (strategyType) {
        case 'A':
            baseHitRate = 75;
            baseReturn = 140;
            break;
        case 'B':
            baseHitRate = 65;
            baseReturn = 180;
            break;
        case 'C':
            baseHitRate = 35;
            baseReturn = 270;
            break;
        default:
            baseHitRate = 60;
            baseReturn = 150;
    }
    
    // リスクに応じて調整
    const riskFactor = (100 - riskPercentage) / 100;
    const hitRate = Math.round(baseHitRate * riskFactor * 100) / 100;
    const returnRate = Math.round(baseReturn * (2 - riskFactor) * 100) / 100;
    
    return { hitRate, returnRate };
}

// 共通のデータ処理ロジック
export function processRaceData(allRacesData) {
    // メインレース（11R）のデータを取得
    const mainRace = allRacesData.races.find(race => race.isMainRace === true);
    const race12R = allRacesData.races.find(r => r.raceNumber === '12R');
    
    // 全レースデータを表示順でソート
    const sortedRaces = allRacesData.races.sort((a, b) => a.displayOrder - b.displayOrder);
    
    return {
        mainRace,
        race12R,
        sortedRaces
    };
}