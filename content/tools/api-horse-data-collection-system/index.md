---
title: "API連携で競馬データを自動収集するシステム"
date: 2025-08-07T11:00:00+09:00
description: "競馬データの自動収集システムをPythonとAPIで構築する方法を解説。スクレイピングからリアルタイム更新まで、効率的なデータ取得の実装手法を詳細に説明。"
categories: ["Tools", "Python", "Data Collection"]
tags: ["API", "競馬データ", "スクレイピング", "自動化", "Python", "データ収集", "requests", "BeautifulSoup", "pandas", "データベース"]
slug: "api-horse-data-collection-system"
---

## はじめに

競馬予想や分析を行う上で、正確で最新のデータ収集は最も重要な要素の一つです。本記事では、Python を使用して競馬データを効率的に自動収集するシステムの構築方法を詳しく解説します。API 連携、Web スクレイピング、リアルタイム更新機能を組み合わせた実用的なソリューションを提供します。

## 1. データ収集システムの設計思想

### 1.1 システムアーキテクチャ

効率的な競馬データ収集システムは以下の要素で構成されます：

- **データソース層**: 公式API、Webサイト、外部データプロバイダー
- **収集エンジン層**: スケジューラー、スクレイパー、API クライアント
- **処理層**: データクリーニング、正規化、バリデーション
- **ストレージ層**: データベース、ファイルシステム
- **監視層**: ログ管理、エラーハンドリング、アラート

### 1.2 主要データソース

競馬データの主要な収集先：

- **JRA公式サイト**: レース結果、出馬表、騎手・調教師情報
- **netkeiba.com**: 馬の詳細情報、過去成績、血統データ
- **競馬ブック**: オッズ情報、専門家予想
- **Yahoo!競馬**: リアルタイムオッズ、レース速報

## 2. 環境構築とライブラリ設定

### 2.1 必要ライブラリのインストール

```bash
# 仮想環境の作成
python -m venv horse_data_collector
source horse_data_collector/bin/activate  # Windows: horse_data_collector\Scripts\activate

# 必要なパッケージの一括インストール
pip install requests beautifulsoup4 pandas numpy sqlalchemy 
pip install selenium webdriver-manager schedule aiohttp asyncio
pip install pymongo redis celery python-dotenv logging
```

### 2.2 プロジェクト構造

```
horse_data_collector/
├── config/
│   ├── __init__.py
│   ├── settings.py
│   └── database.py
├── collectors/
│   ├── __init__.py
│   ├── base_collector.py
│   ├── jra_collector.py
│   ├── netkeiba_collector.py
│   └── odds_collector.py
├── processors/
│   ├── __init__.py
│   ├── data_cleaner.py
│   └── data_validator.py
├── storage/
│   ├── __init__.py
│   ├── database_manager.py
│   └── file_manager.py
├── scheduler/
│   ├── __init__.py
│   └── task_scheduler.py
├── utils/
│   ├── __init__.py
│   ├── logger.py
│   └── helpers.py
├── main.py
└── requirements.txt
```

## 3. 基盤クラスの実装

### 3.1 設定管理（config/settings.py）

```python
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # データベース設定
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///horse_data.db')
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    
    # API設定
    JRA_BASE_URL = 'https://www.jra.go.jp'
    NETKEIBA_BASE_URL = 'https://db.netkeiba.com'
    YAHOO_KEIBA_BASE_URL = 'https://keiba.yahoo.co.jp'
    
    # スクレイピング設定
    REQUEST_DELAY = 1.0  # リクエスト間の待機時間（秒）
    RETRY_COUNT = 3      # リトライ回数
    TIMEOUT = 30         # タイムアウト（秒）
    
    # ヘッダー設定
    USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    HEADERS = {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
    }
    
    # ログ設定
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = 'logs/horse_collector.log'
    
    # データ収集スケジュール
    RACE_DATA_SCHEDULE = '0 8 * * *'    # 毎日8時
    ODDS_UPDATE_SCHEDULE = '*/5 * * * *'  # 5分毎
    RESULTS_CHECK_SCHEDULE = '0 18 * * *' # 毎日18時

settings = Settings()
```

### 3.2 ベースコレクター（collectors/base_collector.py）

```python
import requests
import time
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from bs4 import BeautifulSoup
import pandas as pd
from config.settings import settings

class BaseCollector(ABC):
    """データ収集の基底クラス"""
    
    def __init__(self, name: str):
        self.name = name
        self.session = requests.Session()
        self.session.headers.update(settings.HEADERS)
        self.logger = logging.getLogger(f'collector.{name}')
        
    def get_page(self, url: str, params: Dict = None, retries: int = None) -> Optional[requests.Response]:
        """HTTPリクエストの実行"""
        retries = retries or settings.RETRY_COUNT
        
        for attempt in range(retries):
            try:
                response = self.session.get(
                    url, 
                    params=params,
                    timeout=settings.TIMEOUT
                )
                response.raise_for_status()
                
                # レート制限のための待機
                time.sleep(settings.REQUEST_DELAY)
                
                return response
                
            except requests.exceptions.RequestException as e:
                self.logger.warning(f"Request failed (attempt {attempt + 1}/{retries}): {e}")
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # 指数バックオフ
                else:
                    self.logger.error(f"All requests failed for URL: {url}")
                    return None
    
    def parse_html(self, html_content: str) -> BeautifulSoup:
        """HTMLの解析"""
        return BeautifulSoup(html_content, 'html.parser')
    
    def clean_text(self, text: str) -> str:
        """テキストのクリーニング"""
        if not text:
            return ""
        return text.strip().replace('\n', '').replace('\r', '')
    
    def extract_number(self, text: str) -> Optional[int]:
        """テキストから数値を抽出"""
        import re
        numbers = re.findall(r'\d+', text)
        return int(numbers[0]) if numbers else None
    
    @abstractmethod
    def collect_data(self, **kwargs) -> List[Dict[str, Any]]:
        """データ収集の実装（サブクラスで実装）"""
        pass
    
    def save_to_csv(self, data: List[Dict], filename: str) -> bool:
        """CSVファイルへの保存"""
        try:
            df = pd.DataFrame(data)
            df.to_csv(filename, index=False, encoding='utf-8-sig')
            self.logger.info(f"Data saved to {filename}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to save CSV: {e}")
            return False
```

## 4. JRAデータ収集の実装

### 4.1 JRAコレクター（collectors/jra_collector.py）

