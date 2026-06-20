/**
 * Health & Performance Insights Engine
 *
 * Pure algorithm — no LLM required. Reads from SQLite and produces:
 *   - Scored metrics (0-100)
 *   - Trend analysis
 *   - Red flags
 *   - Recovery readiness score
 *   - Overtraining risk assessment
 *   - Prompt context for any LLM
 */

import { getDb } from '../db/schema.js';

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeInsights() {
  const db = getDb();
  const raw = fetchRawData(db);
  const metrics = computeMetrics(raw);
  const flags = detectFlags(metrics, raw);
  const scores = computeScores(metrics);
  const summary = buildSummary(metrics, flags, scores);
  return { metrics, flags, scores, summary, raw };
}

export function buildLLMContext(insights) {
  const { metrics, flags, scores, raw } = insights;
  return buildPrompt(metrics, flags, scores, raw);
}

// ─── Data fetching ────────────────────────────────────────────────────────────

function fetchRawData(db) {
  const today = new Date().toISOString().slice(0, 10);

  const runs90 = db.prepare(`
    SELECT date, distance_m, duration_s, avg_hr, max_hr, avg_pace_s,
           avg_cadence, calories, aerobic_te, anaerobic_te, vo2max, name
    FROM activities
    WHERE type = 'run' AND date >= date('now', '-90 days')
    ORDER BY date DESC
  `).all();

  const health30 = db.prepare(`
    SELECT date, resting_hr, hrv, hrv_weekly_avg, hrv_status,
           sleep_duration_s, sleep_score, deep_sleep_s, rem_sleep_s, light_sleep_s,
           awake_s, avg_stress, body_battery_high, body_battery_low,
           body_battery_charged, body_battery_drained,
           spo2_avg, avg_respiration, steps,
           sleep_feedback, sleep_need_min, nap_duration_s,
           avg_sleep_hr, awake_count
    FROM health_daily
    WHERE date >= date('now', '-30 days')
    ORDER BY date DESC
  `).all();

  const pain30 = db.prepare(`
    SELECT date, body_part, severity, description
    FROM pain_log
    WHERE date >= date('now', '-30 days')
    ORDER BY date DESC
  `).all();

  const notes14 = db.prepare(`
    SELECT date, content, tags, wellbeing_score
    FROM notes
    WHERE date >= date('now', '-14 days')
    ORDER BY date DESC
  `).all();

  const latestHealth = health30[0] || null;
  const todayRun = runs90.find(r => r.date === today) || null;

  return { runs90, health30, pain30, notes14, latestHealth, todayRun, today };
}

// ─── Core metric computation ──────────────────────────────────────────────────

