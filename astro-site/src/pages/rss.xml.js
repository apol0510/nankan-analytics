import rss from '@astrojs/rss';

export async function GET(context) {
  return rss({
    title: 'NANKANアナリティクス | AI・機械学習で勝つ競馬予想プラットフォーム',
    description: 'AI・機械学習で勝つ。南関競馬の次世代予想プラットフォーム。従来の感覚的予想から科学的・統計的アプローチへ。',
    site: context.site,
    items: [
      {
        title: 'Pythonで始める競馬データ分析 - pandas基礎からXGBoostまで',
        description: 'pandasとscikit-learnを使った競馬データ分析の基礎を解説。実際のコード例付きで初心者でも理解できます。',
        pubDate: new Date('2025-01-15'),
        link: '/machine-learning/python-horse-racing-data-analysis/',
      },
      {
        title: 'LSTMを使った時系列予想モデル - TensorFlow実装例',
        description: 'TensorFlowでLSTMネットワークを構築し、競馬の時系列データから予想モデルを作成する方法を詳解。',
        pubDate: new Date('2025-01-10'),
        link: '/deep-learning/lstm-time-series-tensorflow/',
      },
      {
        title: 'ベイズ統計で競馬予想の不確実性を定量化',
        description: 'PyMCを使ったベイズ統計による予想の不確実性定量化。確率的予想の実装方法を解説。',
        pubDate: new Date('2025-01-05'),
        link: '/data-science/bayesian-statistics-horse-prediction-uncertainty/',
      },
    ],
    customData: `<language>ja-jp</language>`,
  });
}