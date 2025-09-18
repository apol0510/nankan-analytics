import fs from 'fs/promises';
import path from 'path';

export default async (req, context) => {
    // POSTメソッドのみ許可
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // リクエストボディを取得
        const data = await req.json();

        // データ検証
        if (!data.date || !data.track || !data.races) {
            return new Response(JSON.stringify({ error: 'Invalid data format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // JSONファイルのパスを構築
        // Netlify Functionsでは、ビルド時のファイルシステムへの書き込みは制限されています
        // そのため、このアプローチは本番環境では動作しません
        // 代替案：Airtableまたは外部データベースを使用

        // 開発環境用のコード（ローカルでのみ動作）
        if (process.env.NODE_ENV === 'development') {
            const filePath = path.join(process.cwd(), 'src', 'data', 'raceResults.json');

            // JSONファイルを更新
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));

            return new Response(JSON.stringify({
                success: true,
                message: 'Race results updated successfully'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // 本番環境では、データを返すだけにして手動更新を促す
            return new Response(JSON.stringify({
                success: false,
                message: 'Please update raceResults.json manually in production',
                data: data
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Error updating race results:', error);
        return new Response(JSON.stringify({
            error: 'Failed to update race results',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};