function computeMetrics(raw) {
  const { runs90, health30 } = raw;

  // ── Training load (ACWR) ──────────────────────────────────────────────────
  const runs7  = runs90.filter(r => isWithinDays(r.date, 7));
  const runs28 = runs90.filter(r => isWithinDays(r.date, 28));
  const runs14 = runs90.filter(r => isWithinDays(r.date, 14));

  const acute_km  = sumKm(runs7);
  const chronic_km = sumKm(runs28) / 4; // weekly average over 28d
  const acwr = chronic_km > 0 ? round2(acute_km / chronic_km) : null;

  const weekly_km_4 = [0, 1, 2, 3].map(w => {
    const wRuns = runs90.filter(r => {
      const d = daysDiff(r.date);
      return d >= w * 7 && d < (w + 1) * 7;
    });
    return round2(sumKm(wRuns));
  });

  const mileage_trend = trendDirection(weekly_km_4.slice().reverse());

  // ── HRV ───────────────────────────────────────────────────────────────────
  const hrv_data = health30.filter(h => h.hrv != null);
  const hrv_last = raw.latestHealth?.hrv ?? null;
  const hrv_7avg = avg(hrv_data.slice(0, 7).map(h => h.hrv));
  const hrv_30avg = avg(hrv_data.map(h => h.hrv));
  const hrv_relative = hrv_30avg > 0 ? round2((hrv_last ?? hrv_7avg) / hrv_30avg) : null;
  const hrv_trend = trendDirection(hrv_data.slice(0, 7).map(h => h.hrv).reverse());
  const hrv_status = raw.latestHealth?.hrv_status ?? null;
  const hrv_weekly_avg = raw.latestHealth?.hrv_weekly_avg ?? null;

  // ── Resting HR ────────────────────────────────────────────────────────────
  const hr_data = health30.filter(h => h.resting_hr != null);
  const hr_today = raw.latestHealth?.resting_hr ?? null;
  const hr_7avg = avg(hr_data.slice(0, 7).map(h => h.resting_hr));
  const hr_30avg = avg(hr_data.map(h => h.resting_hr));
  const hr_elevation = (hr_today && hr_30avg) ? round2(hr_today - hr_30avg) : null;
  const hr_trend = trendDirection(hr_data.slice(0, 7).map(h => h.resting_hr).reverse());

  // ── Sleep ─────────────────────────────────────────────────────────────────
  const sleep_data = health30.filter(h => h.sleep_duration_s != null);
  const sleep_7avg_s = avg(sleep_data.slice(0, 7).map(h => h.sleep_duration_s));
  const sleep_30avg_s = avg(sleep_data.map(h => h.sleep_duration_s));
  const sleep_score_7avg = avg(sleep_data.slice(0, 7).filter(h => h.sleep_score != null).map(h => h.sleep_score));
  const sleep_trend = trendDirection(sleep_data.slice(0, 7).map(h => h.sleep_duration_s).reverse());

  const deep_pct_7avg = avg(sleep_data.slice(0, 7)
    .filter(h => h.deep_sleep_s && h.sleep_duration_s)
    .map(h => (h.deep_sleep_s / h.sleep_duration_s) * 100));
  const rem_pct_7avg = avg(sleep_data.slice(0, 7)
    .filter(h => h.rem_sleep_s && h.sleep_duration_s)
    .map(h => (h.rem_sleep_s / h.sleep_duration_s) * 100));

  // Sleep debt: optimal 8h per night
  const OPTIMAL_SLEEP_S = 8 * 3600;
  const sleep_debt_7d_h = sleep_data.slice(0, 7).length > 0
    ? round2(sleep_data.slice(0, 7).reduce((acc, h) => acc + Math.max(0, OPTIMAL_SLEEP_S - h.sleep_duration_s), 0) / 3600)
    : null;

  // ── Body Battery ─────────────────────────────────────────────────────────
  const bb_data = health30.filter(h => h.body_battery_high != null);
  const bb_today_high = raw.latestHealth?.body_battery_high ?? null;
  const bb_7avg_high = avg(bb_data.slice(0, 7).map(h => h.body_battery_high));
  const bb_charged_7avg = avg(bb_data.slice(0, 7).filter(h => h.body_battery_charged != null).map(h => h.body_battery_charged));
  const bb_drained_7avg = avg(bb_data.slice(0, 7).filter(h => h.body_battery_drained != null).map(h => h.body_battery_drained));
  const bb_trend = trendDirection(bb_data.slice(0, 7).map(h => h.body_battery_high).reverse());

  // ── Stress ────────────────────────────────────────────────────────────────
  const stress_data = health30.filter(h => h.avg_stress != null);
  const stress_7avg = avg(stress_data.slice(0, 7).map(h => h.avg_stress));

  // ── Pain ──────────────────────────────────────────────────────────────────
  const { pain30 } = raw;
  const pain_14d = raw.pain30.filter(p => isWithinDays(p.date, 14));
  const pain_7d  = raw.pain30.filter(p => isWithinDays(p.date, 7));
  const pain_severity_avg = pain_7d.length > 0 ? avg(pain_7d.map(p => p.severity)) : 0;
  const chronic_pain_parts = findChronicPainParts(pain30);

  // ── Wellbeing ─────────────────────────────────────────────────────────────
  const wb_scores = raw.notes14.filter(n => n.wellbeing_score != null).map(n => n.wellbeing_score);
  const wellbeing_avg = wb_scores.length > 0 ? avg(wb_scores) : null;

  // ── VO2max trend ─────────────────────────────────────────────────────────
  const vo2_data = runs90.filter(r => r.vo2max != null).slice(0, 10);
  const vo2_latest = vo2_data[0]?.vo2max ?? null;
  const vo2_trend = trendDirection(vo2_data.map(r => r.vo2max).reverse());

  // ── Recent run quality ────────────────────────────────────────────────────
  const recent_runs = runs90.slice(0, 10).map(r => ({
    date: r.date,
    km: round2((r.distance_m ?? 0) / 1000),
    pace_s: r.avg_pace_s,
    avg_hr: r.avg_hr,
    aerobic_te: r.aerobic_te,
    name: r.name,
  }));

  return {
    // Training
    acute_km, chronic_km, acwr, mileage_trend, weekly_km_4, recent_runs,
    // HRV
    hrv_last, hrv_7avg, hrv_30avg, hrv_relative, hrv_trend, hrv_status, hrv_weekly_avg,
    // Resting HR
    hr_today, hr_7avg, hr_30avg, hr_elevation, hr_trend,
    // Sleep
    sleep_7avg_s, sleep_30avg_s, sleep_score_7avg, sleep_trend,
    deep_pct_7avg, rem_pct_7avg, sleep_debt_7d_h,
    // Body Battery
    bb_today_high, bb_7avg_high, bb_charged_7avg, bb_drained_7avg, bb_trend,
    // Stress
    stress_7avg,
    // Pain
    pain_7d, pain_14d, pain_severity_avg, chronic_pain_parts,
    // Wellbeing
    wellbeing_avg,
    // VO2max
    vo2_latest, vo2_trend,
  };
}

