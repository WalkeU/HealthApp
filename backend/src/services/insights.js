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

  const acute_km   = sumKm(runs7);
  const chronic_km = sumKm(runs28) / 4;
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

  // ── VO2max ────────────────────────────────────────────────────────────────
  const vo2_data = runs90.filter(r => r.vo2max != null).slice(0, 10);
  const vo2_latest = vo2_data[0]?.vo2max ?? null;
  const vo2_trend = trendDirection(vo2_data.map(r => r.vo2max).reverse());

  // ── Recent runs ───────────────────────────────────────────────────────────
  const recent_runs = runs90.slice(0, 10).map(r => ({
    date: r.date,
    km: round2((r.distance_m ?? 0) / 1000),
    pace_s: r.avg_pace_s,
    avg_hr: r.avg_hr,
    aerobic_te: r.aerobic_te,
    name: r.name,
  }));

  return {
    acute_km, chronic_km, acwr, mileage_trend, weekly_km_4, recent_runs,
    hrv_last, hrv_7avg, hrv_30avg, hrv_relative, hrv_trend, hrv_status, hrv_weekly_avg,
    hr_today, hr_7avg, hr_30avg, hr_elevation, hr_trend,
    sleep_7avg_s, sleep_30avg_s, sleep_score_7avg, sleep_trend,
    deep_pct_7avg, rem_pct_7avg, sleep_debt_7d_h,
    bb_today_high, bb_7avg_high, bb_charged_7avg, bb_drained_7avg, bb_trend,
    stress_7avg,
    pain_7d, pain_14d, pain_severity_avg, chronic_pain_parts,
    wellbeing_avg,
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
      add('RED', 'training', `High training load — ACWR ${m.acwr} (>1.5 injury risk)`,
          'Acute weekly km far exceeds the chronic average. Reduce weekly volume by at least 20%.');
    else if (m.acwr > 1.3)
      add('YELLOW', 'training', `Elevated training load — ACWR ${m.acwr} (optimal: 0.8–1.3)`,
          'Monitor recovery signals. An easy week is recommended if HRV drops.');
    else if (m.acwr < 0.5 && m.chronic_km > 0)
      add('YELLOW', 'training', `Low training load — ACWR ${m.acwr} (detraining risk)`,
          'If not an intentional rest week, gradually rebuild volume.');
  }

  if (m.mileage_trend === 'increasing' && m.weekly_km_4[3] > 0) {
    const increase_pct = round2(((m.weekly_km_4[0] - m.weekly_km_4[3]) / m.weekly_km_4[3]) * 100);
    if (increase_pct > 30)
      add('YELLOW', 'training', `Rapid mileage increase — ${increase_pct}% over 4 weeks`,
          '10% rule: increase weekly km by no more than 10% per week to avoid overuse injuries.');
  }

  // ── HRV ──────────────────────────────────────────────────────────────────
  if (m.hrv_relative !== null) {
    if (m.hrv_relative < 0.85)
      add('RED', 'recovery', `HRV significantly below personal baseline (${Math.round(m.hrv_relative * 100)}%)`,
          'Strong fatigue/overload signal. Easy session or full rest recommended.');
    else if (m.hrv_relative < 0.92)
      add('YELLOW', 'recovery', `HRV slightly below personal baseline (${Math.round(m.hrv_relative * 100)}%)`,
          'Moderate fatigue. Keep intensity in lower zones today.');
  }

  if (m.hrv_status === 'UNBALANCED')
    add('YELLOW', 'recovery', 'HRV status: UNBALANCED',
        'Nervous system out of balance. Possible causes: stress, poor sleep, or excessive training intensity.');
  if (m.hrv_status === 'LOW')
    add('RED', 'recovery', 'HRV status: LOW',
        'Significant recovery deficit. Avoid hard sessions until HRV normalizes.');

  if (m.hrv_trend === 'decreasing')
    add('YELLOW', 'recovery', 'HRV downward trend over last 7 days',
        'Check sleep quality, hydration, and training load.');

  // ── Resting HR ────────────────────────────────────────────────────────────
  if (m.hr_elevation !== null && m.hr_elevation > 5)
    add('YELLOW', 'recovery', `Elevated resting HR (+${m.hr_elevation} bpm above average)`,
        'May indicate illness, dehydration, or overtraining. Consider a rest day.');
  if (m.hr_elevation !== null && m.hr_elevation > 8)
    add('RED', 'recovery', `Strongly elevated resting HR (+${m.hr_elevation} bpm)`,
        'Significant recovery deficit or possible illness. See a doctor if persistent.');

  // ── Sleep ─────────────────────────────────────────────────────────────────
  if (m.sleep_7avg_s !== null && m.sleep_7avg_s < 6 * 3600)
    add('RED', 'sleep', `Critically low sleep — 7-day average: ${fmtH(m.sleep_7avg_s)}`,
        'Body repairs during sleep. Performance, VO2max, and injury risk are directly affected.');
  else if (m.sleep_7avg_s !== null && m.sleep_7avg_s < 7 * 3600)
    add('YELLOW', 'sleep', `Insufficient sleep — 7-day average: ${fmtH(m.sleep_7avg_s)} (optimal: 8h+)`,
        null);

  if (m.sleep_debt_7d_h !== null && m.sleep_debt_7d_h > 5)
    add('YELLOW', 'sleep', `Sleep debt: ${m.sleep_debt_7d_h}h over the last 7 days`,
        'Sleep debt cannot be fully recovered in one long night. Gradual correction is needed.');

  if (m.deep_pct_7avg !== null && m.deep_pct_7avg < 12)
    add('YELLOW', 'sleep', `Low deep sleep — ${round1(m.deep_pct_7avg)}% (optimal: 16–33%)`,
        'Alcohol, late training sessions, and high stress reduce deep sleep.');
  if (m.rem_pct_7avg !== null && m.rem_pct_7avg < 15)
    add('YELLOW', 'sleep', `Low REM sleep — ${round1(m.rem_pct_7avg)}% (optimal: 21–31%)`,
        'REM is critical for motor learning and mental recovery.');

  if (m.sleep_score_7avg !== null && m.sleep_score_7avg < 60)
    add('YELLOW', 'sleep', `Poor sleep quality — average score: ${round1(m.sleep_score_7avg)}/100`,
        null);

  // ── Body Battery ─────────────────────────────────────────────────────────
  if (m.bb_today_high !== null && m.bb_today_high < 40)
    add('YELLOW', 'energy', `Low Body Battery peak — ${m.bb_today_high}/100`,
        'Limited available energy. Easy day recommended.');
  if (m.bb_today_high !== null && m.bb_today_high < 25)
    add('RED', 'energy', `Critically low Body Battery — ${m.bb_today_high}/100`,
        'Rest day. No intense training.');
  if (m.bb_trend === 'decreasing')
    add('YELLOW', 'energy', 'Body Battery downward trend over last week',
        'Body is not fully recharging overnight. Check sleep quality and stress load.');

  // ── Pain ──────────────────────────────────────────────────────────────────
  if (m.pain_severity_avg > 3)
    add('RED', 'injury', `High pain level over last 7 days — avg: ${round1(m.pain_severity_avg)}/5`,
        'Important: do not increase training load while experiencing high pain levels.');
  else if (m.pain_7d.length > 0)
    add('YELLOW', 'injury', `${m.pain_7d.length} pain log entries in the last 7 days`,
        null);

  m.chronic_pain_parts.forEach(part =>
    add('YELLOW', 'injury', `Recurring pain: ${part.body_part} (${part.count}x in last 30 days)`,
        'Possible chronic injury. Consider seeing a physiotherapist.')
  );

  // ── Combined risk ─────────────────────────────────────────────────────────
  const highAcwr  = m.acwr !== null && m.acwr > 1.3;
  const lowHrv    = m.hrv_relative !== null && m.hrv_relative < 0.90;
  const poorSleep = m.sleep_score_7avg !== null && m.sleep_score_7avg < 65;

  if (highAcwr && lowHrv)
    add('RED', 'overtraining', 'Combined overload signal: high ACWR + low HRV',
        'This combination is a strong overreaching/overtraining signal. Reduce load and take 2–3 easy days minimum.');
  if (highAcwr && lowHrv && poorSleep)
    add('RED', 'overtraining', 'WARNING: High ACWR + low HRV + poor sleep — overtraining syndrome risk',
        'If recovery does not improve within 1–2 weeks, consult a sports medicine professional.');

  return flags.sort((a, b) => {
    const order = { RED: 0, YELLOW: 1, GREEN: 2 };
    return order[a.level] - order[b.level];
  });
}

