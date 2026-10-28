/*
 * DecisionMind AI frontend
 * 1. Paste your n8n production webhook URL into WEBHOOK_URL below.
 * 2. If testing in n8n, use the Test URL while the workflow is listening.
 */
const WEBHOOK_URL = "https://decisionmind-ai.app.n8n.cloud/webhook-test/decisionmind";

const CRITERIA = [
  { key: "cost_efficiency", label: "Cost efficiency", note: "Value for the available budget", value: 25 },
  { key: "feasibility", label: "Feasibility", note: "Can the team deliver it on time?", value: 30 },
  { key: "risk_control", label: "Risk control", note: "How manageable are the risks?", value: 20 },
  { key: "fairness", label: "Fairness", note: "Impact on people and stakeholders", value: 15 },
  { key: "expected_benefit", label: "Expected benefit", note: "Potential value and outcomes", value: 10 }
];
const DEFAULT_ALTERNATIVES = [
  { id: "A", name: "Basic Web Application", description: "A simple web application with CRUD functionality", known_cost: "" },
  { id: "B", name: "AI Chatbot", description: "A chatbot that answers questions using an AI API", known_cost: "" },
  { id: "C", name: "Multi-Agent Decision System", description: "A decision support system using multiple AI agents", known_cost: "" }
];
const DEFAULT_PERSPECTIVES = [
  { name: "", role: "", preferred_alternative: "", view: "", concerns: "", confidence: 3 },
  { name: "", role: "", preferred_alternative: "", view: "", concerns: "", confidence: 3 }
];
let lastReport = null;
let lastBalancedWeights = Object.fromEntries(CRITERIA.map(c => [c.key, c.value]));

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
const currencySymbols = { INR: "₹", USD: "$", EUR: "€", GBP: "£", Other: "" };