// ─── Flag detection ───────────────────────────────────────────────────────────

function detectFlags(m, raw) {
  const flags = [];

  const add = (level, category, message, detail = null) =>
    flags.push({ level, category, message, detail });

  // ── Training load ─────────────────────────────────────────────────────────
  if (m.acwr !== null) {
    if (m.acwr > 1.5)
      add('RED', 'training', `Magas edzésterhelés — ACWR ${m.acwr} (>1.5 sérülésveszély)`,
          'Az akut heti km sokkal meghaladja a krónikus átlagot. Csökkentsd a heti km-t legalább 20%-kal.');
    else if (m.acwr > 1.3)
      add('YELLOW', 'training', `Emelt edzésterhelés — ACWR ${m.acwr} (optimum: 0.8–1.3)`,
          'Figyeld a felépülési jeleket. Egy könnyű hét ajánlott ha HRV esik.');
    else if (m.acwr < 0.5 && m.chronic_km > 0)
      add('YELLOW', 'training', `Alacsony edzésterhelés — ACWR ${m.acwr} (detraining veszély)`,
          'Ha nem szándékos pihenőhét, fokozatosan növeld vissza a terhelést.');
  }

  if (m.mileage_trend === 'increasing' && m.weekly_km_4[3] > 0) {
    const increase_pct = round2(((m.weekly_km_4[0] - m.weekly_km_4[3]) / m.weekly_km_4[3]) * 100);
    if (increase_pct > 30)
      add('YELLOW', 'training', `Gyors km növekedés — ${increase_pct}% az elmúlt 4 hétben`,
          '10%-os szabály: hetente max. 10%-ot érdemes növelni a heti km-t.');
  }

  // ── HRV ──────────────────────────────────────────────────────────────────
  if (m.hrv_relative !== null) {
    if (m.hrv_relative < 0.85)
      add('RED', 'recovery', `HRV szignifikánsan az egyéni baseline alatt (${Math.round(m.hrv_relative * 100)}%)`,
          'Ez erős fáradtság/túlterhelés jel. Könnyű edzés vagy pihenő ajánlott.');
    else if (m.hrv_relative < 0.92)
      add('YELLOW', 'recovery', `HRV kissé az egyéni baseline alatt (${Math.round(m.hrv_relative * 100)}%)`,
          'Mérsékelt fáradtság. Tartsd az intenzitást alacsonyabb zónán.');
  }

  if (m.hrv_status === 'UNBALANCED')
    add('YELLOW', 'recovery', 'HRV státusz: UNBALANCED',
        'Az idegrendszer nem egyensúlyi állapotban van. Stressz, alváshiány vagy túl intenzív edzés okozhatja.');
  if (m.hrv_status === 'LOW')
    add('RED', 'recovery', 'HRV státusz: LOW',
        'Komoly felépülési deficit. Semmi kemény edzés amíg normalizálódik.');

  if (m.hrv_trend === 'decreasing')
    add('YELLOW', 'recovery', 'HRV csökkenő trend az elmúlt 7 napban',
        'Figyeld az alvást, hidrálást, edzésterhelést.');

  // ── Resting HR ────────────────────────────────────────────────────────────
  if (m.hr_elevation !== null && m.hr_elevation > 5)
    add('YELLOW', 'recovery', `Emelkedett nyugalmi HR (+${m.hr_elevation} bpm az átlaghoz képest)`,
        'Betegség, dehidratáció, vagy túlterhelés jele lehet. Pihenő ajánlott.');
  if (m.hr_elevation !== null && m.hr_elevation > 8)
    add('RED', 'recovery', `Erősen emelkedett nyugalmi HR (+${m.hr_elevation} bpm)`,
        'Komoly felépülési deficit vagy betegség gyanúja. Fordulj orvoshoz ha tartós.');

  // ── Sleep ─────────────────────────────────────────────────────────────────
  if (m.sleep_7avg_s !== null && m.sleep_7avg_s < 6 * 3600)
    add('RED', 'sleep', `Kritikusan kevés alvás — 7 napos átlag: ${fmtH(m.sleep_7avg_s)}`,
        'Alvás alatt regenerálódik a test. Teljesítmény, VO2max és sérülésveszély közvetlen hatással van.');
  else if (m.sleep_7avg_s !== null && m.sleep_7avg_s < 7 * 3600)
    add('YELLOW', 'sleep', `Kevés alvás — 7 napos átlag: ${fmtH(m.sleep_7avg_s)} (optimum: 8h+)`,
        null);

  if (m.sleep_debt_7d_h !== null && m.sleep_debt_7d_h > 5)
    add('YELLOW', 'sleep', `Alvásdeficit: ${m.sleep_debt_7d_h}h az elmúlt 7 napban`,
        'Az alvásdeficit nem halmozható vissza egy hosszú alvással. Fokozatos korrekció kell.');

  if (m.deep_pct_7avg !== null && m.deep_pct_7avg < 12)
    add('YELLOW', 'sleep', `Alacsony mélyen alváshányad — ${round1(m.deep_pct_7avg)}% (optimum: 16–33%)`,
        'Alkohol, késő edzés és magas stressz csökkentik a mély alvást.');
  if (m.rem_pct_7avg !== null && m.rem_pct_7avg < 15)
    add('YELLOW', 'sleep', `Alacsony REM hányad — ${round1(m.rem_pct_7avg)}% (optimum: 21–31%)`,
        'REM fontos a motoros tanuláshoz és mentális regenerációhoz.');

  if (m.sleep_score_7avg !== null && m.sleep_score_7avg < 60)
    add('YELLOW', 'sleep', `Gyenge alváskvalitás — átlag score: ${round1(m.sleep_score_7avg)}/100`,
        null);

  // ── Body Battery ─────────────────────────────────────────────────────────
  if (m.bb_today_high !== null && m.bb_today_high < 40)
    add('YELLOW', 'energy', `Alacsony Body Battery csúcs — ${m.bb_today_high}/100`,
        'Kevés szabad energiakapacitás. Könnyű nap ajánlott.');
  if (m.bb_today_high !== null && m.bb_today_high < 25)
    add('RED', 'energy', `Kritikusan alacsony Body Battery — ${m.bb_today_high}/100`,
        'Pihenő nap. Semmi intenzív edzés.');
  if (m.bb_trend === 'decreasing')
    add('YELLOW', 'energy', 'Body Battery csökkenő trend az elmúlt héten',
        'A test nem töltődik vissza teljesen éjszaka. Vizsgáld az alvásminőséget és stresszterhelést.');

  // ── Pain ──────────────────────────────────────────────────────────────────
  if (m.pain_severity_avg > 3)
    add('RED', 'injury', `Magas fájdalom szint az elmúlt 7 napban — átlag: ${round1(m.pain_severity_avg)}/5`,
        'Fontos: magas fájdalomszint mellett ne növeld az edzésterhelést.');
  else if (m.pain_7d.length > 0)
    add('YELLOW', 'injury', `${m.pain_7d.length} fájdalom bejegyzés az elmúlt 7 napban`,
        null);

  m.chronic_pain_parts.forEach(part =>
    add('YELLOW', 'injury', `Visszatérő fájdalom: ${part.body_part} (${part.count}x az elmúlt 30 napban)`,
        'Krónikus sérülés gyanúja. Fizioterapeuta ajánlott.')
  );

  // ── Combined risk ─────────────────────────────────────────────────────────
  const highAcwr  = m.acwr !== null && m.acwr > 1.3;
  const lowHrv    = m.hrv_relative !== null && m.hrv_relative < 0.90;
  const poorSleep = m.sleep_score_7avg !== null && m.sleep_score_7avg < 65;
  if (highAcwr && lowHrv)
    add('RED', 'overtraining', 'Túlterhelés kombinált jel: magas ACWR + alacsony HRV',
        'Ez a kombináció erős overreaching/overtraining jel. Csökkentsd a terhelést és adj minimum 2-3 könnyű napot.');
  if (highAcwr && lowHrv && poorSleep)
    add('RED', 'overtraining', 'FIGYELEM: Magas ACWR + alacsony HRV + rossz alvás — overtraining szindróma kockázat',
        'Ha 1-2 héten belül nem javul a felépülés, konzultálj sportegészségügyi szakemberrel.');

  return flags.sort((a, b) => {
    const order = { RED: 0, YELLOW: 1, GREEN: 2 };
    return order[a.level] - order[b.level];
  });
}