// ─── Score computation ────────────────────────────────────────────────────────

function computeScores(m) {
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
    else if (m.hr_elevation < -3) recovery += 5;
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

  let training_risk = 0;
  if (m.acwr !== null) {
    if (m.acwr > 1.5) training_risk += 50;
    else if (m.acwr > 1.3) training_risk += 25;
    else if (m.acwr > 1.1) training_risk += 10;
  }
  if (m.mileage_trend === 'increasing') training_risk += 10;
  if (m.pain_7d.length > 0) training_risk += m.pain_severity_avg * 5;
  training_risk = Math.max(0, Math.min(100, Math.round(training_risk)));

  let sleep_quality = m.sleep_score_7avg ?? 50;
  sleep_quality = Math.max(0, Math.min(100, Math.round(sleep_quality)));

  const overall = Math.round(
    recovery * 0.4 +
    (100 - training_risk) * 0.2 +
    sleep_quality * 0.25 +
    ((m.bb_7avg_high ?? 50) / 100 * 100) * 0.15
  );

  const recovery_label =
    recovery >= 80 ? 'READY TO TRAIN'
    : recovery >= 65 ? 'MODERATE LOAD'
    : recovery >= 50 ? 'EASY DAY'
    : 'REST DAY';

  const risk_label =
    training_risk >= 60 ? 'HIGH RISK'
    : training_risk >= 30 ? 'MODERATE RISK'
    : 'LOW RISK';

  return { recovery, recovery_label, training_risk, risk_label, sleep_quality, overall };
}

