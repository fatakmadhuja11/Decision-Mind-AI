# DecisionMind AI — HTML/CSS/JavaScript frontend

A responsive frontend for your existing n8n multi-agent decision workflow. It includes:
- Decision question and context
- Budget, currency, deadline, and team size
- 2–8 alternatives, with optional known cost
- Add/remove team perspectives
- Five configurable criterion weights (must total 100%)
- POST request to an n8n webhook
- Results dashboard, weighted score table, risks, next steps, raw JSON, and JSON export

## 1. Configure the n8n URL

Open `app.js` and replace:

```js
const WEBHOOK_URL = "PASTE_YOUR_N8N_WEBHOOK_URL_HERE";
```

with your actual n8n webhook URL. Your workflow's webhook path is `decisionmind`, so the URL will generally look like:

- Production: `https://YOUR-N8N-HOST/webhook/decisionmind`
- Test: `https://YOUR-N8N-HOST/webhook-test/decisionmind`

Use the exact URL displayed by your n8n Webhook node. For a test URL, start listening for a test event in n8n before submitting the form. For production, save and activate the workflow.

## 2. Important n8n response configuration

The existing workflow's Webhook node uses `responseMode: lastNode`. Keep this only if the last node returns the final report JSON in a shape the browser can read. If the dashboard says no scoring table was found, open the browser's raw JSON panel and compare the returned object with the workflow's `Format Final Report` node output. Depending on the final node connection/output, you may need to set the webhook to respond with the final report node's output or add a Respond to Webhook node that returns the final report.

The frontend accepts a report object directly or wrapped in `final_report` / `report`.

## 3. Run the frontend

Simplest: open `index.html` in a browser after setting the webhook URL.

If browser CORS blocks the request, serve the folder through a local development server instead, e.g. from this directory run:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`.

## 4. CORS and security

If the frontend and n8n use different origins, configure your n8n hosting/reverse proxy to allow the frontend origin and the `POST` method with the `Content-Type` header. Avoid `mode: "no-cors"`; it prevents the frontend from reading the response.

Do not place Gemini API keys or other secrets in the frontend. Keep credentials in n8n. For a public deployment, protect the webhook against unwanted requests (for example with authentication or a server-side proxy) and consider rate limits.

## 5. Input payload

The form sends JSON matching the workflow input schema, for example:

```json
{
  "problem": "Which project should our college team develop?",
  "context": "We have four weeks and a limited budget.",
  "budget": 5000,
  "currency": "INR",
  "deadline_weeks": 4,
  "team_size": 4,
  "alternatives": [
    {"id":"A","name":"Basic Web Application","description":"A simple web application","known_cost":1500},
    {"id":"B","name":"AI Chatbot","description":"A chatbot using an AI API"},
    {"id":"C","name":"Multi-Agent Decision System","description":"A decision support system"}
  ],
  "criteria_weights": {
    "cost_efficiency":25,
    "feasibility":30,
    "risk_control":20,
    "fairness":15,
    "expected_benefit":10
  },
  "team_perspectives": [
    {"role":"Developer","view":"Prefer learning opportunities"},
    {"role":"Coordinator","view":"Prefer delivery within the deadline"}
  ]
}
```

The frontend is a static client; the n8n workflow does the actual agent analysis.