// ─── Score computation ────────────────────────────────────────────────────────

function computeScores(m) {
  // Recovery readiness (0–100)
  let recovery = 100;
  if (m.hrv_relative !== null) {
    if (m.hrv_relative < 0.80) recovery -= 35;
    else if (m.hrv_relative < 0.90) recovery -= 20;
    else if (m.hrv_relative < 0.95) recovery -= 10;
    else if (m.hrv_relative > 1.10) recovery += 5;
  }
  if (m.hr_elevation !== null) {
    if (m.hr_elevation > 8) recovery -= 20;
    else if (m.hr_elevation > 5) recovery -= 12;
    else if (m.hr_elevation > 3) recovery -= 6;
    else if (m.hr_elevation < -3) recovery += 5; // lower than average = good
  }
  if (m.sleep_score_7avg !== null) {
    if (m.sleep_score_7avg < 50) recovery -= 25;
    else if (m.sleep_score_7avg < 65) recovery -= 15;
    else if (m.sleep_score_7avg < 75) recovery -= 8;
    else if (m.sleep_score_7avg > 85) recovery += 5;
  }
  if (m.bb_today_high !== null) {
    if (m.bb_today_high < 25) recovery -= 20;
    else if (m.bb_today_high < 40) recovery -= 12;
    else if (m.bb_today_high > 75) recovery += 5;
  }
  if (m.stress_7avg !== null) {
    if (m.stress_7avg > 50) recovery -= 15;
    else if (m.stress_7avg > 30) recovery -= 8;
    else if (m.stress_7avg < 15) recovery += 5;
  }
  recovery = Math.max(0, Math.min(100, Math.round(recovery)));

  // Training load risk (0-100, higher = more risk)
  let training_risk = 0;
  if (m.acwr !== null) {
    if (m.acwr > 1.5) training_risk += 50;
    else if (m.acwr > 1.3) training_risk += 25;
    else if (m.acwr > 1.1) training_risk += 10;
  }
  if (m.mileage_trend === 'increasing') training_risk += 10;
  if (m.pain_7d.length > 0) training_risk += m.pain_severity_avg * 5;
  training_risk = Math.max(0, Math.min(100, Math.round(training_risk)));

  // Sleep quality score (0-100)
  let sleep_quality = m.sleep_score_7avg ?? 50;
  sleep_quality = Math.max(0, Math.min(100, Math.round(sleep_quality)));

  // Overall health score
  const overall = Math.round(
    recovery * 0.4 +
    (100 - training_risk) * 0.2 +
    sleep_quality * 0.25 +
    ((m.bb_7avg_high ?? 50) / 100 * 100) * 0.15
  );

  const readiness_label =
    recovery >= 80 ? 'KÉSZ AZ EDZÉSRE'
    : recovery >= 65 ? 'MÉRSÉKELT TERHELÉS'
    : recovery >= 50 ? 'KÖNNYŰ NAP'
    : 'PIHENŐ NAP';

  const risk_label =
    training_risk >= 60 ? 'MAGAS KOCKÁZAT'
    : training_risk >= 30 ? 'MÉRSÉKELT KOCKÁZAT'
    : 'ALACSONY KOCKÁZAT';

  return {
    recovery, recovery_label: readiness_label,
    training_risk, risk_label,
    sleep_quality,
    overall,
  };
}

