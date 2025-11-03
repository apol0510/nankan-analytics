/**
 * アーカイブデータユーティリティ
 * archiveResults.jsonから最新の的中結果データを取得
 */

import archiveResults from '../data/archiveResults.json';
import archiveSanrenpukuResults from '../data/archiveSanrenpukuResults.json';

/**
 * archiveResults.jsonから最新日のデータを取得
 * @returns {Object|null} 最新日のデータ（year, month, day, venue, races等を含む）
 */
export function getLatestDayData() {
    const years = Object.keys(archiveResults).sort().reverse();
    if (years.length === 0) return null;

    const latestYear = years[0];
    const months = Object.keys(archiveResults[latestYear]).sort().reverse();
    if (months.length === 0) return null;

    const latestMonth = months[0];
    const days = Object.keys(archiveResults[latestYear][latestMonth]).sort().reverse();
    if (days.length === 0) return null;

    const latestDay = days[0];
    const dayData = archiveResults[latestYear][latestMonth][latestDay];

    return {
        year: latestYear,
        month: latestMonth,
        day: latestDay,
        ...dayData
    };
}

/**
 * 最新日データをstandard-predictions用のyesterdayResults形式に変換
 * @returns {Object|null} yesterdayResults形式のオブジェクト
 */
export function convertToYesterdayResults() {
    const latestData = getLatestDayData();
    if (!latestData) return null;

    // 回収率計算
    const totalBetPoints = latestData.races.reduce((sum, race) => sum + (race.betPoints || 0), 0);
    const totalInvestment = totalBetPoints * 100; // 1点=100円
    const recoveryRate = totalInvestment > 0 ? Math.round((latestData.totalPayout / totalInvestment) * 100) : 0;

    // 的中率計算
    const hitRate = latestData.totalRaces > 0 ? Math.round((latestData.hitRaces / latestData.totalRaces) * 100) : 0;

    // results配列変換
    const results = latestData.races.map(race => ({
        race: race.raceNumber,
        result: race.hit ? 'win' : 'loss',
        payout: race.payout
    }));

    return {
        date: `${latestData.month}/${latestData.day}`,
        track: `${latestData.venue}競馬`,
        hitRate: hitRate,
        hitCount: latestData.hitRaces,
        totalCount: latestData.totalRaces,
        totalPayout: latestData.totalPayout,
        recoveryRate: recoveryRate,
        totalBetPoints: totalBetPoints,
        results: results
    };
}

/**
 * archiveSanrenpukuResults.jsonから最新日のデータを取得
 * @returns {Object|null} 最新日のデータ（year, month, day, venue, races等を含む）
 */
export function getLatestSanrenpukuDayData() {
    const years = Object.keys(archiveSanrenpukuResults).sort().reverse();
    if (years.length === 0) return null;

    const latestYear = years[0];
    const months = Object.keys(archiveSanrenpukuResults[latestYear]).sort().reverse();
    if (months.length === 0) return null;

    const latestMonth = months[0];
    const days = Object.keys(archiveSanrenpukuResults[latestYear][latestMonth]).sort().reverse();
    if (days.length === 0) return null;

    const latestDay = days[0];
    const dayData = archiveSanrenpukuResults[latestYear][latestMonth][latestDay];

    // HTML template用に必要なプロパティを追加
    const totalBetPoints = dayData.races ? dayData.races.reduce((sum, race) => sum + (race.betPoints || 0), 0) : 0;
    const hitRate = dayData.totalRaces > 0 ? Math.round((dayData.hitRaces / dayData.totalRaces) * 100) : 0;

    // races配列にisHitプロパティを追加（hitと同じ値）
    const racesWithIsHit = dayData.races ? dayData.races.map(race => ({
        ...race,
        isHit: race.hit  // HTMLテンプレートはisHitを期待している
    })) : [];

    return {
        year: latestYear,
        month: latestMonth,
        day: latestDay,
        date: `${latestMonth}/${latestDay}`,  // HTML template用の日付文字列
        hitRate: hitRate,  // 的中率（%）
        totalBetPoints: totalBetPoints,  // 合計購入点数
        ...dayData,
        races: racesWithIsHit  // isHitプロパティを追加したraces配列
    };
}

/**
 * 最新日データを三連複yesterday結果形式に変換
 * @returns {Object|null} yesterdayResults形式のオブジェクト
 */
export function convertToSanrenpukuYesterdayResults() {
    const latestData = getLatestSanrenpukuDayData();
    if (!latestData) return null;

    // 回収率計算
    const totalBetPoints = latestData.races.reduce((sum, race) => sum + (race.betPoints || 0), 0);
    const totalInvestment = totalBetPoints * 100; // 1点=100円
    const recoveryRate = totalInvestment > 0 ? Math.round((latestData.totalPayout / totalInvestment) * 100) : 0;

    // 的中率計算
    const hitRate = latestData.totalRaces > 0 ? Math.round((latestData.hitRaces / latestData.totalRaces) * 100) : 0;

    // results配列変換
    const results = latestData.races.map(race => ({
        race: race.raceNumber,
        result: race.hit ? 'win' : 'loss',
        payout: race.payout
    }));

    return {
        date: `${latestData.month}/${latestData.day}`,
        track: `${latestData.venue}競馬`,
        hitRate: hitRate,
        hitCount: latestData.hitRaces,
        totalCount: latestData.totalRaces,
        totalPayout: latestData.totalPayout,
        recoveryRate: recoveryRate,
        totalBetPoints: totalBetPoints,
        results: results
    };
}
