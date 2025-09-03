// スケジュール実行版（毎日AM 1:00に自動実行）ESModule
import { handler as dailyPointsHandler } from './daily-points.js';

// Netlifyのスケジュール関数として登録
export const handler = async (event, context) => {
  console.log('⏰ スケジュール実行: デイリーポイント付与');
  
  // 実際の処理を実行
  const result = await dailyPointsHandler(event, context);
  
  // ログ出力
  console.log('実行結果:', result.body);
  
  return result;
};