```python
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collectors.base_collector import BaseCollector

class JRACollector(BaseCollector):
    """JRA公式サイトからのデータ収集"""
    
    def __init__(self):
        super().__init__('jra')
        self.base_url = 'https://www.jra.go.jp'
    
    def collect_race_schedule(self, target_date: datetime = None) -> List[Dict]:
        """レーススケジュールの収集"""
        if not target_date:
            target_date = datetime.now()
        
        date_str = target_date.strftime('%Y%m%d')
        url = f"{self.base_url}/JRADB/accessS.html"
        
        params = {
            'CNAME': 'pw01sli00/S1',
            'FNAME': 'pw01sli00.html',
            'HHMD': date_str
        }
        
        response = self.get_page(url, params)
        if not response:
            return []
        
        soup = self.parse_html(response.text)
        races = []
        
        # レース情報の解析
        race_tables = soup.find_all('table', class_='nk_tb_common')
        
        for table in race_tables:
            track_info = table.find_previous('h3')
            if not track_info:
                continue
                
            track_name = self.clean_text(track_info.get_text())
            
            rows = table.find_all('tr')
            for row in rows[1:]:  # ヘッダー行をスキップ
                cells = row.find_all('td')
                if len(cells) >= 6:
                    race_data = {
                        'date': target_date.date(),
                        'track': track_name,
                        'race_number': self.clean_text(cells[0].get_text()),
                        'race_name': self.clean_text(cells[1].get_text()),
                        'distance': self.extract_distance(cells[2].get_text()),
                        'track_condition': self.clean_text(cells[3].get_text()),
                        'grade': self.extract_grade(cells[4].get_text()),
                        'start_time': self.clean_text(cells[5].get_text())
                    }
                    races.append(race_data)
        
        self.logger.info(f"Collected {len(races)} races for {date_str}")
        return races
    
    def collect_race_results(self, race_id: str) -> List[Dict]:
        """レース結果の収集"""
        url = f"{self.base_url}/JRADB/accessS.html"
        params = {
            'CNAME': 'pw01sde1004/F9',
            'FNAME': 'pw01sde1004.html',
            'KAISAI_ID': race_id
        }
        
        response = self.get_page(url, params)
        if not response:
            return []
        
        soup = self.parse_html(response.text)
        results = []
        
        # 結果テーブルの解析
        result_table = soup.find('table', class_='nk_tb_common')
        if not result_table:
            return []
        
        rows = result_table.find_all('tr')
        for row in rows[1:]:  # ヘッダー行をスキップ
            cells = row.find_all('td')
            if len(cells) >= 8:
                horse_data = {
                    'race_id': race_id,
                    'finish_position': self.extract_number(cells[0].get_text()),
                    'gate_number': self.extract_number(cells[1].get_text()),
                    'horse_number': self.extract_number(cells[2].get_text()),
                    'horse_name': self.clean_text(cells[3].get_text()),
                    'age': self.extract_age(cells[4].get_text()),
                    'weight': self.extract_number(cells[5].get_text()),
                    'jockey': self.clean_text(cells[6].get_text()),
                    'time': self.clean_text(cells[7].get_text()),
                    'odds': self.extract_odds(cells[8].get_text()) if len(cells) > 8 else None
                }
                results.append(horse_data)
        
        return results
    
    def collect_horse_info(self, horse_id: str) -> Dict:
        """馬の詳細情報収集"""
        url = f"{self.base_url}/JRADB/accessH.html"
        params = {
            'CNAME': 'pw01hde0602/F1',
            'FNAME': 'pw01hde0602.html',
            'BAMEI_NO': horse_id
        }
        
        response = self.get_page(url, params)
        if not response:
            return {}
        
        soup = self.parse_html(response.text)
        
        # 馬の基本情報
        profile_table = soup.find('table', class_='nk_tb_common')
        if not profile_table:
            return {}
        
        horse_info = {'horse_id': horse_id}
        
        # プロフィール情報の解析
        rows = profile_table.find_all('tr')
        for row in rows:
            cells = row.find_all(['th', 'td'])
            if len(cells) >= 2:
                key = self.clean_text(cells[0].get_text())
                value = self.clean_text(cells[1].get_text())
                
                # キーマッピング
                key_mapping = {
                    '馬名': 'name',
                    '性齢': 'age_sex',
                    '毛色': 'color',
                    '調教師': 'trainer',
                    '生産者': 'breeder',
                    '馬主': 'owner'
                }
                
                mapped_key = key_mapping.get(key)
                if mapped_key:
                    horse_info[mapped_key] = value
        
        return horse_info
    
    def extract_distance(self, text: str) -> Optional[int]:
        """距離情報の抽出"""
        distance_match = re.search(r'(\d+)m', text)
        return int(distance_match.group(1)) if distance_match else None
    
    def extract_grade(self, text: str) -> str:
        """グレード情報の抽出"""
        grades = ['G1', 'G2', 'G3', 'L', 'OP']
        for grade in grades:
            if grade in text:
                return grade
        return 'その他'
    
    def extract_age(self, text: str) -> Optional[int]:
        """年齢の抽出"""
        age_match = re.search(r'(\d+)', text)
        return int(age_match.group(1)) if age_match else None
    
    def extract_odds(self, text: str) -> Optional[float]:
        """オッズの抽出"""
        try:
            odds_text = self.clean_text(text)
            return float(odds_text) if odds_text else None
        except ValueError:
            return None
    
    def collect_data(self, data_type: str = 'schedule', **kwargs) -> List[Dict]:
        """メインの収集メソッド"""
        if data_type == 'schedule':
            return self.collect_race_schedule(kwargs.get('date'))
        elif data_type == 'results':
            return self.collect_race_results(kwargs.get('race_id'))
        elif data_type == 'horse':
            horse_data = self.collect_horse_info(kwargs.get('horse_id'))
            return [horse_data] if horse_data else []
        else:
            self.logger.error(f"Unknown data type: {data_type}")
            return []
```

## 5. ネットケイバデータ収集

### 5.1 NetKeibaコレクター（collectors/netkeiba_collector.py）

