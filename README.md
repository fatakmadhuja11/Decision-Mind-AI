# DecisionMind AI — Multi-Agent Decision Support

A responsive HTML/CSS/JavaScript frontend for the DecisionMind AI n8n workflow. The frontend collects a decision problem, alternatives, team perspectives, and criteria weights, then displays the workflow's analysis.

## Files

- `index.html` — app interface
- `styles.css` — responsive styling
- `app.js` — form logic and n8n webhook request
- `.github/workflows/pages.yml` — automatic GitHub Pages deployment on every push to `main`

## Publish on GitHub Pages

1. Create a **public** repository on GitHub (for example `decisionmind-ai`).
2. Upload all files and folders from this directory to the repository's root, preserving `.github/workflows/pages.yml`.
3. Open **Settings → Pages** and set the build/deployment source to **GitHub Actions**.
4. Open the **Actions** tab and wait for **Deploy static site to GitHub Pages** to finish successfully.
5. Your site URL will be shown in the workflow deployment output and under **Settings → Pages**. For a project repository it usually follows `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

## Connect the n8n workflow

In `app.js`, replace the placeholder below with the exact production webhook URL copied from your n8n Webhook node:

```js
const WEBHOOK_URL = "PASTE_YOUR_N8N_WEBHOOK_URL_HERE";
```

Commit and push the change to `main` to redeploy. The n8n workflow must be active for a production webhook.

If the page loads but analysis fails, check that the n8n endpoint is reachable over HTTPS and that the host/reverse proxy allows requests from your GitHub Pages origin (CORS). Configure only the required origin, POST method, and Content-Type header. Do not put Gemini API keys or other secrets in this repository. Because this frontend sends requests directly from a public browser, protect the webhook with suitable authentication/rate limits or use a server-side proxy before making it publicly available.

## Local preview

Run from the repository directory:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`.
