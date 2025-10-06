/**
 * アーカイブデータユーティリティ
 * archiveResults.jsonから最新の的中結果データを取得
 */

import archiveResults from '../data/archiveResults.json';

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