// ─── Summary builder ──────────────────────────────────────────────────────────

function buildSummary(metrics, flags, scores) {
  const m = metrics;
  const lines = [];

  lines.push(`Felépülési készenlét: ${scores.recovery}/100 — ${scores.recovery_label}`);
  lines.push(`Edzésterhelés kockázat: ${scores.training_risk}/100 — ${scores.risk_label}`);

  if (m.acwr !== null)
    lines.push(`ACWR: ${m.acwr} (akut: ${m.acute_km} km/hét, krónikus átlag: ${round1(m.chronic_km)} km/hét)`);

  if (m.hrv_last !== null)
    lines.push(`HRV: ${Math.round(m.hrv_last)} ms (30 napos átlag: ${round1(m.hrv_30avg)} ms, relatív: ${Math.round(m.hrv_relative * 100)}%)`);

  if (m.sleep_7avg_s)
    lines.push(`Átlagos alvás: ${fmtH(m.sleep_7avg_s)}/éj, score: ${round1(m.sleep_score_7avg)}/100, mély: ${round1(m.deep_pct_7avg)}%, REM: ${round1(m.rem_pct_7avg)}%`);

  const reds = flags.filter(f => f.level === 'RED').length;
  const yellows = flags.filter(f => f.level === 'YELLOW').length;
  if (reds > 0) lines.push(`⚠️ ${reds} kritikus figyelmeztetés, ${yellows} figyelmeztetés`);
  else if (yellows > 0) lines.push(`ℹ️ ${yellows} figyelmeztetés`);
  else lines.push('✓ Nincsenek kritikus jelek');

  return lines.join('\n');
}

