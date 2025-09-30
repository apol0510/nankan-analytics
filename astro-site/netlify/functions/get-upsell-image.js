// Airtableから最新のアップセル画像URLを取得
// デプロイ不要で画像を即座更新可能

exports.handler = async (event) => {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

  try {
    // Airtableから最新の画像URL取得
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/UpsellImages?maxRecords=1&sort[0][field]=UpdatedAt&sort[0][direction]=desc`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Airtable API error');
    }

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      const imageUrl = data.records[0].fields.ImageURL;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          updatedAt: data.records[0].fields.UpdatedAt
        })
      };
    }

    // レコードがない場合はデフォルト画像
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl: 'https://res.cloudinary.com/da1mkphuk/image/upload/v1/kaime0922_dqdlam'
      })
    };

  } catch (error) {
    console.error('Error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch image URL',
        imageUrl: 'https://res.cloudinary.com/da1mkphuk/image/upload/v1/kaime0922_dqdlam' // フォールバック
      })
    };
  }
};