function renderAlternatives(items = DEFAULT_ALTERNATIVES) {
  $("#alternatives").innerHTML = items.map((a, i) => `
    <div class="dynamic-card alternative-card">
      <div class="dynamic-card-head"><div class="item-index"><span class="index-badge">${String.fromCharCode(65 + i)}</span> Option ${i + 1}</div>
      <button type="button" class="remove-btn" data-remove-alt="${i}" aria-label="Remove option ${i + 1}">Remove ×</button></div>
      <div class="dynamic-fields">
        <input class="alt-name" aria-label="Option ${i + 1} name" placeholder="Option name" maxlength="120" value="${esc(a.name)}" required>
        <textarea class="alt-description" aria-label="Option ${i + 1} description" placeholder="What does this option involve?" maxlength="1200">${esc(a.description || "")}</textarea>
      </div>
      <div class="cost-row"><label>Known cost (optional)</label><input class="alt-cost" type="number" min="0" step="any" aria-label="Known cost for option ${i + 1}" placeholder="Estimated cost" value="${esc(a.known_cost ?? "")}"></div>
    </div>`).join("");
  updateAlternativeControls();
}
function renderPerspectives(items = DEFAULT_PERSPECTIVES) {
  $("#perspectives").innerHTML = items.map((p, i) => `
    <div class="dynamic-card perspective-card">
      <div class="dynamic-card-head"><div class="item-index"><span class="index-badge">${i + 1}</span> Team member ${i + 1}</div>
      <button type="button" class="remove-btn" data-remove-perspective="${i}" aria-label="Remove team member ${i + 1}">Remove ×</button></div>
      <div class="dynamic-fields">
        <input class="perspective-name" aria-label="Member name ${i + 1}" placeholder="Member name (required when submitting)" maxlength="100" value="${esc(p.name || "")}">
        <input class="perspective-role" aria-label="Role ${i + 1}" placeholder="Role (e.g. developer, designer)" maxlength="100" value="${esc(p.role || "")}">
        <input class="perspective-preference" aria-label="Preferred alternative ${i + 1}" placeholder="Preferred option (e.g. AI Chatbot)" maxlength="120" value="${esc(p.preferred_alternative || "")}">
        <textarea class="perspective-view" aria-label="Opinion ${i + 1}" placeholder="Your opinion and reasons (required when submitting)" maxlength="1500">${esc(p.view || "")}</textarea>
        <textarea class="perspective-concerns" aria-label="Concerns ${i + 1}" placeholder="Concerns, risks, or disadvantages (optional)" maxlength="1000">${esc(p.concerns || "")}</textarea>
        <label class="confidence-field">Confidence (1 = low, 5 = high)
          <input class="perspective-confidence" type="number" min="1" max="5" step="1" value="${esc(p.confidence ?? 3)}" aria-label="Confidence level ${i + 1}">
        </label>
      </div>
    </div>`).join("");
}
function renderWeights() {
  $("#weights").innerHTML = CRITERIA.map(c => `
    <div class="weight-row">
      <div class="weight-label">${c.label}<small>${c.note}</small></div>
      <input class="weight-range" type="range" min="0" max="100" step="1" value="${c.value}" data-weight="${c.key}" aria-label="${c.label} weight slider">
      <div class="weight-number"><input type="number" min="0" max="100" step="1" value="${c.value}" data-weight-number="${c.key}" aria-label="${c.label} weight percentage"><span>%</span></div>
    </div>`).join("");
  updateWeightTotal();
}
function updateAlternativeControls() {
  const count = $$(".alternative-card").length;
  $("#altCount").textContent = `${count} of 8 options`;
  $("#addAlternative").disabled = count >= 8;
  $("#addAlternative").style.opacity = count >= 8 ? ".45" : "1";
  $$(".alternative-card").forEach((card, i) => {
    card.querySelector(".index-badge").textContent = String.fromCharCode(65 + i);
    card.querySelector(".dynamic-card-head .item-index").lastChild.textContent = ` Option ${i + 1}`;
    card.querySelector("[data-remove-alt]").dataset.removeAlt = i;
  });
}
function getWeights() {
  return Object.fromEntries(CRITERIA.map(c => [c.key, Number($(`[data-weight-number="${c.key}"]`).value)]));
}
function updateWeightTotal() {
  const inputs = CRITERIA.map(c => $(`[data-weight-number="${c.key}"]`));
  const values = inputs.map(el => el.value.trim() === "" ? NaN : Number(el.value));
  const allValid = values.every(n => Number.isInteger(n) && n >= 0 && n <= 100);
  const total = values.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
  $("#weightTotal").textContent = `${total}%`;
  const valid = allValid && total === 100;
  if (valid) lastBalancedWeights = Object.fromEntries(CRITERIA.map((c, i) => [c.key, values[i]]));
  $("#weightTotal").classList.toggle("invalid", !valid);
  $("#weightMessage").textContent = valid
    ? "Your priorities are balanced."
    : !allValid
      ? "Enter a whole-number percentage from 0 to 100 for every criterion."
      : `Weights must total exactly 100% (${total < 100 ? `${100-total}% more needed` : `${total-100}% over`}).`;
  $("#weightMessage").style.color = valid ? "" : "var(--red)";
  return valid;
}
function restoreLastBalancedWeights() {
  CRITERIA.forEach(c => {
    const value = String(lastBalancedWeights[c.key] ?? c.value);
    $(`[data-weight-number="${c.key}"]`).value = value;
    $(`[data-weight="${c.key}"]`).value = value;
  });
  updateWeightTotal();
}
function setWeightAndRebalance(changedKey, rawValue) {
  if (rawValue === "" || !Number.isInteger(Number(rawValue))) return updateWeightTotal();
  const chosen = Number(rawValue);
  if (chosen < 0 || chosen > 100) return updateWeightTotal();

  const others = CRITERIA.filter(c => c.key !== changedKey);
  const current = others.map(c => {
    const raw = $(`[data-weight-number="${c.key}"]`).value;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });
  const remaining = 100 - chosen;
  const sum = current.reduce((a, b) => a + b, 0);
  let allocated;
  if (sum === 0) {
    const base = Math.floor(remaining / others.length);
    allocated = current.map((_, i) => base + (i < remaining % others.length ? 1 : 0));
  } else {
    const exact = current.map(n => n / sum * remaining);
    allocated = exact.map(Math.floor);
    let leftover = remaining - allocated.reduce((a, b) => a + b, 0);
    const order = exact.map((n, i) => ({ i, fraction: n - Math.floor(n) }))
      .sort((a, b) => b.fraction - a.fraction);
    for (let i = 0; i < leftover; i++) allocated[order[i].i]++;
  }

  const changedNumber = $(`[data-weight-number="${changedKey}"]`);
  const changedSlider = $(`[data-weight="${changedKey}"]`);
  changedNumber.value = String(chosen);
  changedSlider.value = String(chosen);
  others.forEach((c, i) => {
    $(`[data-weight-number="${c.key}"]`).value = String(allocated[i]);
    $(`[data-weight="${c.key}"]`).value = String(allocated[i]);
  });
  return updateWeightTotal();
}
function addAlternative() {
  const items = $$(".alternative-card").map(card => ({
    name: $(".alt-name", card).value, description: $(".alt-description", card).value, known_cost: $(".alt-cost", card).value
  }));
  if (items.length >= 8) return;
  items.push({ name: "", description: "", known_cost: "" });
  renderAlternatives(items);
}
function addPerspective() {
  const items = $(".perspective-card").map(card => ({
    name: $(".perspective-name", card).value,
    role: $(".perspective-role", card).value,
    preferred_alternative: $(".perspective-preference", card).value,
    view: $(".perspective-view", card).value,
    concerns: $(".perspective-concerns", card).value,
    confidence: $(".perspective-confidence", card).value
  }));
  items.push({ name: "", role: "", preferred_alternative: "", view: "", concerns: "", confidence: 3 });
  renderPerspectives(items);
}
function collectPayload() {
  const alternatives = $$(".alternative-card").map((card, i) => {
    const alt = {
      id: String.fromCharCode(65 + i),
      name: $(".alt-name", card).value.trim(),
      description: $(".alt-description", card).value.trim()
    };
    const costRaw = $(".alt-cost", card).value.trim();
    if (costRaw !== "") alt.known_cost = Number(costRaw);
    return alt;
  });
  const team_perspectives = $(".perspective-card").map(card => {
    const confidenceRaw = $(".perspective-confidence", card).value.trim();
    return {
      name: $(".perspective-name", card).value.trim(),
      role: $(".perspective-role", card).value.trim(),
      preferred_alternative: $(".perspective-preference", card).value.trim(),
      view: $(".perspective-view", card).value.trim(),
      concerns: $(".perspective-concerns", card).value.trim(),
      confidence: confidenceRaw === "" ? null : Number(confidenceRaw)
    };
  }).filter(p => p.name || p.role || p.preferred_alternative || p.view || p.concerns);
  const budgetRaw = $("#budget").value.trim(), deadlineRaw = $("#deadline").value.trim(), teamRaw = $("#teamSize").value.trim();
  const payload = {
    problem: $("#problem").value.trim(),
    context: $("#context").value.trim(),
    currency: $("#currency").value,
    alternatives,
    criteria_weights: getWeights(),
    team_perspectives
  };
  if (budgetRaw !== "") payload.budget = Number(budgetRaw);
  if (deadlineRaw !== "") payload.deadline_weeks = Number(deadlineRaw);
  if (teamRaw !== "") payload.team_size = Number(teamRaw);
  return payload;
}
function validatePayload(payload) {
  const errors = [];
  if (!payload.problem) errors.push("Enter a decision question.");
  if (payload.alternatives.length < 2) errors.push("Add at least two alternatives.");
  if (payload.alternatives.length > 8) errors.push("Use no more than eight alternatives.");
  if (payload.alternatives.some(a => !a.name)) errors.push("Give every alternative a name.");
  if (payload.alternatives.some(a => a.known_cost !== undefined && (!Number.isFinite(a.known_cost) || a.known_cost < 0))) errors.push("Known costs must be zero or greater.");
  if (payload.budget !== undefined && (!Number.isFinite(payload.budget) || payload.budget <= 0)) errors.push("Budget must be greater than zero, or leave it blank.");
  if (payload.deadline_weeks !== undefined && (!Number.isFinite(payload.deadline_weeks) || payload.deadline_weeks <= 0)) errors.push("Deadline must be greater than zero, or leave it blank.");
  if (payload.team_size !== undefined && (!Number.isInteger(payload.team_size) || payload.team_size <= 0)) errors.push("Team size must be a positive whole number, or leave it blank.");
  payload.team_perspectives.forEach((p, i) => {
    if (!p.name) errors.push(`Team member ${i + 1}: enter the member name.`);
    if (!p.view) errors.push(`Team member ${i + 1}: enter their opinion and reasons.`);
    if (p.confidence !== null && (!Number.isInteger(p.confidence) || p.confidence < 1 || p.confidence > 5)) errors.push(`Team member ${i + 1}: confidence must be a whole number from 1 to 5.`);
  });
  if (!updateWeightTotal()) errors.push("Criteria weights must total exactly 100%.");
  return errors;
}
function setLoading(on) {
  $("#loadingOverlay").classList.toggle("hidden", !on);
  $("#analyzeBtn").disabled = on;
  $("#analyzeBtn").querySelector("span:first-child").textContent = on ? "Analyzing…" : "Analyze decision";
}
function showFormError(message) {
  $("#formError").textContent = message;
  $("#formError").classList.remove("hidden");
  $("#formError").scrollIntoView({ behavior: "smooth", block: "center" });
}
function getReportObject(data) {
  let value = data;
  if (Array.isArray(value)) value = value[0];
  if (value && typeof value === "object" && value.body && typeof value.body === "object") value = value.body;
  if (value && typeof value === "object" && value.final_report) return value.final_report;
  if (value && typeof value === "object" && value.report && typeof value.report === "object") return value.report;
  return value;
}
function asArray(value) { return Array.isArray(value) ? value : value == null ? [] : [value]; }
function cleanText(value) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
function getField(obj, keys) {
  for (const key of keys) if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  return undefined;
}
function renderResults(report) {
  lastReport = report;
  $("#resultsSection").classList.remove("hidden");
  const rec = report["07_recommendation"] || report.recommendation || {};
  const problem = report["01_decision_problem"]?.problem || report.problem || "Decision analysis";
  const recommendedName = rec.recommended_alternative_name || rec.recommended_option || rec.recommendation || "";
  const decisionStatus = rec.decision_status || report.decision_status || "Review recommendation";
  const score = rec.weighted_score;
  const confidence = rec.confidence;
  const execution = report.execution_status || "Response received";
  const summary = [];
  summary.push(`<div class="summary-tile featured"><div class="summary-label">RECOMMENDATION</div><h3>${esc(recommendedName || decisionStatus)}</h3><p>${esc(rec.ranking_explanation || rec.status_reason || "Review the comparison and supporting evidence below.")}</p></div>`);
  summary.push(`<div class="summary-tile"><div class="summary-label">WEIGHTED SCORE</div><div class="summary-value green">${score !== undefined && score !== null ? esc(score) : "—"}</div><p>Higher is better when evaluated by the workflow.</p></div>`);
  summary.push(`<div class="summary-tile"><div class="summary-label">CONFIDENCE</div><div class="summary-value">${esc(confidence ?? "—")}</div><p>${esc(decisionStatus)} · ${esc(execution.replaceAll("_"," "))}</p></div>`);
  $("#resultSummary").innerHTML = summary.join("");
  const tableRows = report["05_weighted_scoring_table"] || report.weighted_scoring_table || report.scoring || [];
  const body = $("#scoresTable tbody");
  body.innerHTML = asArray(tableRows).map(row => {
    const scores = row.criteria_scores || row.scores || {};
    const id = row.alternative_id || row.id || "";
    const name = row.alternative_name || row.name || id || "Option";
    const scoreFor = key => {
      const aliases = {cost_efficiency:["cost_efficiency","cost"],feasibility:["feasibility"],risk_control:["risk_control","risk"],fairness:["fairness"],expected_benefit:["expected_benefit","benefit"]}[key];
      const v = getField(scores, aliases);
      return v === undefined ? "—" : cleanText(v);
    };
    const weighted = row.weighted_score_display ?? row.weighted_score ?? "—";
    const eligible = row.eligible;
    const status = eligible === false ? `<span class="status-pill ineligible">Not eligible</span>` : eligible === true ? `<span class="status-pill eligible">Eligible</span>` : `<span class="score-pill">${esc(row.evaluation_status || "Reviewed")}</span>`;
    return `<tr><td>${esc(id ? id+" · " : "")}${esc(name)}</td><td>${esc(scoreFor("cost_efficiency"))}</td><td>${esc(scoreFor("feasibility"))}</td><td>${esc(scoreFor("risk_control"))}</td><td>${esc(scoreFor("fairness"))}</td><td>${esc(scoreFor("expected_benefit"))}</td><td><b>${esc(weighted)}</b></td><td>${status}</td></tr>`;
  }).join("") || `<tr><td colspan="8" class="empty-state">No scoring table was found in the webhook response.</td></tr>`;
  const reasons = asArray(report["08_supporting_reasons"] || report.supporting_reasons || rec.supporting_reasons);
  $("#reasonsList").innerHTML = reasons.length ? reasons.map(x => `<li>${esc(typeof x === "object" ? x.reason || x.description || cleanText(x) : x)}</li>`).join("") : `<li class="empty-state">No supporting reasons were included in this response.</li>`;
  const riskObj = report["10_risks_and_mitigations"] || report.risks || {};
  const risks = [...asArray(riskObj.consensus_view), ...asArray(riskObj.high_severity_risks_from_risk_analyst), ...asArray(report["12_missing_information_and_uncertainty"] || report.uncertainty)];
  $("#risksList").innerHTML = risks.length ? risks.map(x => {
    if (typeof x === "object") return `<li>${esc([x.severity ? "["+x.severity+"] " : "", x.risk || x.description || x.detail || x.mitigation || cleanText(x)].join(""))}</li>`;
    return `<li>${esc(x)}</li>`;
  }).join("") : `<li class="empty-state">No explicit risks or uncertainties were included in this response.</li>`;
  const nextSteps = asArray(report["13_action_plan"] || report.action_plan || report.next_steps);
  $("#nextStepsList").innerHTML = nextSteps.length ? nextSteps.map(x => `<li>${esc(typeof x === "object" ? x.action || x.step || x.description || cleanText(x) : x)}</li>`).join("") : `<li class="empty-state">Review the report and agree on owners and next steps as a team.</li>`;
  $("#rawJson").textContent = JSON.stringify(report, null, 2);
  const notice = $("#resultNotice");
  notice.classList.remove("hidden");
  if (report.execution_status && report.execution_status !== "completed") {
    notice.className = "alert error-alert";
    notice.textContent = `Workflow status: ${report.execution_status.replaceAll("_"," ")}. Check agent errors and uncertainty in the full report before relying on the recommendation.`;
  } else {
    notice.className = "alert";
    notice.style.background = "#17312d"; notice.style.border = "1px solid #2d5b4f"; notice.style.color = "#9ae6c8";
    notice.textContent = `Response received for: ${problem}. Human review is still required.`;
  }
  $("#resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
}
async function submitDecision(event) {
  event.preventDefault();
  $("#formError").classList.add("hidden");
  const payload = collectPayload();
  const errors = validatePayload(payload);
  if (errors.length) { showFormError("Please fix the following:\n• " + errors.join("\n• ")); return; }
  if (!WEBHOOK_URL || WEBHOOK_URL.includes("PASTE_YOUR_N8N_WEBHOOK_URL_HERE")) {
    showFormError("Add your n8n webhook URL first. Open app.js and replace PASTE_YOUR_N8N_WEBHOOK_URL_HERE with your n8n production or test webhook URL.");
    return;
  }
  setLoading(true);
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { response_text: raw }; }
    if (!response.ok) {
      const details = data.message || data.error || raw || `HTTP ${response.status}`;
      throw new Error(`n8n returned HTTP ${response.status}: ${cleanText(details)}`);
    }
    const report = getReportObject(data);
    if (!report || typeof report !== "object") throw new Error("The webhook response was not a JSON object. Check the n8n workflow's response mode and final node output.");
    renderResults(report);
  } catch (error) {
    let message = error.message || "Unknown request error.";
    if (error instanceof TypeError) {
      message += "\n\nThis is often a webhook URL or CORS issue. Confirm the URL in app.js, activate the n8n workflow, and configure n8n to allow requests from the origin serving this page. If you opened index.html directly, try serving the folder with a local web server.";
    }
    showFormError(message);
  } finally { setLoading(false); }
}
function resetForm() {
  $("#decisionForm").reset();
  $("#problem").value = "Which project should our college team develop?";
  $("#context").value = "We have four weeks and a limited budget.";
  $("#budget").value = "5000"; $("#deadline").value = "4"; $("#teamSize").value = "4"; $("#currency").value = "INR";
  renderAlternatives(); renderPerspectives();
  CRITERIA.forEach(c => { $(`[data-weight="${c.key}"]`).value = c.value; $(`[data-weight-number="${c.key}"]`).value = c.value; });
  updateWeightTotal(); $("#formError").classList.add("hidden"); $("#resultsSection").classList.add("hidden");
}
function downloadReport() {
  if (!lastReport) return;
  const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "decisionmind-report.json"; a.click();
  URL.revokeObjectURL(url);
}
$("#decisionForm").addEventListener("submit", submitDecision);
$("#addAlternative").addEventListener("click", addAlternative);
$("#addPerspective").addEventListener("click", addPerspective);
$("#resetBtn").addEventListener("click", resetForm);
$("#downloadBtn").addEventListener("click", downloadReport);
$("#currency").addEventListener("change", () => { $("#currencyPrefix").textContent = currencySymbols[$("#currency").value] ?? ""; });
$("#alternatives").addEventListener("click", e => {
  const button = e.target.closest("[data-remove-alt]");
  if (!button) return;
  const cards = $$(".alternative-card");
  if (cards.length <= 2) { showFormError("At least two alternatives are required."); return; }
  const items = cards.filter((_, i) => i !== Number(button.dataset.removeAlt)).map(card => ({ name: $(".alt-name",card).value, description: $(".alt-description",card).value, known_cost: $(".alt-cost",card).value }));
  renderAlternatives(items);
});
$("#perspectives").addEventListener("click", e => {
  const button = e.target.closest("[data-remove-perspective]");
  if (!button) return;
  const items = $$(".perspective-card").filter((_,i) => i !== Number(button.dataset.removePerspective)).map(card => ({ role: $(".perspective-role",card).value, view: $(".perspective-view",card).value }));
  renderPerspectives(items);
});
$("#weights").addEventListener("input", e => {
  const slider = e.target.closest("[data-weight]");
  const number = e.target.closest("[data-weight-number]");
  if (slider) setWeightAndRebalance(slider.dataset.weight, slider.value);
  if (number) {
    $(`[data-weight="${number.dataset.weightNumber}"]`).value = number.value;
    updateWeightTotal();
  }
});
$("#weights").addEventListener("change", e => {
  const number = e.target.closest("[data-weight-number]");
  if (number) {
    const value = number.value.trim();
    if (value === "" || !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 100) {
      restoreLastBalancedWeights();
    } else {
      setWeightAndRebalance(number.dataset.weightNumber, value);
    }
  }
});
renderAlternatives(); renderPerspectives(); renderWeights();
