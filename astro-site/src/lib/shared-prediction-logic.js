// 共有予想ロジック - premium-predictions.astroの更新がstandard/freeに自動反映される

// 印に基づく統一信頼度計算関数（多重印対応・累積加算式）
export function calculateMarkBasedConfidence(horse) {
    const baseConfidence = 70;
    
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
        case '◎': return baseConfidence + 7; // 77
        case '○': return baseConfidence + 6; // 76
        case '▲': return baseConfidence + 5; // 75
        case '△': return baseConfidence + 4; // 74
        default: return baseConfidence; // 70
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
    if (mainHorses.length === 0) return 70;
    
    const totalConfidence = mainHorses.reduce((sum, horse) => 
        sum + getHorseConfidenceFromMark(horse), 0);
    return Math.round(totalConfidence / mainHorses.length);
}

// シンプルなテキスト表示（変換なし）
export function convertToStarRating(text, horseType, score) {
    return text; // JSONのデータをそのまま表示
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