```python
import re
from datetime import datetime
from urllib.parse import urljoin
from typing import Dict, List, Optional
from collectors.base_collector import BaseCollector

class NetKeibaCollector(BaseCollector):
    """netkeiba.com からのデータ収集"""
    
    def __init__(self):
        super().__init__('netkeiba')
        self.base_url = 'https://db.netkeiba.com'
    
    def collect_horse_performance(self, horse_id: str) -> List[Dict]:
        """馬の戦績データ収集"""
        url = f"{self.base_url}/horse/{horse_id}"
        response = self.get_page(url)
        
        if not response:
            return []
        
        soup = self.parse_html(response.text)
        performances = []
        
        # 戦績テーブルの取得
        performance_table = soup.find('table', class_='db_h_race_results')
        if not performance_table:
            return []
        
        rows = performance_table.find('tbody').find_all('tr') if performance_table.find('tbody') else []
        
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 12:
                try:
                    performance = {
                        'horse_id': horse_id,
                        'race_date': self.parse_date(cells[0].get_text()),
                        'track': self.clean_text(cells[1].get_text()),
                        'weather': self.clean_text(cells[2].get_text()),
                        'race_number': self.extract_number(cells[3].get_text()),
                        'race_name': self.clean_text(cells[4].find('a').get_text() if cells[4].find('a') else cells[4].get_text()),
                        'horses_count': self.extract_number(cells[5].get_text()),
                        'gate_number': self.extract_number(cells[6].get_text()),
                        'horse_number': self.extract_number(cells[7].get_text()),
                        'odds': self.extract_decimal(cells[8].get_text()),
                        'popularity': self.extract_number(cells[9].get_text()),
                        'finish_position': self.extract_finish_position(cells[10].get_text()),
                        'jockey': self.clean_text(cells[11].get_text()),
                        'weight': self.extract_weight(cells[12].get_text()) if len(cells) > 12 else None,
                        'time': self.clean_text(cells[13].get_text()) if len(cells) > 13 else None
                    }
                    performances.append(performance)
                    
                except Exception as e:
                    self.logger.warning(f"Error parsing performance row: {e}")
                    continue
        
        self.logger.info(f"Collected {len(performances)} performances for horse {horse_id}")
        return performances
    
    def collect_pedigree_info(self, horse_id: str) -> Dict:
        """血統情報の収集"""
        url = f"{self.base_url}/horse/ped/{horse_id}"
        response = self.get_page(url)
        
        if not response:
            return {}
        
        soup = self.parse_html(response.text)
        pedigree = {'horse_id': horse_id}
        
        # 血統テーブルの解析
        pedigree_table = soup.find('table', class_='blood_table')
        if pedigree_table:
            # 父系と母系の情報抽出
            father_row = pedigree_table.find('tr')
            if father_row:
                father_cell = father_row.find('td', class_='b_ml')
                if father_cell and father_cell.find('a'):
                    pedigree['father'] = self.clean_text(father_cell.find('a').get_text())
                    pedigree['father_id'] = self.extract_horse_id_from_url(father_cell.find('a').get('href'))
        
        # 母情報の抽出
        mother_info = soup.find('td', string=re.compile('母'))
        if mother_info:
            mother_row = mother_info.find_parent('tr')
            if mother_row:
                mother_link = mother_row.find('a')
                if mother_link:
                    pedigree['mother'] = self.clean_text(mother_link.get_text())
                    pedigree['mother_id'] = self.extract_horse_id_from_url(mother_link.get('href'))
        
        return pedigree
    
    def collect_jockey_stats(self, jockey_id: str) -> Dict:
        """騎手統計情報の収集"""
        url = f"{self.base_url}/jockey/{jockey_id}"
        response = self.get_page(url)
        
        if not response:
            return {}
        
        soup = self.parse_html(response.text)
        stats = {'jockey_id': jockey_id}
        
        # 騎手名の取得
        name_element = soup.find('h1', class_='horse_title')
        if name_element:
            stats['name'] = self.clean_text(name_element.get_text())
        
        # 統計情報テーブルの解析
        stats_table = soup.find('table', class_='db_h_race_results')
        if stats_table:
            summary_row = stats_table.find('tr', class_='summ')
            if summary_row:
                cells = summary_row.find_all('td')
                if len(cells) >= 8:
                    stats.update({
                        'total_races': self.extract_number(cells[0].get_text()),
                        'wins': self.extract_number(cells[1].get_text()),
                        'places': self.extract_number(cells[2].get_text()),
                        'shows': self.extract_number(cells[3].get_text()),
                        'win_rate': self.extract_percentage(cells[4].get_text()),
                        'place_rate': self.extract_percentage(cells[5].get_text()),
                        'show_rate': self.extract_percentage(cells[6].get_text()),
                        'earnings': self.extract_earnings(cells[7].get_text())
                    })
        
        return stats
    
    def search_horses_by_name(self, horse_name: str) -> List[Dict]:
        """馬名による検索"""
        url = f"{self.base_url}/horse/"
        params = {
            'word': horse_name,
            'type': 'horse'
        }
        
        response = self.get_page(url, params)
        if not response:
            return []
        
        soup = self.parse_html(response.text)
        horses = []
        
        # 検索結果の解析
        result_table = soup.find('table', class_='nk_tb_common')
        if result_table:
            rows = result_table.find_all('tr')[1:]  # ヘッダー除外
            
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 3:
                    horse_link = cells[0].find('a')
                    if horse_link:
                        horse_info = {
                            'name': self.clean_text(horse_link.get_text()),
                            'horse_id': self.extract_horse_id_from_url(horse_link.get('href')),
                            'age_sex': self.clean_text(cells[1].get_text()),
                            'trainer': self.clean_text(cells[2].get_text())
                        }
                        horses.append(horse_info)
        
        return horses
    
    def parse_date(self, date_str: str) -> Optional[datetime]:
        """日付文字列の解析"""
        try:
            cleaned_date = re.sub(r'[^\d/]', '', date_str)
            return datetime.strptime(cleaned_date, '%Y/%m/%d')
        except ValueError:
            return None
    
    def extract_finish_position(self, text: str) -> Optional[int]:
        """着順の抽出"""
        # 除外や中止などの場合の処理
        special_cases = ['除', '中', '失', '降']
        clean_text = self.clean_text(text)
        
        if any(case in clean_text for case in special_cases):
            return None
        
        return self.extract_number(clean_text)
    
    def extract_weight(self, text: str) -> Optional[int]:
        """体重の抽出"""
        weight_match = re.search(r'(\d+)', text)
        return int(weight_match.group(1)) if weight_match else None
    
    def extract_decimal(self, text: str) -> Optional[float]:
        """小数の抽出"""
        try:
            clean_text = re.sub(r'[^\d.]', '', text)
            return float(clean_text) if clean_text else None
        except ValueError:
            return None
    
    def extract_percentage(self, text: str) -> Optional[float]:
        """パーセンテージの抽出"""
        percentage_match = re.search(r'([\d.]+)', text)
        if percentage_match:
            return float(percentage_match.group(1)) / 100
        return None
    
    def extract_earnings(self, text: str) -> Optional[int]:
        """賞金の抽出"""
        # 万円表記を数値に変換
        earnings_match = re.search(r'([\d,]+)', text)
        if earnings_match:
            return int(earnings_match.group(1).replace(',', '')) * 10000
        return None
    
    def extract_horse_id_from_url(self, url: str) -> Optional[str]:
        """URLから馬IDを抽出"""
        if not url:
            return None
        
        id_match = re.search(r'/horse/(\d+)', url)
        return id_match.group(1) if id_match else None
    
    def collect_data(self, data_type: str = 'performance', **kwargs) -> List[Dict]:
        """メインの収集メソッド"""
        if data_type == 'performance':
            return self.collect_horse_performance(kwargs.get('horse_id'))
        elif data_type == 'pedigree':
            pedigree_data = self.collect_pedigree_info(kwargs.get('horse_id'))
            return [pedigree_data] if pedigree_data else []
        elif data_type == 'jockey':
            jockey_data = self.collect_jockey_stats(kwargs.get('jockey_id'))
            return [jockey_data] if jockey_data else []
        elif data_type == 'search':
            return self.search_horses_by_name(kwargs.get('horse_name'))
        else:
            self.logger.error(f"Unknown data type: {data_type}")
            return []
```