// ─── Summary builder ──────────────────────────────────────────────────────────

function buildSummary(metrics, flags, scores) {
  const m = metrics;
  const lines = [];

  lines.push(`Recovery readiness: ${scores.recovery}/100 — ${scores.recovery_label}`);
  lines.push(`Training load risk: ${scores.training_risk}/100 — ${scores.risk_label}`);

  if (m.acwr !== null)
    lines.push(`ACWR: ${m.acwr} (acute: ${m.acute_km} km/wk, chronic avg: ${round1(m.chronic_km)} km/wk)`);

  if (m.hrv_last !== null)
    lines.push(`HRV: ${Math.round(m.hrv_last)} ms (30-day avg: ${round1(m.hrv_30avg)} ms, relative: ${Math.round(m.hrv_relative * 100)}%)`);

  if (m.sleep_7avg_s)
    lines.push(`Avg sleep: ${fmtH(m.sleep_7avg_s)}/night, score: ${round1(m.sleep_score_7avg)}/100, deep: ${round1(m.deep_pct_7avg)}%, REM: ${round1(m.rem_pct_7avg)}%`);

  const reds = flags.filter(f => f.level === 'RED').length;
  const yellows = flags.filter(f => f.level === 'YELLOW').length;
  if (reds > 0) lines.push(`⚠️ ${reds} critical alert(s), ${yellows} warning(s)`);
  else if (yellows > 0) lines.push(`ℹ️ ${yellows} warning(s)`);
  else lines.push('✓ No critical signals detected');

  return lines.join('\n');
}

// ─── LLM prompt builder ───────────────────────────────────────────────────────