// ─── LLM prompt builder ───────────────────────────────────────────────────────

function buildPrompt(metrics, flags, scores, raw) {
  const m = metrics;
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  const h = (text) => lines.push(`\n## ${text}`);
  const p = (text) => lines.push(text);
  const li = (text) => lines.push(`- ${text}`);

  p(`# Futó egészség és teljesítmény elemzés — ${today}`);
  p(`*Kérlek elemezd az alábbi adatokat és adj személyre szabott tanácsokat.*`);

  // ── Algorithmic pre-analysis ──────────────────────────────────────────────
  h('Algoritmus által kiszámított összefoglaló');
  p(`**Felépülési készenlét:** ${scores.recovery}/100 — ${scores.recovery_label}`);
  p(`**Edzésterhelés kockázat:** ${scores.training_risk}/100 — ${scores.risk_label}`);
  p(`**Alváskvalitás:** ${scores.sleep_quality}/100`);
  p(`**Összesített forma index:** ${scores.overall}/100`);

  if (flags.length > 0) {
    p('\n**Azonosított jelek:**');
    flags.forEach(f => {
      const icon = f.level === 'RED' ? '🔴' : '🟡';
      li(`${icon} [${f.category.toUpperCase()}] ${f.message}`);
      if (f.detail) li(`  → ${f.detail}`);
    });
  } else {
    li('✅ Nincsenek kritikus jelek');
  }

  // ── Training load ─────────────────────────────────────────────────────────
  h('Edzésterhelés (elmúlt 90 nap)');
  if (m.acwr !== null) {
    p(`**ACWR (Acute:Chronic Workload Ratio):** ${m.acwr}`);
    p(`- Akut heti km (7 nap): ${m.acute_km} km`);
    p(`- Krónikus heti átlag (28 nap): ${round1(m.chronic_km)} km`);
    p(`- Értékelés: ${m.acwr < 0.8 ? 'Alacsony (detraining veszély)' : m.acwr <= 1.3 ? 'Optimális zóna' : m.acwr <= 1.5 ? 'Emelt kockázat' : 'MAGAS KOCKÁZAT — sérülésveszély'}`);
  }
  p(`**Heti km trend (legutóbbi → 4 hete):** ${m.weekly_km_4.map(k => `${k} km`).join(' → ')} (${m.mileage_trend})`);

  if (m.recent_runs.length > 0) {
    p(`\n**Utolsó ${m.recent_runs.length} futás:**`);
    m.recent_runs.slice(0, 7).forEach(r => {
      const pace = r.pace_s ? `${Math.floor(r.pace_s/60)}:${String(Math.round(r.pace_s%60)).padStart(2,'0')} /km` : '—';
      li(`${r.date}: ${r.km} km @ ${pace}${r.avg_hr ? `, HR ${r.avg_hr} bpm` : ''}${r.aerobic_te ? `, TE ${r.aerobic_te.toFixed(1)}` : ''}`);
    });
  }

  if (m.vo2_latest) {
    p(`\n**VO2max becslés:** ${m.vo2_latest} ml/kg/min (trend: ${m.vo2_trend})`);
  }

  // ── Recovery ─────────────────────────────────────────────────────────────
  h('Felépülési mutatók (elmúlt 30 nap)');
  if (m.hrv_last !== null) {
    p(`**HRV (szívfrekvencia-variabilitás):**`);
    li(`Utolsó mért éjszaka: ${Math.round(m.hrv_last)} ms`);
    li(`7 napos átlag: ${round1(m.hrv_7avg)} ms`);
    li(`30 napos átlag (baseline): ${round1(m.hrv_30avg)} ms`);
    li(`Relatív baseline-hoz képest: ${Math.round(m.hrv_relative * 100)}%`);
    if (m.hrv_weekly_avg) li(`Garmin heti HRV átlag: ${Math.round(m.hrv_weekly_avg)} ms`);
    li(`Státusz: ${m.hrv_status ?? 'N/A'}`);
    li(`Trend: ${m.hrv_trend}`);
  }

  if (m.hr_today !== null) {
    p(`\n**Nyugalmi pulzus:**`);
    li(`Mai: ${m.hr_today} bpm`);
    li(`7 napos átlag: ${round1(m.hr_7avg)} bpm`);
    li(`30 napos átlag: ${round1(m.hr_30avg)} bpm`);
    li(`Eltérés az átlagtól: ${m.hr_elevation > 0 ? '+' : ''}${m.hr_elevation} bpm (${m.hr_elevation > 3 ? 'emelkedett — fáradtság/betegség jel' : 'normál'})`);
    li(`Trend: ${m.hr_trend}`);
  }

  if (m.bb_today_high !== null) {
    p(`\n**Body Battery:**`);
    li(`Mai csúcs: ${m.bb_today_high}/100 | Mai minimum: ${raw.latestHealth?.body_battery_low ?? '—'}/100`);
    li(`7 napos átlag csúcs: ${round1(m.bb_7avg_high)}/100`);
    if (m.bb_charged_7avg) li(`Átlagos feltöltés éjszaka: +${round1(m.bb_charged_7avg)} pont`);
    if (m.bb_drained_7avg) li(`Átlagos merülés napközben: -${round1(m.bb_drained_7avg)} pont`);
    li(`Trend: ${m.bb_trend}`);
  }

  // ── Sleep ─────────────────────────────────────────────────────────────────
  h('Alvásminőség (elmúlt 7–30 nap)');
  if (m.sleep_7avg_s) {
    li(`7 napos átlagos alváshossz: ${fmtH(m.sleep_7avg_s)} (30 napos: ${fmtH(m.sleep_30avg_s)})`);
    li(`7 napos átlag alvás-score: ${round1(m.sleep_score_7avg)}/100`);
    li(`Mély alvás átlag: ${round1(m.deep_pct_7avg)}% (optimum: 16–33%)`);
    li(`REM alvás átlag: ${round1(m.rem_pct_7avg)}% (optimum: 21–31%)`);
    li(`Alvásdeficit (7 nap, 8h optimumhoz képest): ${m.sleep_debt_7d_h}h`);
    li(`Alvás trend: ${m.sleep_trend}`);
    if (m.stress_7avg !== null) li(`Átlagos alvás közbeni stressz: ${round1(m.stress_7avg)}/100`);
  }

  // ── Pain log ─────────────────────────────────────────────────────────────
  h('Fájdalom és sérülés napló');
  if (raw.pain30.length === 0) {
    p('Nincs fájdalom bejegyzés az elmúlt 30 napban. ✓');
  } else {
    li(`Bejegyzések száma (30 nap): ${raw.pain30.length} | (7 nap): ${m.pain_7d.length}`);
    if (m.chronic_pain_parts.length > 0) {
      p('**Visszatérő fájdalom (krónikus sérülés gyanú):**');
      m.chronic_pain_parts.forEach(cp =>
        li(`${cp.body_part}: ${cp.count} alkalom, átlag súlyosság: ${round1(cp.avg_severity)}/5`)
      );
    }
    p('**Legutóbbi fájdalom bejegyzések:**');
    raw.pain30.slice(0, 5).forEach(p_entry =>
      li(`${p_entry.date}: ${p_entry.body_part} — súlyosság ${p_entry.severity}/5${p_entry.description ? ` — ${p_entry.description}` : ''}`)
    );
  }

  // ── Wellbeing ─────────────────────────────────────────────────────────────
  if (m.wellbeing_avg !== null) {
    h('Általános közérzet (naplóból)');
    li(`14 napos átlag közérzet: ${round1(m.wellbeing_avg)}/5`);
    if (raw.notes14.length > 0) {
      p('**Legutóbbi naplóbejegyzések:**');
      raw.notes14.slice(0, 3).forEach(n =>
        li(`${n.date}: "${n.content.slice(0, 120)}${n.content.length > 120 ? '…' : ''}"`)
      );
    }
  }

  // ── Questions ─────────────────────────────────────────────────────────────
  h('Kérdések az AI elemzéshez');
  p('Az adatok alapján kérem az alábbi elemzést:');
  p('');
  li('**Edzésterhelés értékelése:** Megfelelő-e a jelenlegi terhelés? Növeljem, csökkentsem, vagy tartsam?');
  li('**Felépülési állapot:** Milyen a jelenlegi felépülési kapacitásom? Mit tehetek a javítása érdekében?');
  li('**Sérülésveszély:** Azonosíthatók-e sérülési kockázati minták? Melyik testrésztől kell óvakodnom?');
  li('**Alvásoptimalizálás:** Hogyan javítsam az alváskvalitást a sportteljesítmény szempontjából?');
  li('**Következő 7–14 nap javaslata:** Konkrét edzésterv ajánlás (heti km, intenzitás, pihenőnapok).');
  li('**Hosszú távú trend:** Ha folytatom a jelenlegi mintát, mire számíthatok 4-6 héten belül?');
  li('**Prioritás lista:** Mi az a 3 legfontosabb dolog, amire most fókuszáljak?');

  p(`\n---`);
  p(`*Elemzés generálva: ${new Date().toISOString()} | HealthApp v1*`);

  return lines.join('\n');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function isWithinDays(dateStr, days) {
  const date = new Date(dateStr + 'T00:00:00');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

function daysDiff(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return Math.floor((now - date) / 86400000);
}

function sumKm(runs) {
  return round2(runs.reduce((sum, r) => sum + (r.distance_m ?? 0) / 1000, 0));
}

function avg(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v));
  if (!valid.length) return null;
  return round2(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function trendDirection(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v));
  if (valid.length < 2) return 'stable';
  const first = valid.slice(0, Math.ceil(valid.length / 2));
  const last  = valid.slice(Math.floor(valid.length / 2));
  const diff  = avg(last) - avg(first);
  if (Math.abs(diff) < 0.05 * (avg(valid) || 1)) return 'stable';
  return diff > 0 ? 'increasing' : 'decreasing';
}

function findChronicPainParts(pain30) {
  const counts = {};
  pain30.forEach(p => {
    if (!counts[p.body_part]) counts[p.body_part] = { count: 0, severities: [] };
    counts[p.body_part].count++;
    counts[p.body_part].severities.push(p.severity);
  });
  return Object.entries(counts)
    .filter(([, v]) => v.count >= 2)
    .map(([body_part, v]) => ({
      body_part,
      count: v.count,
      avg_severity: round1(v.severities.reduce((a, b) => a + b, 0) / v.severities.length),
    }))
    .sort((a, b) => b.count - a.count);
}

function fmtH(s) {
  if (!s) return '—';
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
}

function round2(n) { return n != null ? Math.round(n * 100) / 100 : null; }
function round1(n) { return n != null ? Math.round(n * 10) / 10 : null; }