## 6. オッズデータ収集

### 6.1 リアルタイムオッズコレクター（collectors/odds_collector.py）

```python
import json
from datetime import datetime
from typing import Dict, List, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from collectors.base_collector import BaseCollector

class OddsCollector(BaseCollector):
    """オッズ情報の収集"""
    
    def __init__(self, use_selenium: bool = False):
        super().__init__('odds')
        self.use_selenium = use_selenium
        self.driver = None
        
        if use_selenium:
            self.setup_selenium()
    
    def setup_selenium(self):
        """Selenium WebDriverのセットアップ"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        
        try:
            from webdriver_manager.chrome import ChromeDriverManager
            from selenium.webdriver.chrome.service import Service
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.logger.info("Selenium WebDriver initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Selenium: {e}")
            self.use_selenium = False
    
    def collect_jra_odds(self, race_id: str) -> Dict:
        """JRAオッズの収集"""
        if self.use_selenium and self.driver:
            return self._collect_jra_odds_selenium(race_id)
        else:
            return self._collect_jra_odds_api(race_id)
    
    def _collect_jra_odds_api(self, race_id: str) -> Dict:
        """API経由でのJRAオッズ取得"""
        # JRAのオッズAPIエンドポイント（実際のAPIは認証が必要な場合があります）
        api_url = f"https://www.jra.go.jp/JRADB/odds/api/odds.html"
        params = {
            'kaisai_date': race_id[:8],  # 開催日
            'kaisai_no': race_id[8:10],  # 開催回数
            'nichiji': race_id[10:12],   # 日次
            'race_no': race_id[12:14]    # レース番号
        }
        
        response = self.get_page(api_url, params)
        if not response:
            return {}
        
        try:
            # JSONレスポンスの場合
            odds_data = response.json()
            return self._process_odds_data(odds_data, race_id)
        except json.JSONDecodeError:
            # HTMLレスポンスの場合
            return self._parse_odds_html(response.text, race_id)
    
    def _collect_jra_odds_selenium(self, race_id: str) -> Dict:
        """Selenium経由でのオッズ取得"""
        try:
            odds_url = f"https://www.jra.go.jp/JRADB/odds/odds_win.html"
            self.driver.get(odds_url)
            
            # レース選択のためのフォーム操作
            race_date = race_id[:8]
            self.driver.find_element(By.NAME, "kaisai_date").send_keys(race_date)
            
            # オッズテーブルの待機
            wait = WebDriverWait(self.driver, 10)
            odds_table = wait.until(
                EC.presence_of_element_located((By.CLASS_NAME, "odds_table"))
            )
            
            # テーブルデータの抽出
            rows = odds_table.find_elements(By.TAG_NAME, "tr")
            odds_data = {}
            
            for row in rows[1:]:  # ヘッダー除外
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) >= 3:
                    horse_number = cells[0].text.strip()
                    horse_name = cells[1].text.strip()
                    odds = cells[2].text.strip()
                    
                    odds_data[horse_number] = {
                        'horse_name': horse_name,
                        'win_odds': self.parse_odds(odds),
                        'timestamp': datetime.now().isoformat()
                    }
            
            return {
                'race_id': race_id,
                'odds_type': 'win',
                'data': odds_data,
                'updated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Selenium odds collection failed: {e}")
            return {}
    
    def collect_yahoo_odds(self, race_url: str) -> Dict:
        """Yahoo競馬からのオッズ収集"""
        response = self.get_page(race_url)
        if not response:
            return {}
        
        soup = self.parse_html(response.text)
        odds_data = {}
        
        # Yahoo競馬のオッズテーブル解析
        odds_table = soup.find('table', class_='RaceOdds')
        if not odds_table:
            return {}
        
        rows = odds_table.find_all('tr')
        for row in rows[1:]:  # ヘッダー除外
            cells = row.find_all('td')
            if len(cells) >= 4:
                horse_number = self.clean_text(cells[0].get_text())
                horse_name = self.clean_text(cells[1].get_text())
                win_odds = self.clean_text(cells[2].get_text())
                popularity = self.clean_text(cells[3].get_text())
                
                odds_data[horse_number] = {
                    'horse_name': horse_name,
                    'win_odds': self.parse_odds(win_odds),
                    'popularity': self.extract_number(popularity),
                    'timestamp': datetime.now().isoformat()
                }
        
        return {
            'source': 'yahoo',
            'race_url': race_url,
            'odds_type': 'win',
            'data': odds_data,
            'updated_at': datetime.now().isoformat()
        }
    
    def collect_exacta_odds(self, race_id: str) -> Dict:
        """馬連オッズの収集"""
        # 実装は単勝オッズと同様ですが、組み合わせデータを扱います
        api_url = f"https://www.jra.go.jp/JRADB/odds/odds_uma.html"
        params = {'race_id': race_id}
        
        response = self.get_page(api_url, params)
        if not response:
            return {}
        
        soup = self.parse_html(response.text)
        exacta_odds = {}
        
        # 馬連オッズテーブルの解析（実装の詳細は省略）
        odds_table = soup.find('table', id='exacta_odds_table')
        if odds_table:
            # 組み合わせオッズの抽出処理
            pass
        
        return exacta_odds
    
    def parse_odds(self, odds_str: str) -> Optional[float]:
        """オッズ文字列の解析"""
        try:
            # 数値以外の文字を除去
            clean_odds = re.sub(r'[^\d.]', '', odds_str)
            return float(clean_odds) if clean_odds else None
        except ValueError:
            return None
    
    def _process_odds_data(self, raw_data: Dict, race_id: str) -> Dict:
        """生オッズデータの処理"""
        processed = {
            'race_id': race_id,
            'updated_at': datetime.now().isoformat(),
            'horses': {}
        }
        
        # データ構造に応じた処理
        if 'odds_list' in raw_data:
            for odds_item in raw_data['odds_list']:
                horse_num = str(odds_item.get('horse_number', ''))
                processed['horses'][horse_num] = {
                    'win_odds': odds_item.get('win_odds'),
                    'place_odds_min': odds_item.get('place_odds_min'),
                    'place_odds_max': odds_item.get('place_odds_max'),
                    'popularity': odds_item.get('popularity')
                }
        
        return processed
    
    def _parse_odds_html(self, html: str, race_id: str) -> Dict:
        """HTMLからのオッズ解析"""
        soup = self.parse_html(html)
        odds_data = {'race_id': race_id, 'horses': {}}
        
        # オッズテーブルの検索と解析
        odds_tables = soup.find_all('table', class_=['odds', 'nk_tb_common'])
        
        for table in odds_tables:
            rows = table.find_all('tr')
            for row in rows[1:]:  # ヘッダー除外
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 3:
                    horse_num = self.extract_number(cells[0].get_text())
                    if horse_num:
                        odds_data['horses'][str(horse_num)] = {
                            'win_odds': self.parse_odds(cells[2].get_text()),
                            'updated_at': datetime.now().isoformat()
                        }
        
        return odds_data
    
    def collect_data(self, data_type: str = 'win', **kwargs) -> List[Dict]:
        """メインの収集メソッド"""
        race_id = kwargs.get('race_id')
        race_url = kwargs.get('race_url')
        
        if data_type == 'win' and race_id:
            odds_data = self.collect_jra_odds(race_id)
            return [odds_data] if odds_data else []
        elif data_type == 'yahoo' and race_url:
            odds_data = self.collect_yahoo_odds(race_url)
            return [odds_data] if odds_data else []
        elif data_type == 'exacta' and race_id:
            odds_data = self.collect_exacta_odds(race_id)
            return [odds_data] if odds_data else []
        else:
            self.logger.error(f"Invalid parameters for data type: {data_type}")
            return []
    
    def __del__(self):
        """デストラクタでWebDriverをクリーンアップ"""
        if self.driver:
            self.driver.quit()
```