function buildPrompt(metrics, flags, scores, raw) {
  const m = metrics;
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  const h  = (text) => lines.push(`\n## ${text}`);
  const p  = (text) => lines.push(text);
  const li = (text) => lines.push(`- ${text}`);

  p(`# Running Health & Performance Analysis — ${today}`);
  p(`*Please analyze the following data and provide personalized recommendations.*`);

  // ── Algorithmic pre-analysis ──────────────────────────────────────────────
  h('Algorithmic Summary');
  p(`**Recovery readiness:** ${scores.recovery}/100 — ${scores.recovery_label}`);
  p(`**Training load risk:** ${scores.training_risk}/100 — ${scores.risk_label}`);
  p(`**Sleep quality:** ${scores.sleep_quality}/100`);
  p(`**Overall form index:** ${scores.overall}/100`);

  if (flags.length > 0) {
    p('\n**Identified signals:**');
    flags.forEach(f => {
      const icon = f.level === 'RED' ? '🔴' : '🟡';
      li(`${icon} [${f.category.toUpperCase()}] ${f.message}`);
      if (f.detail) li(`  → ${f.detail}`);
    });
  } else {
    li('✅ No critical signals detected');
  }

  // ── Training load ─────────────────────────────────────────────────────────
  h('Training Load (last 90 days)');
  if (m.acwr !== null) {
    p(`**ACWR (Acute:Chronic Workload Ratio):** ${m.acwr}`);
    li(`Acute weekly km (7 days): ${m.acute_km} km`);
    li(`Chronic weekly average (28 days): ${round1(m.chronic_km)} km`);
    li(`Assessment: ${m.acwr < 0.8 ? 'Low (detraining risk)' : m.acwr <= 1.3 ? 'Optimal zone' : m.acwr <= 1.5 ? 'Elevated risk' : 'HIGH RISK — injury danger'}`);
  }
  p(`**Weekly km trend (current → 4 weeks ago):** ${m.weekly_km_4.map(k => `${k} km`).join(' → ')} (${m.mileage_trend})`);

  if (m.recent_runs.length > 0) {
    p(`\n**Last ${m.recent_runs.length} runs:**`);
    m.recent_runs.slice(0, 7).forEach(r => {
      const pace = r.pace_s ? `${Math.floor(r.pace_s/60)}:${String(Math.round(r.pace_s%60)).padStart(2,'0')} /km` : '—';
      li(`${r.date}: ${r.km} km @ ${pace}${r.avg_hr ? `, HR ${r.avg_hr} bpm` : ''}${r.aerobic_te ? `, TE ${r.aerobic_te.toFixed(1)}` : ''}`);
    });
  }

  if (m.vo2_latest)
    p(`\n**VO2max estimate:** ${m.vo2_latest} ml/kg/min (trend: ${m.vo2_trend})`);

  // ── Recovery ─────────────────────────────────────────────────────────────
  h('Recovery Indicators (last 30 days)');
  if (m.hrv_last !== null) {
    p(`**HRV (Heart Rate Variability):**`);
    li(`Last night: ${Math.round(m.hrv_last)} ms`);
    li(`7-day average: ${round1(m.hrv_7avg)} ms`);
    li(`30-day baseline: ${round1(m.hrv_30avg)} ms`);
    li(`Relative to baseline: ${Math.round(m.hrv_relative * 100)}%`);
    if (m.hrv_weekly_avg) li(`Garmin weekly HRV avg: ${Math.round(m.hrv_weekly_avg)} ms`);
    li(`Status: ${m.hrv_status ?? 'N/A'}`);
    li(`Trend: ${m.hrv_trend}`);
  }

  if (m.hr_today !== null) {
    p(`\n**Resting Heart Rate:**`);
    li(`Today: ${m.hr_today} bpm`);
    li(`7-day average: ${round1(m.hr_7avg)} bpm`);
    li(`30-day average: ${round1(m.hr_30avg)} bpm`);
    li(`Deviation from average: ${m.hr_elevation > 0 ? '+' : ''}${m.hr_elevation} bpm (${m.hr_elevation > 3 ? 'elevated — fatigue/illness signal' : 'normal'})`);
    li(`Trend: ${m.hr_trend}`);
  }

  if (m.bb_today_high !== null) {
    p(`\n**Body Battery:**`);
    li(`Today peak: ${m.bb_today_high}/100 | Today low: ${raw.latestHealth?.body_battery_low ?? '—'}/100`);
    li(`7-day average peak: ${round1(m.bb_7avg_high)}/100`);
    if (m.bb_charged_7avg) li(`Average overnight charge: +${round1(m.bb_charged_7avg)} pts`);
    if (m.bb_drained_7avg) li(`Average daily drain: -${round1(m.bb_drained_7avg)} pts`);
    li(`Trend: ${m.bb_trend}`);
  }

  // ── Sleep ─────────────────────────────────────────────────────────────────
  h('Sleep Quality (last 7–30 days)');
  if (m.sleep_7avg_s) {
    li(`7-day average duration: ${fmtH(m.sleep_7avg_s)} (30-day: ${fmtH(m.sleep_30avg_s)})`);
    li(`7-day average sleep score: ${round1(m.sleep_score_7avg)}/100`);
    li(`Deep sleep average: ${round1(m.deep_pct_7avg)}% (optimal: 16–33%)`);
    li(`REM sleep average: ${round1(m.rem_pct_7avg)}% (optimal: 21–31%)`);
    li(`Sleep debt (7 days vs 8h optimal): ${m.sleep_debt_7d_h}h`);
    li(`Sleep trend: ${m.sleep_trend}`);
    if (m.stress_7avg !== null) li(`Average sleep stress: ${round1(m.stress_7avg)}/100`);
  }

  // ── Pain log ─────────────────────────────────────────────────────────────
  h('Pain & Injury Log');
  if (raw.pain30.length === 0) {
    p('No pain entries in the last 30 days. ✓');
  } else {
    li(`Entries (30 days): ${raw.pain30.length} | (7 days): ${m.pain_7d.length}`);
    if (m.chronic_pain_parts.length > 0) {
      p('**Recurring pain (possible chronic injury):**');
      m.chronic_pain_parts.forEach(cp =>
        li(`${cp.body_part}: ${cp.count} occurrences, avg severity: ${round1(cp.avg_severity)}/5`)
      );
    }
    p('**Recent pain entries:**');
    raw.pain30.slice(0, 5).forEach(entry =>
      li(`${entry.date}: ${entry.body_part} — severity ${entry.severity}/5${entry.description ? ` — ${entry.description}` : ''}`)
    );
  }

  // ── Wellbeing ─────────────────────────────────────────────────────────────
  if (m.wellbeing_avg !== null) {
    h('General Wellbeing (from journal)');
    li(`14-day average wellbeing: ${round1(m.wellbeing_avg)}/5`);
    if (raw.notes14.length > 0) {
      p('**Recent journal entries:**');
      raw.notes14.slice(0, 3).forEach(n =>
        li(`${n.date}: "${n.content.slice(0, 120)}${n.content.length > 120 ? '…' : ''}"`)
      );
    }
  }

  // ── Questions ─────────────────────────────────────────────────────────────
  h('Questions for AI Analysis');
  p('Based on this data, please provide:');
  p('');
  li('**Training load assessment:** Is my current load appropriate? Should I increase, decrease, or maintain?');
  li('**Recovery status:** What is my current recovery capacity? What can I do to improve it?');
  li('**Injury risk:** Are there any injury risk patterns? Which body parts should I monitor?');
  li('**Sleep optimization:** How can I improve sleep quality for better athletic performance?');
  li('**Next 7–14 day plan:** Specific training recommendations (weekly km, intensity, rest days).');
  li('**Long-term trend:** If I continue the current pattern, what can I expect in 4–6 weeks?');
  li('**Priority list:** What are the 3 most important things I should focus on right now?');

  p(`\n---`);
  p(`*Analysis generated: ${new Date().toISOString()} | HealthApp v1*`);

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
