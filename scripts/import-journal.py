"""Build a local journal archive from the public Tilda export and rubric review."""
import argparse
import csv
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup

LEGACY_RUBRICS = json.loads((Path(__file__).resolve().parents[1] / 'src/app/journal/legacy-rubrics.json').read_text(encoding='utf-8'))

TOPICS = {
    'Технологии': 'technology', 'Ипотека': 'mortgage', 'Законодательство': 'law',
    'Идеи': 'idea', 'Загородная жизнь': 'lifestile', 'О компании': 'company',
    'Обзоры': 'reviews', 'Отзывы': 'testimonials',
}
VALID_TAGS = {'p', 'br', 'div', 'span', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i',
              'ul', 'ol', 'li', 'blockquote', 'figure', 'figcaption', 'img', 'a',
              'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr'}


def safe_url(value, base=''):
    url = urljoin(base, value or '')
    parsed = urlsplit(url)
    return url if parsed.scheme == 'https' and parsed.hostname and not parsed.username and not parsed.password else ''


def normalize_article_tables(soup):
    for table in soup.find_all('table'):
        if 'journal-table-scroll' in table.parent.get('class', []):
            continue
        rows = [row for row in table.find_all('tr') if row.find_parent('table') is table]
        if not rows:
            continue
        cells = [row.find_all(['td', 'th'], recursive=False) for row in rows]
        headings = [cell.get_text(' ', strip=True).casefold() for cell in cells[0]]
        if headings == ['вопрос', 'ответ'] and len(cells) > 1 and all(len(row) == 2 for row in cells):
            faq = soup.new_tag('dl', attrs={'class': 'journal-faq'})
            for question, answer in cells[1:]:
                pair = soup.new_tag('div')
                term = soup.new_tag('dt')
                term.string = question.get_text(' ', strip=True)
                description = soup.new_tag('dd')
                for content in list(answer.contents):
                    description.append(content.extract())
                pair.append(term)
                pair.append(description)
                faq.append(pair)
            table.replace_with(faq)
            continue

        if table.thead is None and cells[0]:
            head = soup.new_tag('thead')
            for cell in cells[0]:
                cell.name = 'th'
                cell['scope'] = 'col'
            head.append(rows[0].extract())
            table.insert(0, head)
        table['class'] = ['journal-comparison']
        if len(cells[0]) > 3:
            table['class'].append('journal-comparison-wide')
        table.wrap(soup.new_tag('div', attrs={
            'class': 'journal-table-scroll', 'role': 'region',
            'aria-label': 'Таблица статьи', 'tabindex': '0',
        }))


def sanitize(source, base):
    soup = BeautifulSoup(source, 'html.parser')
    for tag in soup.find_all(['script', 'style', 'iframe', 'object', 'embed', 'template']):
        tag.decompose()
    for tag in list(soup.find_all(True)):
        if tag.name not in VALID_TAGS:
            tag.unwrap()
            continue
        attrs = {}
        if tag.name == 'img':
            src = safe_url(tag.get('data-original') or tag.get('src'), base)
            if not src:
                tag.decompose()
                continue
            attrs = {'src': src, 'alt': tag.get('alt', ''), 'loading': 'lazy'}
        if tag.name == 'a':
            href = safe_url(tag.get('href'), base)
            if not href:
                tag.unwrap()
                continue
            attrs = {'href': href}
        tag.attrs = attrs
    body_text = soup.get_text(' ', strip=True)
    normalize_article_tables(soup)
    return str(soup), body_text