## 7. データ処理と保存

### 7.1 データクリーナー（processors/data_cleaner.py）

```python
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging

class DataCleaner:
    """収集データのクリーニングと正規化"""
    
    def __init__(self):
        self.logger = logging.getLogger('data_cleaner')
    
    def clean_race_data(self, race_data: List[Dict]) -> List[Dict]:
        """レースデータのクリーニング"""
        cleaned_data = []
        
        for race in race_data:
            try:
                cleaned_race = {
                    'race_id': self._generate_race_id(race),
                    'race_name': self._normalize_text(race.get('race_name', '')),
                    'race_date': self._parse_date(race.get('date')),
                    'track': self._normalize_track_name(race.get('track', '')),
                    'distance': self._validate_distance(race.get('distance')),
                    'track_condition': self._normalize_track_condition(race.get('track_condition', '')),
                    'weather': self._normalize_weather(race.get('weather', '')),
                    'grade': self._normalize_grade(race.get('grade', '')),
                    'start_time': self._parse_time(race.get('start_time')),
                    'horse_count': race.get('horse_count', 0),
                    'created_at': datetime.now(),
                    'updated_at': datetime.now()
                }
                cleaned_data.append(cleaned_race)
                
            except Exception as e:
                self.logger.warning(f"Error cleaning race data: {e}")
                continue
        
        return cleaned_data
    
    def clean_horse_data(self, horse_data: List[Dict]) -> List[Dict]:
        """馬データのクリーニング"""
        cleaned_data = []
        
        for horse in horse_data:
            try:
                cleaned_horse = {
                    'horse_id': self._normalize_id(horse.get('horse_id')),
                    'horse_name': self._normalize_text(horse.get('horse_name', '')),
                    'age': self._validate_age(horse.get('age')),
                    'gender': self._normalize_gender(horse.get('gender', '')),
                    'color': self._normalize_text(horse.get('color', '')),
                    'trainer': self._normalize_text(horse.get('trainer', '')),
                    'owner': self._normalize_text(horse.get('owner', '')),
                    'breeder': self._normalize_text(horse.get('breeder', '')),
                    'birth_date': self._parse_date(horse.get('birth_date')),
                    'created_at': datetime.now(),
                    'updated_at': datetime.now()
                }
                
                # 統計情報のクリーニング
                if 'win_rate' in horse:
                    cleaned_horse['win_rate'] = self._validate_rate(horse['win_rate'])
                if 'place_rate' in horse:
                    cleaned_horse['place_rate'] = self._validate_rate(horse['place_rate'])
                
                cleaned_data.append(cleaned_horse)
                
            except Exception as e:
                self.logger.warning(f"Error cleaning horse data: {e}")
                continue
        
        return cleaned_data
    
    def clean_performance_data(self, performance_data: List[Dict]) -> List[Dict]:
        """成績データのクリーニング"""
        cleaned_data = []
        
        for performance in performance_data:
            try:
                cleaned_performance = {
                    'horse_id': self._normalize_id(performance.get('horse_id')),
                    'race_id': self._normalize_id(performance.get('race_id')),
                    'race_date': self._parse_date(performance.get('race_date')),
                    'track': self._normalize_track_name(performance.get('track', '')),
                    'distance': self._validate_distance(performance.get('distance')),
                    'track_condition': self._normalize_track_condition(performance.get('track_condition', '')),
                    'weather': self._normalize_weather(performance.get('weather', '')),
                    'gate_number': self._validate_gate_number(performance.get('gate_number')),
                    'horse_number': self._validate_horse_number(performance.get('horse_number')),
                    'finish_position': self._validate_finish_position(performance.get('finish_position')),
                    'jockey': self._normalize_text(performance.get('jockey', '')),
                    'weight': self._validate_weight(performance.get('weight')),
                    'odds': self._validate_odds(performance.get('odds')),
                    'popularity': self._validate_popularity(performance.get('popularity')),
                    'time': self._normalize_time(performance.get('time')),
                    'horses_count': performance.get('horses_count', 0),
                    'prize_money': self._validate_prize_money(performance.get('prize_money')),
                    'created_at': datetime.now()
                }
                cleaned_data.append(cleaned_performance)
                
            except Exception as e:
                self.logger.warning(f"Error cleaning performance data: {e}")
                continue
        
        return cleaned_data
    
    def clean_odds_data(self, odds_data: Dict) -> Dict:
        """オッズデータのクリーニング"""
        try:
            cleaned_odds = {
                'race_id': self._normalize_id(odds_data.get('race_id')),
                'source': odds_data.get('source', 'unknown'),
                'odds_type': odds_data.get('odds_type', 'win'),
                'updated_at': self._parse_datetime(odds_data.get('updated_at')),
                'horses': {}
            }
            
            # 各馬のオッズをクリーニング
            horses_odds = odds_data.get('data', {})
            for horse_num, horse_odds in horses_odds.items():
                cleaned_horse_odds = {
                    'horse_number': self._validate_horse_number(horse_num),
                    'horse_name': self._normalize_text(horse_odds.get('horse_name', '')),
                    'win_odds': self._validate_odds(horse_odds.get('win_odds')),
                    'place_odds_min': self._validate_odds(horse_odds.get('place_odds_min')),
                    'place_odds_max': self._validate_odds(horse_odds.get('place_odds_max')),
                    'popularity': self._validate_popularity(horse_odds.get('popularity')),
                    'timestamp': self._parse_datetime(horse_odds.get('timestamp'))
                }
                cleaned_odds['horses'][str(horse_num)] = cleaned_horse_odds
            
            return cleaned_odds
            
        except Exception as e:
            self.logger.error(f"Error cleaning odds data: {e}")
            return {}
    
    def _normalize_text(self, text: Any) -> str:
        """テキストの正規化"""
        if not text:
            return ""
        
        text_str = str(text).strip()
        # 全角・半角の統一
        text_str = text_str.replace('　', ' ')  # 全角スペースを半角に
        # 不要な文字の除去
        text_str = ''.join(char for char in text_str if ord(char) < 65536)  # サロゲートペア文字を除去
        
        return text_str[:100]  # 長さ制限
    
    def _normalize_id(self, id_value: Any) -> Optional[str]:
        """IDの正規化"""
        if not id_value:
            return None
        
        id_str = str(id_value).strip()
        # 数値のみの場合は0埋めで統一
        if id_str.isdigit():
            return id_str.zfill(10)
        
        return id_str
    
    def _parse_date(self, date_value: Any) -> Optional[datetime]:
        """日付の解析"""
        if not date_value:
            return None
        
        if isinstance(date_value, datetime):
            return date_value.date()
        
        if isinstance(date_value, str):
            # 複数の日付フォーマットに対応
            date_formats = [
                '%Y-%m-%d',
                '%Y/%m/%d', 
                '%Y年%m月%d日',
                '%m/%d/%Y',
                '%d/%m/%Y'
            ]
            
            for fmt in date_formats:
                try:
                    return datetime.strptime(date_value.strip(), fmt).date()
                except ValueError:
                    continue
        
        return None
    
    def _parse_datetime(self, datetime_value: Any) -> Optional[datetime]:
        """日時の解析"""
        if not datetime_value:
            return datetime.now()
        
        if isinstance(datetime_value, datetime):
            return datetime_value
        
        if isinstance(datetime_value, str):
            try:
                return datetime.fromisoformat(datetime_value.replace('Z', '+00:00'))
            except ValueError:
                return datetime.now()
        
        return datetime.now()
    
    def _parse_time(self, time_value: Any) -> Optional[str]:
        """時刻の解析"""
        if not time_value:
            return None
        
        time_str = str(time_value).strip()
        # HH:MM形式に正規化
        if ':' in time_str:
            return time_str[:5]  # HH:MM部分のみ
        
        return time_str
    
    def _validate_distance(self, distance: Any) -> Optional[int]:
        """距離の検証"""
        if not distance:
            return None
        
        try:
            dist = int(distance)
            # 競馬の一般的な距離範囲での検証
            if 800 <= dist <= 4000:
                return dist
        except (ValueError, TypeError):
            pass
        
        return None
    
    def _validate_age(self, age: Any) -> Optional[int]:
        """年齢の検証"""
        if not age:
            return None
        
        try:
            age_int = int(age)
            if 1 <= age_int <= 15:  # 競走馬の一般的な年齢範囲
                return age_int
        except (ValueError, TypeError):
            pass
        
        return None
    
    def _validate_odds(self, odds: Any) -> Optional[float]:
        """オッズの検証"""
        if not odds:
            return None
        
        try:
            odds_float = float(odds)
            if 1.0 <= odds_float <= 9999.9:
                return round(odds_float, 1)
        except (ValueError, TypeError):
            pass
        
        return None
    
    def _validate_rate(self, rate: Any) -> Optional[float]:
        """勝率等の検証"""
        if not rate:
            return None
        
        try:
            rate_float = float(rate)
            if 0.0 <= rate_float <= 1.0:
                return round(rate_float, 3)
        except (ValueError, TypeError):
            pass
        
        return None
    
    def _normalize_track_name(self, track: str) -> str:
        """競馬場名の正規化"""
        track_mapping = {
            '東京': '東京', '中山': '中山', '京都': '京都', '阪神': '阪神',
            '中京': '中京', '新潟': '新潟', '福島': '福島', '小倉': '小倉',
            '札幌': '札幌', '函館': '函館'
        }
        
        normalized = self._normalize_text(track)
        return track_mapping.get(normalized, normalized)
    
    def _normalize_track_condition(self, condition: str) -> str:
        """馬場状態の正規化"""
        condition_mapping = {
            '良': '良', '稍重': '稍重', '重': '重', '不良': '不良',
            'fast': '良', 'good': '稍重', 'yielding': '重', 'soft': '不良'
        }
        
        normalized = self._normalize_text(condition)
        return condition_mapping.get(normalized, '良')
    
    def _normalize_weather(self, weather: str) -> str:
        """天気の正規化"""
        weather_mapping = {
            '晴': '晴', '曇': '曇', '雨': '雨', '小雨': '小雨', '雪': '雪'
        }
        
        normalized = self._normalize_text(weather)
        return weather_mapping.get(normalized, '晴')
    
    def _normalize_gender(self, gender: str) -> str:
        """性別の正規化"""
        gender_mapping = {
            '牡': '牡', '牝': '牝', '騸': '騸',
            'male': '牡', 'female': '牝', 'gelding': '騸'
        }
        
        normalized = self._normalize_text(gender)
        return gender_mapping.get(normalized, '牡')
    
    def _normalize_grade(self, grade: str) -> str:
        """グレードの正規化"""
        grade_mapping = {
            'G1': 'G1', 'G2': 'G2', 'G3': 'G3', 
            'L': 'L', 'OP': 'OP', 'Listed': 'L'
        }
        
        normalized = self._normalize_text(grade).upper()
        return grade_mapping.get(normalized, 'その他')
    
    def _generate_race_id(self, race_data: Dict) -> str:
        """レースIDの生成"""
        date = race_data.get('date', datetime.now())
        track = race_data.get('track', 'XX')
        race_number = race_data.get('race_number', 0)
        
        if isinstance(date, str):
            date = self._parse_date(date) or datetime.now().date()
        elif isinstance(date, datetime):
            date = date.date()
        
        return f"{date.strftime('%Y%m%d')}{track[:2]}{race_number:02d}"
```

