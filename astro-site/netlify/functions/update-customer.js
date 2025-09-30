/**
 * 顧客情報更新API
 * Airtableの顧客データを更新する
 */

export const handler = async (event, context) => {
    // CORSヘッダー
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // OPTIONSリクエスト対応
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // POSTのみ許可
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }

    try {
        // リクエストボディ解析
        const { currentEmail, newEmail, newName } = JSON.parse(event.body);

        // バリデーション
        if (!currentEmail) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: '現在のメールアドレスが必要です' })
            };
        }

        if (!newEmail) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: '新しいメールアドレスが必要です' })
            };
        }

        // Airtable設定
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
            console.error('Airtable設定が不足しています');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ message: 'サーバー設定エラー' })
            };
        }

        // Airtableから現在のレコードを検索
        const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Customers?filterByFormula={Email}='${currentEmail}'`;

        const searchResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!searchResponse.ok) {
            console.error('Airtable検索エラー:', await searchResponse.text());
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ message: '顧客情報の検索に失敗しました' })
            };
        }

        const searchData = await searchResponse.json();

        if (!searchData.records || searchData.records.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: '顧客情報が見つかりません' })
            };
        }

        // レコードID取得
        const recordId = searchData.records[0].id;
        const currentFields = searchData.records[0].fields;

        // 更新データ準備
        const updateFields = {};

        // メールアドレス変更
        if (newEmail !== currentEmail) {
            // 重複チェック
            const duplicateCheckUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Customers?filterByFormula={Email}='${newEmail}'`;
            const duplicateResponse = await fetch(duplicateCheckUrl, {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const duplicateData = await duplicateResponse.json();
            if (duplicateData.records && duplicateData.records.length > 0) {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({ message: 'このメールアドレスは既に使用されています' })
                };
            }

            updateFields.Email = newEmail;
        }

        // 名前変更
        if (newName && newName !== (currentFields.Name || '')) {
            updateFields.Name = newName;
        }

        // 変更がない場合
        if (Object.keys(updateFields).length === 0) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: '変更項目がありません'
                })
            };
        }

        // 最終更新日時を追加
        updateFields.LastUpdated = new Date().toISOString();

        // Airtable更新実行
        const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Customers/${recordId}`;
        const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: updateFields
            })
        });

        if (!updateResponse.ok) {
            console.error('Airtable更新エラー:', await updateResponse.text());
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ message: '情報の更新に失敗しました' })
            };
        }

        const updatedRecord = await updateResponse.json();

        // 更新ログ記録
        console.log(`✅ 顧客情報更新成功: ${currentEmail} → ${newEmail || currentEmail}`);
        if (newName) {
            console.log(`   名前: ${currentFields.Name || '未設定'} → ${newName}`);
        }

        // 成功レスポンス
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: '登録情報を更新しました',
                updatedFields: updateFields,
                record: {
                    id: updatedRecord.id,
                    email: updatedRecord.fields.Email,
                    name: updatedRecord.fields.Name
                }
            })
        };

    } catch (error) {
        console.error('更新処理エラー:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                message: 'サーバーエラーが発生しました',
                error: error.message
            })
        };
    }
};