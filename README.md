# 🌱 FarmScore

> AI-powered credit readiness scoring for smallholder farmers in Kenya.

FarmScore turns a farmer's agronomic track record — crop history, input use, advisory engagement, and yield data — into a structured credit profile that lenders and cooperatives can trust.

Built for the **Kenya AI Challenge · AgriFin Track · Shambapro Brief**.

---

## 🔗 Live Demo

👉 **[farmscore demo](https://farm-score-fm2h7lmv1-leo-murayas-projects-10864cbd.vercel.app)**

> Replace the link above with your actual GitHub Pages URL after deploying.

---

## 📁 Project Structure

```
farmscore/
├── index.html              ← Farmer intake form + FarmScore output
├── lender/
│   └── index.html          ← Lender dashboard (coming soon)
├── assets/
│   ├── css/
│   │   └── shared.css      ← Shared styles (future refactor)
│   └── js/
│       └── scoring.js      ← Scoring logic (future refactor)
├── data/
│   └── sample-farmers.json ← Mock farmer records for lender dashboard
├── docs/
│   ├── phase_one_v2.docx   ← Phase one document
│   └── farmscore_pitch_deck.pptx ← Pitch deck
└── README.md
```

---

## 🚀 Running Locally

No build step or server needed. Just open the file:

```bash
# Clone the repo
git clone https://github.com/your-username/farmscore.git
cd farmscore

# Open in browser
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

Or drag `index.html` directly into any browser window.

---

## 🧠 How FarmScore Works

The prototype uses a **rule-based scoring model** running entirely in the browser (no backend required for the demo).

### Score dimensions (each out of 25)

| Dimension | What it measures |
|---|---|
| Agronomic practice | Planting timing, input use, fertiliser application |
| Production & yield | Self-reported yield level and crop loss history |
| Advisory engagement | Extension access frequency and follow-through rate |
| Financial reliability | Prior loan repayment, cooperative membership |

An experience bonus (up to 5 points) is added for farmers with multiple seasons on record.

### Score grades

| Score | Grade |
|---|---|
| 80–100 | Strong |
| 65–79  | Good |
| 50–64  | Moderate |
| 35–49  | Developing |
| 0–34   | Needs support |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Hosting | GitHub Pages |
| Scoring | Rule-based model (browser JS) |
| Graph DB (planned) | Neo4j AuraDB |
| Backend (planned) | Python + FastAPI |
| DB (planned) | PostgreSQL via Supabase |

---

## ⚠️ Responsible AI Note

FarmScore is a **decision-support tool**. Final credit decisions are always made by a human loan officer. Scores are advisory, not binding. Farmer data is only shared with explicit consent.

---

## 👥 Team

**Leo's Team** — Kenya AI Challenge 2026

*(Add team member names and roles here)*

---

## 📄 License

MIT