## 8. スケジューラーの実装

### 8.1 タスクスケジューラー（scheduler/task_scheduler.py）

```python
import schedule
import time
import threading
import logging
from datetime import datetime, timedelta
from typing import Dict, List
from collectors.jra_collector import JRACollector
from collectors.netkeiba_collector import NetKeibaCollector
from collectors.odds_collector import OddsCollector
from processors.data_cleaner import DataCleaner
from storage.database_manager import DatabaseManager

class TaskScheduler:
    """データ収集タスクのスケジューラー"""
    
    def __init__(self):
        self.logger = logging.getLogger('scheduler')
        self.running = False
        
        # コレクターの初期化
        self.jra_collector = JRACollector()
        self.netkeiba_collector = NetKeibaCollector()
        self.odds_collector = OddsCollector()
        
        # プロセッサーとストレージの初期化
        self.data_cleaner = DataCleaner()
        self.db_manager = DatabaseManager()
        
        self.setup_schedules()
    
    def setup_schedules(self):
        """スケジュールの設定"""
        # 毎日午前8時：レーススケジュール取得
        schedule.every().day.at("08:00").do(self.collect_daily_races)
        
        # 毎日午前9時：馬の基本情報更新
        schedule.every().day.at("09:00").do(self.update_horse_database)
        
        # 5分毎：オッズ更新（レース開催日のみ）
        schedule.every(5).minutes.do(self.update_live_odds)
        
        # 毎日午後6時：レース結果収集
        schedule.every().day.at("18:00").do(self.collect_race_results)
        
        # 週1回：パフォーマンス履歴更新
        schedule.every().monday.at("02:00").do(self.update_performance_history)
        
        # 月1回：データベースメンテナンス
        schedule.every().month.do(self.database_maintenance)
        
        self.logger.info("Scheduler setup completed")
    
    def collect_daily_races(self):
        """日次レース情報の収集"""
        try:
            self.logger.info("Starting daily race collection")
            
            # 今日と明日のレース情報を取得
            today = datetime.now()
            tomorrow = today + timedelta(days=1)
            
            for target_date in [today, tomorrow]:
                race_data = self.jra_collector.collect_race_schedule(target_date)
                
                if race_data:
                    # データクリーニング
                    cleaned_data = self.data_cleaner.clean_race_data(race_data)
                    
                    # データベースに保存
                    self.db_manager.save_races(cleaned_data)
                    
                    self.logger.info(f"Collected {len(cleaned_data)} races for {target_date.date()}")
                
                # 各レースの出馬表も収集
                for race in race_data:
                    self._collect_race_entries(race.get('race_id'))
            
            self.logger.info("Daily race collection completed")
            
        except Exception as e:
            self.logger.error(f"Error in daily race collection: {e}")
    
    def update_live_odds(self):
        """リアルタイムオッズ更新"""
        try:
            # 今日開催のレースのみ対象
            today_races = self.db_manager.get_today_races()
            
            if not today_races:
                return
            
            self.logger.info(f"Updating odds for {len(today_races)} races")
            
            for race in today_races:
                race_id = race['race_id']
                
                # JRAオッズ取得
                jra_odds = self.odds_collector.collect_jra_odds(race_id)
                if jra_odds:
                    cleaned_odds = self.data_cleaner.clean_odds_data(jra_odds)
                    self.db_manager.save_odds(cleaned_odds)
                
                # レート制限対応
                time.sleep(2)
            
        except Exception as e:
            self.logger.error(f"Error updating live odds: {e}")
    
    def collect_race_results(self):
        """レース結果の収集"""
        try:
            self.logger.info("Starting race results collection")
            
            # 今日のレース結果を取得
            today_races = self.db_manager.get_today_races()
            
            for race in today_races:
                race_id = race['race_id']
                
                # 結果データ取得
                results = self.jra_collector.collect_race_results(race_id)
                
                if results:
                    # データクリーニング
                    cleaned_results = self.data_cleaner.clean_performance_data(results)
                    
                    # データベースに保存
                    self.db_manager.save_race_results(cleaned_results)
                    
                    self.logger.info(f"Saved results for race {race_id}")
                
                time.sleep(1)  # レート制限
            
            self.logger.info("Race results collection completed")
            
        except Exception as e:
            self.logger.error(f"Error collecting race results: {e}")
    
    def update_horse_database(self):
        """馬データベースの更新"""
        try:
            self.logger.info("Starting horse database update")
            
            # 新しい馬の情報を収集
            recent_horses = self.db_manager.get_recent_horses(days=30)
            
            for horse in recent_horses:
                horse_id = horse['horse_id']
                
                # NetKeibaから詳細情報を取得
                horse_details = self.netkeiba_collector.collect_data('performance', horse_id=horse_id)
                
                if horse_details:
                    cleaned_data = self.data_cleaner.clean_performance_data(horse_details)
                    self.db_manager.update_horse_performance(horse_id, cleaned_data)
                
                # 血統情報も更新
                pedigree_data = self.netkeiba_collector.collect_data('pedigree', horse_id=horse_id)
                if pedigree_data:
                    self.db_manager.save_pedigree_data(pedigree_data)
                
                time.sleep(2)  # レート制限
            
            self.logger.info("Horse database update completed")
            
        except Exception as e:
            self.logger.error(f"Error updating horse database: {e}")
    
    def update_performance_history(self):
        """パフォーマンス履歴の更新"""
        try:
            self.logger.info("Starting performance history update")
            
            # 全馬の統計情報を再計算
            horses = self.db_manager.get_all_horses()
            
            for horse in horses:
                horse_id = horse['horse_id']
                
                # 統計情報の計算
                stats = self.calculate_horse_statistics(horse_id)
                
                # データベース更新
                self.db_manager.update_horse_statistics(horse_id, stats)
            
            self.logger.info("Performance history update completed")
            
        except Exception as e:
            self.logger.error(f"Error updating performance history: {e}")
    
    def calculate_horse_statistics(self, horse_id: str) -> Dict:
        """馬の統計情報計算"""
        performances = self.db_manager.get_horse_performances(horse_id)
        
        if not performances:
            return {}
        
        total_races = len(performances)
        wins = len([p for p in performances if p['finish_position'] == 1])
        places = len([p for p in performances if p['finish_position'] <= 3])
        
        recent_performances = performances[:5]  # 最近5戦
        recent_avg_position = sum(p['finish_position'] for p in recent_performances) / len(recent_performances)
        
        return {
            'total_races': total_races,
            'wins': wins,
            'places': places,
            'win_rate': wins / total_races if total_races > 0 else 0,
            'place_rate': places / total_races if total_races > 0 else 0,
            'recent_avg_position': recent_avg_position,
            'updated_at': datetime.now()
        }
    
    def database_maintenance(self):
        """データベースメンテナンス"""
        try:
            self.logger.info("Starting database maintenance")
            
            # 古いオッズデータの削除（30日以上前）
            cutoff_date = datetime.now() - timedelta(days=30)
            self.db_manager.cleanup_old_odds(cutoff_date)
            
            # インデックスの再構築
            self.db_manager.rebuild_indexes()
            
            # 統計情報の更新
            self.db_manager.update_table_statistics()
            
            self.logger.info("Database maintenance completed")
            
        except Exception as e:
            self.logger.error(f"Error in database maintenance: {e}")
    
    def _collect_race_entries(self, race_id: str):
        """レース出馬表の収集"""
        try:
            entries = self.jra_collector.collect_race_entries(race_id)
            if entries:
                cleaned_entries = self.data_cleaner.clean_race_entries(entries)
                self.db_manager.save_race_entries(cleaned_entries)
        except Exception as e:
            self.logger.warning(f"Error collecting entries for race {race_id}: {e}")
    
    def start(self):
        """スケジューラーの開始"""
        self.running = True
        self.logger.info("Scheduler started")
        
        def run_scheduler():
            while self.running:
                schedule.run_pending()
                time.sleep(30)  # 30秒間隔でチェック
        
        scheduler_thread = threading.Thread(target=run_scheduler)
        scheduler_thread.daemon = True
        scheduler_thread.start()
    
    def stop(self):
        """スケジューラーの停止"""
        self.running = False
        self.logger.info("Scheduler stopped")
    
    def run_task_immediately(self, task_name: str):
        """指定タスクの即座実行"""
        task_methods = {
            'daily_races': self.collect_daily_races,
            'live_odds': self.update_live_odds,
            'race_results': self.collect_race_results,
            'horse_update': self.update_horse_database,
            'performance_history': self.update_performance_history,
            'maintenance': self.database_maintenance
        }
        
        if task_name in task_methods:
            self.logger.info(f"Running task immediately: {task_name}")
            task_methods[task_name]()
        else:
            self.logger.error(f"Unknown task: {task_name}")
```

