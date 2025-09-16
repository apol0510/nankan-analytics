import { promises as fs } from 'fs';
import path from 'path';

export async function handler(event, context) {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { completeData } = JSON.parse(event.body);

        if (!completeData) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Complete data is required' })
            };
        }

        // JSONファイルのパス
        const jsonFilePath = path.join(process.cwd(), 'src', 'data', 'allRacesPrediction.json');

        // 現在のJSONデータを読み込み
        const currentData = JSON.parse(await fs.readFile(jsonFilePath, 'utf8'));

        let updatedRacesCount = 0;

        // 各レースのデータを更新
        currentData.races.forEach((race, index) => {
            const raceNum = index + 1;
            const newRaceData = completeData[raceNum];

            if (newRaceData) {
                console.log(`🔄 ${raceNum}R データ更新開始`);

                // 馬情報の更新
                if (newRaceData.horses) {
                    // 本命馬の更新
                    if (newRaceData.horses.main && race.horses.main) {
                        race.horses.main.number = newRaceData.horses.main.number;
                        race.horses.main.name = newRaceData.horses.main.name;
                        race.horses.main.factors = newRaceData.horses.main.factors || race.horses.main.factors;
                        race.horses.main.importance = newRaceData.horses.main.importance || race.horses.main.importance;
                        console.log(`  ✅ 本命: ${newRaceData.horses.main.number}${newRaceData.horses.main.name}`);
                    }

                    // 対抗馬の更新
                    if (newRaceData.horses.sub && race.horses.sub) {
                        race.horses.sub.number = newRaceData.horses.sub.number;
                        race.horses.sub.name = newRaceData.horses.sub.name;
                        race.horses.sub.factors = newRaceData.horses.sub.factors || race.horses.sub.factors;
                        race.horses.sub.importance = newRaceData.horses.sub.importance || race.horses.sub.importance;
                        console.log(`  ✅ 対抗: ${newRaceData.horses.sub.number}${newRaceData.horses.sub.name}`);
                    }

                    // 単穴馬の更新
                    if (newRaceData.horses.sub1 && race.horses.sub1) {
                        race.horses.sub1.number = newRaceData.horses.sub1.number;
                        race.horses.sub1.name = newRaceData.horses.sub1.name;
                        race.horses.sub1.factors = newRaceData.horses.sub1.factors || race.horses.sub1.factors;
                        race.horses.sub1.importance = newRaceData.horses.sub1.importance || race.horses.sub1.importance;
                        console.log(`  ✅ 単穴1: ${newRaceData.horses.sub1.number}${newRaceData.horses.sub1.name}`);
                    }

                    // 単穴2馬の更新
                    if (newRaceData.horses.sub2 && race.horses.sub2) {
                        race.horses.sub2.number = newRaceData.horses.sub2.number;
                        race.horses.sub2.name = newRaceData.horses.sub2.name;
                        race.horses.sub2.factors = newRaceData.horses.sub2.factors || race.horses.sub2.factors;
                        race.horses.sub2.importance = newRaceData.horses.sub2.importance || race.horses.sub2.importance;
                        console.log(`  ✅ 単穴2: ${newRaceData.horses.sub2.number}${newRaceData.horses.sub2.name}`);
                    }
                }

                // allHorses配列の更新（候補馬情報の反映）
                if (race.allHorses && newRaceData.candidates) {
                    // 連下候補馬の更新
                    if (newRaceData.candidates.renka) {
                        race.allHorses.forEach(horse => {
                            if (newRaceData.candidates.renka.includes(horse.number)) {
                                horse.type = '連下';
                                horse.mark = '△';
                            }
                        });
                        console.log(`  ✅ 連下候補馬: ${newRaceData.candidates.renka.join(',')}`);
                    }

                    // 押さえ候補馬の更新
                    if (newRaceData.candidates.osae) {
                        race.allHorses.forEach(horse => {
                            if (newRaceData.candidates.osae.includes(horse.number)) {
                                horse.type = '押さえ';
                                horse.mark = '×';
                            }
                        });
                        console.log(`  ✅ 押さえ候補馬: ${newRaceData.candidates.osae.join(',')}`);
                    }
                }

                // 戦略別買い目の更新
                if (newRaceData.strategies) {
                    // 戦略A（少点数的中型）の更新
                    if (newRaceData.strategies.safe && race.strategies.safe) {
                        race.strategies.safe.bets = newRaceData.strategies.safe.map(bet => ({
                            type: "馬単",
                            horses: bet.replace('馬単 ', ''),
                            points: ""
                        }));
                        console.log(`  ✅ 戦略A: ${newRaceData.strategies.safe.join(', ')}`);
                    }

                    // 戦略B（バランス型）の更新
                    if (newRaceData.strategies.balance && race.strategies.balance) {
                        race.strategies.balance.bets = newRaceData.strategies.balance.map(bet => ({
                            type: "馬単",
                            horses: bet.replace('馬単 ', ''),
                            points: ""
                        }));
                        console.log(`  ✅ 戦略B: ${newRaceData.strategies.balance.join(', ')}`);
                    }

                    // 戦略C（高配当追求型）の更新
                    if (newRaceData.strategies.aggressive && race.strategies.aggressive) {
                        race.strategies.aggressive.bets = newRaceData.strategies.aggressive.map(bet => ({
                            type: "馬単",
                            horses: bet.replace('馬単 ', ''),
                            points: ""
                        }));
                        console.log(`  ✅ 戦略C: ${newRaceData.strategies.aggressive.join(', ')}`);
                    }
                }

                updatedRacesCount++;
                console.log(`🎯 ${raceNum}R データ更新完了`);
            }
        });

        // JSONファイルに書き戻し
        await fs.writeFile(jsonFilePath, JSON.stringify(currentData, null, 2), 'utf8');

        console.log('🎯 Complete data successfully updated!');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Complete data updated successfully',
                updatedRaces: updatedRacesCount
            })
        };

    } catch (error) {
        console.error('Error updating complete data:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to update complete data',
                details: error.message
            })
        };
    }
}

export { handler as default };