def classify(title, rubric, slug):
    title = title.lower()
    if re.search(r'отзыв|клиенты о |владельцы о |разговор с заказчик|рассказ заказчик', title):
        return 'testimonials'
    if re.search(r'обзор|внутри норвегии|визуальный тур|прогулка по дому', title):
        return 'reviews'
    return TOPICS.get(rubric) or LEGACY_RUBRICS.get(slug, '')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_dir', type=Path, nargs='?')
    parser.add_argument('--normalize-existing', action='store_true', help='Update table and FAQ markup in an existing archive')
    parser.add_argument('--database', type=Path, default=Path('.local/journal.sqlite'))
    args = parser.parse_args()
    if args.normalize_existing:
        if not args.database.is_file():
            parser.error('the archive database does not exist')
        with sqlite3.connect(args.database) as db:
            rows = db.execute("SELECT slug, body_html FROM journal_posts WHERE body_html LIKE '%<table%'").fetchall()
            updates = []
            for slug, body in rows:
                soup = BeautifulSoup(body, 'html.parser')
                normalize_article_tables(soup)
                normalized = str(soup)
                if normalized != body:
                    updates.append((normalized, slug))
            db.executemany('UPDATE journal_posts SET body_html = ? WHERE slug = ?', updates)
        print(f'{len(updates)} posts updated')
        return
    if args.source_dir is None:
        parser.error('source_dir or --normalize-existing is required')
    source = json.loads((args.source_dir / 'tilda-journal-source.json').read_text(encoding='utf-8-sig'))
    by_url = {record['old_url']: record for record in source}
    with (args.source_dir / 'journal-rubrics-draft.csv').open(encoding='utf-8-sig', newline='') as file:
        review = list(csv.DictReader(file))
    args.database.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(args.database) as db:
        db.executescript("""
            PRAGMA foreign_keys=ON;
            CREATE TABLE IF NOT EXISTS journal_posts (
                slug TEXT PRIMARY KEY, topic TEXT NOT NULL, format TEXT NOT NULL,
                title TEXT NOT NULL, description TEXT NOT NULL, published_at TEXT NOT NULL,
                cover TEXT NOT NULL, body_html TEXT NOT NULL, body_text TEXT NOT NULL,
                video_url TEXT NOT NULL, tags TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS journal_posts_topic_date ON journal_posts(topic, published_at DESC);
            CREATE TABLE IF NOT EXISTS journal_source_urls (
                source_url TEXT PRIMARY KEY, slug TEXT NOT NULL REFERENCES journal_posts(slug)
            );
        """)
        count = 0
        for item in review:
            if item['format'] == 'Контент проекта':
                continue
            urls = [url for key in ('nn_urls', 'msk_urls') for url in item[key].split(' | ') if url]
            versions = [by_url[url] for url in urls]
            record = max(versions, key=lambda row: (row['body_chars'], bool(row.get('cover'))))
            timestamp = min(datetime.fromisoformat(row['published_at']) for row in versions if row.get('published_at'))
            published_at = timestamp.astimezone(timezone.utc).isoformat()
            base = record['old_url']
            path = urlsplit(base).path.rsplit('/', 1)[-1]
            slug = re.sub(r'^[a-z0-9]{10}-', '', path)
            slug = re.sub(r'[^a-z0-9-]+', '-', slug.lower()).strip('-') or record['uid']
            existing = db.execute('SELECT slug FROM journal_source_urls WHERE source_url = ?', (base,)).fetchone()
            if existing:
                slug = existing[0]
            elif db.execute('SELECT 1 FROM journal_posts WHERE slug = ?', (slug,)).fetchone():
                slug = f"{slug}-{record['uid']}"
            title = record['title']
            body, body_text = sanitize(record['source_body_html'], base)
            description = BeautifulSoup(record.get('source_description', ''), 'html.parser').get_text(' ', strip=True)
            cover = safe_url(record.get('cover'), base) if record.get('cover') else ''
            if not cover and record['media_type'] == 'image':
                cover = safe_url(record['media_data'], base)
            video_url = safe_url(record['media_data'], base) if record['media_type'] == 'video' else ''
            topic = 'testimonials' if item['format'] == 'Отзыв' else classify(title, item['proposed_section'], slug)
            tags = [tag for tag in item['proposed_tags'].split(' | ') if tag]
            if item['proposed_section'] == 'О компании':
                tags.append('О компании')
            db.execute("""
                INSERT INTO journal_posts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(slug) DO NOTHING
            """, (slug, topic, 'video' if item['format'] == 'Видео' else 'article', title, description,
                  published_at, cover, body, body_text, video_url, json.dumps(tags, ensure_ascii=False)))
            db.executemany('INSERT OR IGNORE INTO journal_source_urls VALUES (?, ?)', [(url, slug) for url in urls])
            count += 1
        print(f'{count} source groups | {db.execute("SELECT COUNT(*) FROM journal_posts").fetchone()[0]} posts | '
              f'{db.execute("SELECT COUNT(*) FROM journal_source_urls").fetchone()[0]} source URLs')


if __name__ == '__main__':
    main()