## 9. デプロイメントと監視

### 9.1 Docker設定

```dockerfile
FROM python:3.9-slim

# システムの依存関係をインストール
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Chrome のインストール（Selenium用）
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
RUN apt-get update && apt-get install -y google-chrome-stable

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# ログディレクトリの作成
RUN mkdir -p logs

ENV PYTHONPATH=/app

CMD ["python", "main.py"]
```

### 9.2 docker-compose.yml

```yaml
version: '3.8'

services:
  collector:
    build: .
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/horse_data
      - REDIS_URL=redis://redis:6379/0
      - LOG_LEVEL=INFO
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    restart: unless-stopped

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=horse_data
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db_init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - collector

volumes:
  postgres_data:
  redis_data:
```

### 9.3 監視とアラート設定

```python
# monitoring/monitor.py
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Dict, List

class SystemMonitor:
    """システム監視とアラート"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.logger = logging.getLogger('monitor')
        
    def check_data_freshness(self) -> bool:
        """データの新鮮度チェック"""
        try:
            from storage.database_manager import DatabaseManager
            db = DatabaseManager()
            
            # 最新のレースデータをチェック
            latest_race = db.get_latest_race()
            if not latest_race:
                self.send_alert("No race data found", "Database appears to be empty")
                return False
            
            # 1日以上古い場合はアラート
            if latest_race['created_at'] < datetime.now() - timedelta(days=1):
                self.send_alert("Stale race data", f"Latest race: {latest_race['created_at']}")
                return False
            
            return True
            
        except Exception as e:
            self.send_alert("Data freshness check failed", str(e))
            return False
    
    def check_collector_status(self) -> Dict[str, bool]:
        """コレクターの状態チェック"""
        status = {}
        
        # ログファイルから各コレクターの動作状況をチェック
        log_patterns = {
            'jra': 'JRA collector completed',
            'netkeiba': 'NetKeiba collection completed',
            'odds': 'Odds update completed'
        }
        
        for collector, pattern in log_patterns.items():
            status[collector] = self._check_log_pattern(pattern, hours=1)
            
            if not status[collector]:
                self.send_alert(
                    f"{collector} collector inactive",
                    f"No activity detected in the last hour"
                )
        
        return status
    
    def _check_log_pattern(self, pattern: str, hours: int = 1) -> bool:
        """ログファイルでパターンを検索"""
        try:
            with open('logs/horse_collector.log', 'r') as f:
                lines = f.readlines()
                
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            for line in reversed(lines[-1000:]):  # 最新1000行をチェック
                if pattern in line:
                    # タイムスタンプを抽出してチェック
                    timestamp_str = line.split()[0] + ' ' + line.split()[1]
                    try:
                        log_time = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
                        if log_time > cutoff_time:
                            return True
                    except ValueError:
                        continue
            
            return False
            
        except Exception:
            return False
    
    def send_alert(self, subject: str, message: str):
        """アラートメールの送信"""
        try:
            smtp_config = self.config.get('smtp', {})
            
            msg = MIMEMultipart()
            msg['From'] = smtp_config.get('from_email')
            msg['To'] = ', '.join(smtp_config.get('to_emails', []))
            msg['Subject'] = f"[Horse Data Collector Alert] {subject}"
            
            body = f"""
            Alert Time: {datetime.now()}
            Subject: {subject}
            
            Details:
            {message}
            
            Please check the system and logs for more information.
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(smtp_config.get('server'), smtp_config.get('port', 587)) as server:
                if smtp_config.get('use_tls', True):
                    server.starttls()
                
                server.login(smtp_config.get('username'), smtp_config.get('password'))
                server.send_message(msg)
            
            self.logger.info(f"Alert sent: {subject}")
            
        except Exception as e:
            self.logger.error(f"Failed to send alert: {e}")
```

## まとめ

本記事では、Python を使用した競馬データの自動収集システムの包括的な実装方法を解説しました。主要なポイントは以下の通りです：

1. **アーキテクチャ設計**: 拡張性とメンテナンス性を考慮したモジュラー設計
2. **多様なデータソース**: JRA、NetKeiba等の異なるソースからの効率的なデータ収集
3. **リアルタイム対応**: オッズやレース結果のタイムリーな更新機能
4. **データクリーニング**: 収集データの正規化と品質保証
5. **自動化**: スケジューラーによる無人運用
6. **監視体制**: システムの健全性チェックとアラート機能
7. **スケーラビリティ**: Docker化による容易なデプロイと運用

このシステムを基盤として、さらに高度な分析や予想システムを構築することが可能です。継続的なデータ収集により、精度の高い競馬分析とより良い意思決定支援を実現できるでしょう。

データ収集においては、常に利用規約の遵守とアクセス頻度の適切な制御を心がけ、持続可能なシステム運用を行うことが重要です。