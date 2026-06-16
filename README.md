# BigQuery Release Explorer 🚀

A premium, interactive web application built with **Python Flask** and **Vanilla HTML5/CSS3/JavaScript** that fetches, parses, and displays Google Cloud BigQuery release notes. It separates bundled daily updates into atomic news items, allowing you to easily filter, search, format, and share updates on X (Twitter).

---

## ✨ Features

* 🔄 **Real-Time Atom Ingestion:** Fetches updates directly from the official Google Cloud BigQuery XML feed.
* 🏷️ **Categorization & Splitting:** Divides complex multi-update entries into standalone, tag-coded items (*Features*, *Changes*, *Issues*, *Announcements*, and *Breaking*).
* 📊 **Analytics Dashboard:** Instantly displays summary metric cards for each release note category.
* 🔍 **Instant Text Search & Pills:** Filters release notes by keyword search or category type pills in real-time on the client side.
* 🐦 **Mock X (Twitter) Modal Composer:**
  * Opens a mock X post dialog for any update.
  * Auto-truncates text snippets dynamically to respect X's 280-character limit.
  * Calculates character counts and shows warning colors (Green/Orange/Red).
  * Direct clipboard copying and one-click redirects to post on X.
* 💫 **Visual Animations:** Pulses skeleton placeholder loaders during feed fetches and spins the refresh triggers.

---

## 🛠️ Tech Stack

* **Backend:** Python 3, Flask framework.
* **Frontend:** Vanilla HTML5, Vanilla CSS3 (Variables, Custom Grids, Mesh Gradients), Vanilla JavaScript.
* **Icons:** [Lucide Icons CDN](https://lucide.dev/).
* **Fonts:** `Outfit` (Headings) and `Inter` (Body) via Google Fonts.

---

## 📂 Project Structure

```
bigquery-release-notes/
├── app.py                  # Flask server entry point & XML parser
├── templates/
│   └── index.html          # Semantic HTML markup
├── static/
│   ├── style.css           # Styling sheets, colors, and layout keyframes
│   └── script.js           # Client filters, state, and tweet composer
├── .gitignore              # Ignored files (venv, logs, pycache)
└── README.md               # Documentation file
```

---

## 🚀 How to Run the Project Locally

### 1. Prerequisites
Ensure you have **Python 3.x** and **pip** installed.

### 2. Clone the Repository
```bash
git clone https://github.com/n-k-vaishnavi/Events-app.git
cd Events-app
```

### 3. Install Dependencies
Flask is the only dependency. Install it using pip:
```bash
pip install flask
```

### 4. Run the Flask Server
Run the application by executing:
```bash
python app.py
```
By default, the server starts in development debug mode on:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔄 Request-Response Lifecycle

1. **Client Request:** The client triggers `fetchReleases()` on page load or on clicking the "Refresh Feed" button, sending a `GET` request to `/api/releases`.
2. **Server Extraction:** The Flask backend in `app.py` queries Google Cloud's RSS XML, runs a regex divider using `re.split(r'<h3[^>]*>(.*?)</h3>')` to break notes into atomic items, and cleans HTML tags to make tweet text.
3. **Response Rendering:** The server outputs structured JSON to the client. The browser removes the shimmer skeletons, indexes the text, updates the stats board, and renders cards in the timeline grid.
4. **Social Sharing:** Clicking "Tweet Update" triggers the composer modal, auto-truncates the text, validates the character limits, and routes the text payload to the X web intent link.
