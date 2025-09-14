// 共有予想ロジック - 古いデータ参照問題対応＆統一システム
import { dataManager } from './integrated-data-manager.js';

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

// 馬の実際の累積スコアを取得する関数（multiMark最優先）
export function getHorseConfidenceFromMark(horse) {
    if (!horse) return 62;

    // multiMarkがある場合は最優先でそれを使って計算（最新のベース62pt基準）
    if (horse.multiMark) {
        return calculateMarkBasedConfidence(horse);
    }

    // 単一印の場合は通常の計算
    if (horse.mark) {
        return calculateMarkBasedConfidence(horse);
    }

    // factors内の既存スコアがある場合はそれを使用（fallback）
    if (horse.factors && Array.isArray(horse.factors)) {
        const scoreText = horse.factors.find(factor =>
            factor.text && factor.text.includes('累積スコア')
        );
        if (scoreText) {
            const match = scoreText.text.match(/(\d+)pt/);
            if (match) {
                return parseInt(match[1]);
            }
        }
    }

    return 62; // デフォルト
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

// 的中率・期待回収率計算（現実的な競馬予想数値）
export function calculateHitRateAndReturn(strategyType, riskPercentage) {
    let hitRate, returnRate;

    // 現実的な競馬予想の範囲内で数値を設定
    switch (strategyType) {
        case 'A': // 少点数的中型
            hitRate = Math.max(45, Math.min(65, 58 + (riskPercentage <= 30 ? 7 : riskPercentage <= 50 ? 0 : -8)));
            returnRate = Math.max(110, Math.min(150, 128 + (riskPercentage <= 30 ? 15 : riskPercentage <= 50 ? 0 : -10)));
            break;
        case 'B': // バランス型
            hitRate = Math.max(35, Math.min(55, 42 + (riskPercentage <= 30 ? 8 : riskPercentage <= 50 ? 2 : -5)));
            returnRate = Math.max(130, Math.min(185, 155 + (riskPercentage <= 30 ? 20 : riskPercentage <= 50 ? 5 : -10)));
            break;
        case 'C': // 高配当追求型
            hitRate = Math.max(20, Math.min(35, 28 + (riskPercentage <= 30 ? 6 : riskPercentage <= 50 ? 2 : -3)));
            returnRate = Math.max(200, Math.min(320, 250 + (riskPercentage <= 30 ? 40 : riskPercentage <= 50 ? 15 : -20)));
            break;
        default:
            hitRate = 42;
            returnRate = 155;
    }

    return {
        hitRate: Math.round(hitRate * 10) / 10,  // 小数点第1位まで
        returnRate: Math.round(returnRate)       // 整数
    };
}

// 共通のデータ処理ロジック
// 統合データ管理システムによる検証済みデータ取得
export async function getValidatedRaceData() {
    try {
        // 統合データマネージャーから最新データを取得
        const validatedData = await dataManager.getPredictionData();

        // データ健全性を確認
        const healthReport = dataManager.validateDataHealth(validatedData);
        console.log(`🔍 Data Health: ${healthReport.percentage}% (${healthReport.score}/${healthReport.maxScore})`);

        // 健全性が低い場合は強制更新を試行
        if (healthReport.percentage < 80) {
            console.warn('⚠️ Data health below threshold, attempting refresh...');
            const refreshedData = await dataManager.forceDataUpdate();
            console.log(`🔄 Refreshed data version: ${refreshedData.raceDate}`);
            return refreshedData;
        }

        console.log(`✅ Using validated data version: ${validatedData.raceDate}`);
        return validatedData;
    } catch (error) {
        console.error('❌ Error getting validated data:', error);
        // フォールバックとして基本データを返す
        return dataManager.versionManager.generateFallbackData();
    }
}

// 共有のデータ処理ロジック（バージョンチェック付き）
export function processRaceData(allRacesData) {
    // データの健全性チェック
    if (!allRacesData || !allRacesData.races) {
        console.error('❌ Invalid race data structure');
        return { mainRace: null, race12R: null, sortedRaces: [] };
    }

    // データの日付チェック
    if (allRacesData.raceDate) {
        const dataDate = new Date(allRacesData.raceDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dataDate < today) {
            console.warn(`⚠️ Data is outdated: ${allRacesData.raceDate}`);
        }
    }

    // メインレース（11R）のデータを取得
    const mainRace = allRacesData.races.find(race => race.isMainRace === true);
    const race12R = allRacesData.races.find(r => r.raceNumber === '12R');

    // 全レースデータを表示順でソート
    const sortedRaces = allRacesData.races.sort((a, b) => a.displayOrder - b.displayOrder);

    return {
        mainRace,
        race12R,
        sortedRaces,
        dataVersion: allRacesData.raceDate,
        lastUpdated: allRacesData.lastUpdated || new Date().toISOString()
    };
}

// 統一レース処理関数：全予想ページで同じ処理を保証
export function processUnifiedRaceData(raceData) {
    if (!raceData || !raceData.horses) {
        return null;
    }

    const { horses, allHorses } = raceData;

    // 累積スコア取得（multiMark最優先）
    const mainScore = getHorseConfidenceFromMark(horses.main);
    const subScore = getHorseConfidenceFromMark(horses.sub);

    // 星評価システム適用
    const mainStars = convertToStarRating("総合評価", "本命", mainScore);
    const subStars = convertToStarRating("総合評価", "対抗", subScore);

    // 特徴量重要度（バリエーション付き）
    const mainImportance = [
        {label: "安定性", value: Math.round((mainScore + 3 + Math.random() * 4 - 2)) / 100},
        {label: "能力上位性", value: Math.round((mainScore + 3 + Math.random() * 4 - 2)) / 100},
        {label: "展開利", value: Math.round((mainScore - 6 + Math.random() * 4 - 2)) / 100}
    ];

    const subImportance = [
        {label: "安定性", value: Math.round((subScore + 3 + Math.random() * 4 - 2)) / 100},
        {label: "能力上位性", value: Math.round((subScore + 3 + Math.random() * 4 - 2)) / 100},
        {label: "展開利", value: Math.round((subScore - 6 + Math.random() * 4 - 2)) / 100}
    ];

    // 動的リスクシステム適用（allHorsesを含めてgenerateStandardizedBetsに渡す）
    const strategyA = {
        riskPercent: calculateDynamicRisk('A', mainScore),
        riskText: getRiskLevelText(calculateDynamicRisk('A', mainScore)),
        hitRate: calculateHitRateAndReturn('A', calculateDynamicRisk('A', mainScore)).hitRate,
        returnRate: calculateHitRateAndReturn('A', calculateDynamicRisk('A', mainScore)).returnRate,
        bets: generateStandardizedBets({ ...horses, allHorses }, 'A')
    };

    const strategyB = {
        riskPercent: calculateDynamicRisk('B', mainScore, subScore),
        riskText: getRiskLevelText(calculateDynamicRisk('B', mainScore, subScore)),
        hitRate: calculateHitRateAndReturn('B', calculateDynamicRisk('B', mainScore, subScore)).hitRate,
        returnRate: calculateHitRateAndReturn('B', calculateDynamicRisk('B', mainScore, subScore)).returnRate,
        bets: generateStandardizedBets({ ...horses, allHorses }, 'B')
    };

    const strategyC = {
        riskPercent: calculateDynamicRisk('C', mainScore, subScore),
        riskText: getRiskLevelText(calculateDynamicRisk('C', mainScore, subScore)),
        hitRate: calculateHitRateAndReturn('C', calculateDynamicRisk('C', mainScore, subScore)).hitRate,
        returnRate: calculateHitRateAndReturn('C', calculateDynamicRisk('C', mainScore, subScore)).returnRate,
        bets: generateStandardizedBets({ ...horses, allHorses }, 'C')
    };

    // 統一データ形式で返す（既存データを優先し、不足分のみ補完）
    return {
        ...raceData,
        horses: {
            main: {
                ...horses.main,
                score: mainScore,
                factors: [
                    {icon: "★", text: mainStars},
                    {icon: "★", text: `累積スコア: ${mainScore}pt`}
                ],
                importance: horses.main.importance || mainImportance
            },
            sub: {
                ...horses.sub,
                score: subScore,
                factors: [
                    {icon: "★", text: subStars},
                    {icon: "★", text: `累積スコア: ${subScore}pt`}
                ],
                importance: horses.sub.importance || subImportance
            },
            sub1: horses.sub1,
            sub2: horses.sub2
        },
        strategies: {
            safe: {
                title: '戦略A: 高的中率型',
                recommendation: getRecommendationStars(strategyA.riskPercent),
                hitRate: strategyA.hitRate,
                returnRate: strategyA.returnRate,
                riskLevel: strategyA.riskText,
                bets: strategyA.bets.map(bet => ({ type: '馬単', numbers: bet, odds: '3-6倍' })),
                expectedPayout: '3-6倍',
                payoutType: '堅実決着想定'
            },
            balance: {
                title: '戦略B: バランス型',
                recommendation: getRecommendationStars(strategyB.riskPercent),
                hitRate: strategyB.hitRate,
                returnRate: strategyB.returnRate,
                riskLevel: strategyB.riskText,
                bets: strategyB.bets.map(bet => ({ type: '馬単', numbers: bet, odds: '6-12倍' })),
                expectedPayout: '6-12倍',
                payoutType: '中穴配当想定'
            },
            aggressive: {
                title: '戦略C: 高配当追求型',
                recommendation: getRecommendationStars(strategyC.riskPercent),
                hitRate: strategyC.hitRate,
                returnRate: strategyC.returnRate,
                riskLevel: strategyC.riskText,
                bets: strategyC.bets.map(bet => ({ type: '馬単', numbers: bet, odds: '12倍以上' })),
                expectedPayout: '12倍以上',
                payoutType: '大穴視野'
            }
        }
    };
}

// ===============================
// 20年運営対応: データ正規化システム
// ===============================

// 役割表示設定（デザイン100%保持）
const ROLE_DISPLAY_CONFIG = {
    "本命": {
        markClass: "horse-mark-main",
        typeClass: "horse-type",
        style: "margin-left: 10px; color: #10b981; font-weight: 600;",
        priority: 1,
        defaultMark: "◎"
    },
    "対抗": {
        markClass: "horse-mark-sub",
        typeClass: "horse-type",
        style: "margin-left: 10px; color: #3b82f6; font-weight: 600;",
        priority: 2,
        defaultMark: "○"
    },
    "単穴": {
        markClass: "horse-mark-sub",
        typeClass: "horse-type",
        style: "margin-left: 10px; color: #8b5cf6; font-weight: 600;",
        priority: 3,
        defaultMark: "▲"
    },
    "連下": {
        markClass: "horse-mark-other",
        typeClass: "horse-type",
        style: "margin-left: 10px; color: #f59e0b; font-weight: 600;",
        priority: 4,
        defaultMark: "△"
    },
    "押さえ": {
        markClass: "horse-mark-other",
        typeClass: "horse-type",
        style: "margin-left: 10px; color: #6b7280; font-weight: 600;",
        priority: 5,
        defaultMark: "×"
    }
};

// データ正規化関数（Single Source of Truth実現）
export function normalizeHorseData(raceData) {
    const { horses, allHorses } = raceData;
    const normalizedHorses = [];

    // Phase 1: main/subを最優先で追加（役割確定）
    if (horses.main) {
        const mainHorse = {
            ...horses.main,
            role: "本命",
            displayMark: horses.main.mark || ROLE_DISPLAY_CONFIG["本命"].defaultMark,
            priority: ROLE_DISPLAY_CONFIG["本命"].priority
        };
        normalizedHorses.push(mainHorse);
    }

    if (horses.sub) {
        const subHorse = {
            ...horses.sub,
            role: "対抗",
            displayMark: horses.sub.mark || ROLE_DISPLAY_CONFIG["対抗"].defaultMark,
            priority: ROLE_DISPLAY_CONFIG["対抗"].priority
        };
        normalizedHorses.push(subHorse);
    }

    // Phase 2: 他の馬を追加（main/subと重複回避）
    if (allHorses && Array.isArray(allHorses)) {
        allHorses.forEach(horse => {
            // main/subと重複しないものを追加
            if (horse.number !== horses.main?.number &&
                horse.number !== horses.sub?.number) {

                const role = horse.type || "連下"; // 既存typeをroleとして使用
                const config = ROLE_DISPLAY_CONFIG[role] || ROLE_DISPLAY_CONFIG["連下"];

                const normalizedHorse = {
                    ...horse,
                    role: role,
                    displayMark: horse.mark || config.defaultMark,
                    priority: config.priority
                };
                normalizedHorses.push(normalizedHorse);
            }
        });
    }

    // 優先度順でソート（本命→対抗→単穴→連下→押さえ）
    normalizedHorses.sort((a, b) => a.priority - b.priority);

    return normalizedHorses;
}

// 役割表示設定取得
export function getRoleDisplayConfig(role) {
    return ROLE_DISPLAY_CONFIG[role] || ROLE_DISPLAY_CONFIG["連下"];
}

// データ整合性チェック
export function validateDataIntegrity(raceData) {
    const errors = [];

    // 基本構造チェック
    if (!raceData.horses) errors.push("horses object missing");
    if (!raceData.horses.main) errors.push("main horse missing");
    if (!raceData.horses.sub) errors.push("sub horse missing");
    if (!raceData.allHorses || !Array.isArray(raceData.allHorses)) {
        errors.push("allHorses array missing or invalid");
    }

    // 重複チェック
    if (raceData.allHorses) {
        const numbers = raceData.allHorses.map(h => h.number);
        const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);
        if (duplicates.length > 0) errors.push(`duplicate numbers: ${duplicates.join(',')}`);
    }

    // main/sub整合性チェック
    if (raceData.horses.main && raceData.allHorses) {
        const mainInAll = raceData.allHorses.find(h => h.number === raceData.horses.main.number);
        if (!mainInAll) errors.push("main horse not found in allHorses");
    }

    return errors;
}