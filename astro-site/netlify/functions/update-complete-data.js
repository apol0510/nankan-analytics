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

        // Airtableにデータ保存（将来実装予定）
        console.log('🔄 予想データを受信しました');

        let updatedRacesCount = 0;
        Object.keys(completeData).forEach(raceNum => {
            const raceData = completeData[raceNum];
            if (raceData) {
                console.log(`🎯 ${raceNum}R データ確認:`);

                // 馬情報ログ
                if (raceData.horses) {
                    if (raceData.horses.main) {
                        console.log(`  ✅ 本命: ${raceData.horses.main.number}${raceData.horses.main.name}`);
                    }
                    if (raceData.horses.sub) {
                        console.log(`  ✅ 対抗: ${raceData.horses.sub.number}${raceData.horses.sub.name}`);
                    }
                }

                // 候補馬ログ
                if (raceData.candidates) {
                    if (raceData.candidates.renka?.length > 0) {
                        console.log(`  ✅ 連下候補馬: ${raceData.candidates.renka.join(',')}`);
                    }
                    if (raceData.candidates.osae?.length > 0) {
                        console.log(`  ✅ 押さえ候補馬: ${raceData.candidates.osae.join(',')}`);
                    }
                }

                // 戦略ログ
                if (raceData.strategies) {
                    if (raceData.strategies.safe?.length > 0) {
                        console.log(`  ✅ 戦略A: ${raceData.strategies.safe.length}点`);
                    }
                    if (raceData.strategies.balance?.length > 0) {
                        console.log(`  ✅ 戦略B: ${raceData.strategies.balance.length}点`);
                    }
                    if (raceData.strategies.aggressive?.length > 0) {
                        console.log(`  ✅ 戦略C: ${raceData.strategies.aggressive.length}点`);
                    }
                }

                updatedRacesCount++;
            }
        });

        console.log(`🎯 ${updatedRacesCount}レースのデータを確認しました`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Complete data received and processed successfully',
                updatedRaces: updatedRacesCount,
                note: 'データはログ出力されました。将来的にAirtableまたは他の永続化システムに保存予定です。'
            })
        };

    } catch (error) {
        console.error('Error processing complete data:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to process complete data',
                details: error.message
            })
        };
    }
}

export { handler as default };