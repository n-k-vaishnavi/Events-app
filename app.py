import os
import re
import html
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def strip_tags(html_content):
    """
    Strips HTML tags to extract clean plain text for drafting tweets.
    """
    # Replace block tags with space/newline
    text = re.sub(r'</?(p|li|h3|h4|div|br)[^>]*>', ' ', html_content)
    # Remove remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Unescape HTML entities (e.g., &amp; to &)
    text = html.unescape(text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_release_notes(xml_data):
    """
    Parses the Atom feed XML data and returns structured JSON-compatible data.
    """
    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        print(f"XML parse error: {e}")
        return []

    # Namespace map for Atom
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = []

    for entry in root.findall('atom:entry', ns):
        # Date title (e.g. "June 15, 2026")
        title_elem = entry.find('atom:title', ns)
        date = title_elem.text.strip() if title_elem is not None else "Unknown Date"

        # Link to the release note page section
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        link = link_elem.attrib['href'] if link_elem is not None else ""

        # Content HTML
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""

        # Split content_html by <h3> tags
        items = []
        parts = re.split(r'<h3[^>]*>(.*?)</h3>', content_html, flags=re.IGNORECASE)
        
        # parts looks like: ['', 'Feature', '<p>...</p>', 'Issue', '<p>...</p>']
        if len(parts) > 1:
            for i in range(1, len(parts), 2):
                item_type = parts[i].strip()
                item_content = parts[i+1].strip() if i+1 < len(parts) else ""
                
                # Extract clean text representation for sharing
                clean_text = strip_tags(item_content)
                
                items.append({
                    "type": item_type,
                    "html": item_content,
                    "text": clean_text
                })
        else:
            # Fallback if no <h3> tag is found
            clean_text = strip_tags(content_html)
            items.append({
                "type": "General",
                "html": content_html,
                "text": clean_text
            })

        entries.append({
            "date": date,
            "link": link,
            "items": items
        })

    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        req = urllib.request.Request(
            FEED_URL,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        releases = parse_release_notes(xml_data)
        return jsonify({
            "status": "success",
            "releases": releases
        })
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Running on local development server
    app.run(debug=True, host='127.0.0.1', port=5000)
