import pkg from 'garmin-connect';
const { GarminConnect } = pkg;
import { configQueries, activityQueries, healthQueries } from '../db/queries.js';

const HEALTH_DAYS_BACK = 30;

export async function syncGarmin() {
  const log = [];
  const ts    = () => new Date().toISOString().slice(11, 19);
  const info  = (msg) => { log.push(`[${ts()}] ${msg}`);   console.log(`[garmin] ${msg}`); };
  const warn  = (msg) => { log.push(`[${ts()}] ⚠ ${msg}`); console.warn(`[garmin] ${msg}`); };

  const email    = process.env.GARMIN_EMAIL    || configQueries.get('garmin_email');
  const password = process.env.GARMIN_PASSWORD || configQueries.get('garmin_password');
  if (!email || !password) return { ok: false, log, message: 'Garmin credentials not configured.' };

  info(`Logging in as ${email}…`);
  let client;
  try {
    client = new GarminConnect({ username: email, password });
    await client.login();
    info('Login OK.');
  } catch (err) {
    warn(`Login failed: ${err.message}`);
    return { ok: false, log, message: `Login failed: ${err.message}` };
  }

  const [activitiesImported, healthImported] = await Promise.all([
    syncActivities(client, info, warn),
    syncHealth(client, info, warn),
  ]);

  configQueries.set('garmin_last_sync', new Date().toISOString());
  info(`Done. Activities: ${activitiesImported}, health days: ${healthImported}`);
  return { ok: true, log, activitiesImported, healthImported };
}

// ─── Activities ──────────────────────────────────────────────────────────────

async function syncActivities(client, info, warn) {
  const lastSync = configQueries.get('garmin_last_sync');
  const limit    = lastSync ? 50 : 200;
  info(`Fetching last ${limit} activities${lastSync ? ` (since ${lastSync.slice(0, 10)})` : ' (first sync)'}…`);

  let activities;
  try {
    activities = await client.getActivities(0, limit);
    info(`Got ${activities.length} activities from Garmin.`);
  } catch (err) {
    warn(`getActivities failed: ${err.message}`);
    return 0;
  }

  let count = 0;
  for (const a of activities) {
    try {
      activityQueries.upsert(mapActivity(a));
      count++;
    } catch (err) {
      warn(`Failed to save activity ${a.activityId}: ${err.message}`);
    }
  }
  info(`Upserted ${count} activities.`);
  return count;
}

function mapActivity(r) {
  const typeKey = r.activityType?.typeKey ?? '';
  const isRun   = typeKey.includes('running') || typeKey.includes('run');
  const type    = isRun ? 'run' : typeKey || 'other';

  // pace: seconds per km from m/s
  const avg_pace_s = r.averageSpeed > 0 ? Math.round(1000 / r.averageSpeed) : null;

  return {
    source:      'garmin',
    external_id: String(r.activityId),
    date:        r.startTimeLocal?.slice(0, 10) ?? null,
    type,
    name:        r.activityName ?? null,

    // Distance / time
    distance_m:          r.distance            ?? null,
    duration_s:          r.duration            ? Math.round(r.duration)          : null,
    elapsed_duration_s:  r.elapsedDuration     ? Math.round(r.elapsedDuration)   : null,
    moving_duration_s:   r.movingDuration      ? Math.round(r.movingDuration)    : null,
    avg_pace_s,
    avg_speed_ms:        r.averageSpeed        ?? null,
    max_speed_ms:        r.maxSpeed            ?? null,

    // Heart rate
    avg_hr:      r.averageHR         ? Math.round(r.averageHR)         : null,
    max_hr:      r.maxHR             ? Math.round(r.maxHR)             : null,
    hr_zone1_s:  r.hrTimeInZone_1    ? Math.round(r.hrTimeInZone_1)    : null,
    hr_zone2_s:  r.hrTimeInZone_2    ? Math.round(r.hrTimeInZone_2)    : null,
    hr_zone3_s:  r.hrTimeInZone_3    ? Math.round(r.hrTimeInZone_3)    : null,
    hr_zone4_s:  r.hrTimeInZone_4    ? Math.round(r.hrTimeInZone_4)    : null,
    hr_zone5_s:  r.hrTimeInZone_5    ? Math.round(r.hrTimeInZone_5)    : null,

    // Elevation / calories
    elevation_m:      r.elevationGain   ?? null,
    elevation_loss_m: r.elevationLoss   ?? null,
    calories:         r.calories        ? Math.round(r.calories)        : null,

    // Running dynamics
    avg_cadence:              r.averageRunningCadenceInStepsPerMinute ? Math.round(r.averageRunningCadenceInStepsPerMinute) : null,
    max_cadence:              r.maxRunningCadenceInStepsPerMinute     ? Math.round(r.maxRunningCadenceInStepsPerMinute)     : null,
    avg_stride_length_m:      r.avgStrideLength         ?? null,
    avg_vertical_oscillation: r.avgVerticalOscillation  ?? null,
    avg_ground_contact_time:  r.avgGroundContactTime    ?? null,
    avg_vertical_ratio:       r.avgVerticalRatio        ?? null,
    steps:                    r.steps                   ?? null,

    // Power
    avg_power:  r.avgPower   ?? null,
    max_power:  r.maxPower   ?? null,
    norm_power: r.normPower  ?? null,

    // Training load
    aerobic_te:           r.aerobicTrainingEffect   ?? null,
    anaerobic_te:         r.anaerobicTrainingEffect ?? null,
    training_effect_label: r.trainingEffectLabel    ?? null,
    vo2max:               r.vO2MaxValue             ?? r.vo2MaxValue ?? null,

    // Meta
    location_name: r.locationName ?? null,
    is_pr:         r.pr ? 1 : 0,
    raw_json:      JSON.stringify(r),
  };
}

// ─── Daily health ─────────────────────────────────────────────────────────────

async function syncHealth(client, info, warn) {
  info(`Fetching health data for last ${HEALTH_DAYS_BACK} days…`);
  const today = new Date();
  let count = 0;

  for (let i = 0; i < HEALTH_DAYS_BACK; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    try {
      const entry = await fetchDailyHealth(client, date);
      if (entry) {
        healthQueries.upsert(entry);
        count++;
        const parts = [];
        if (entry.resting_hr)        parts.push(`HR=${entry.resting_hr}`);
        if (entry.hrv != null)       parts.push(`HRV=${Math.round(entry.hrv)} (${entry.hrv_status ?? '?'})`);
        if (entry.deep_sleep_s)      parts.push(`deep=${Math.round(entry.deep_sleep_s/60)}m`);
        if (entry.rem_sleep_s)       parts.push(`REM=${Math.round(entry.rem_sleep_s/60)}m`);
        if (entry.light_sleep_s)     parts.push(`light=${Math.round(entry.light_sleep_s/60)}m`);
        if (entry.spo2_avg)          parts.push(`SpO2=${entry.spo2_avg}%`);
        if (entry.nap_duration_s)    parts.push(`nap=${Math.round(entry.nap_duration_s/60)}m`);
        if (entry.body_battery_high != null) parts.push(`BB ${entry.body_battery_low}→${entry.body_battery_high} (+${entry.body_battery_charged ?? '?'}/-${entry.body_battery_drained ?? '?'})`);
        if (entry.steps)             parts.push(`steps=${entry.steps}`);
        info(`  ${dateStr}: ${parts.join(', ') || 'no data'}`);
      } else {
        info(`  ${dateStr}: no data`);
      }
    } catch (err) {
      warn(`  ${dateStr}: ${err.message}`);
    }
  }
  return count;
}

const GC_API = 'https://connectapi.garmin.com';

async function fetchDailyHealth(client, date) {
  const dateStr = date.toISOString().slice(0, 10);

  const [hrRes, sleepRes, stepsRes, weightRes, hrvRes, bbRes] = await Promise.allSettled([
    client.getHeartRate(date),
    client.getSleepData(date),
    client.getSteps(date),
    client.getDailyWeightData(date),
    client.get(`${GC_API}/hrv-service/hrv/${dateStr}`),
    // Correct body battery endpoint: reports/daily with query params
    client.get(`${GC_API}/wellness-service/wellness/bodyBattery/reports/daily`, {
      params: { startDate: dateStr, endDate: dateStr },
    }),
  ]);

  const hr     = hrRes.status     === 'fulfilled' ? hrRes.value     : null;
  const sleep  = sleepRes.status  === 'fulfilled' ? sleepRes.value  : null;
  const steps  = stepsRes.status  === 'fulfilled' ? stepsRes.value  : null;
  const weight = weightRes.status === 'fulfilled' ? weightRes.value : null;
  const hrvRaw = hrvRes.status    === 'fulfilled' ? hrvRes.value    : null;
  const bbRaw  = bbRes.status     === 'fulfilled' ? bbRes.value     : null;

  const hrvSummary = hrvRaw?.hrvSummary ?? null;

  // reports/daily returns an array; derive max/min from the intraday values array
  const bbDay = Array.isArray(bbRaw) ? bbRaw[0] : bbRaw ?? null;
  const bbValues = (bbDay?.bodyBatteryValuesArray ?? [])
    .map(v => v[1])
    .filter(v => v != null && v >= 0);
  const body_battery_high    = bbValues.length ? Math.max(...bbValues)   : null;
  const body_battery_low     = bbValues.length ? Math.min(...bbValues)   : null;
  const body_battery_charged = bbDay?.charged ?? null;
  const body_battery_drained = bbDay?.drained ?? null;

  // sleep is the FULL response: { dailySleepDTO, sleepLevels, sleepMovement, ... }
  const dto = sleep?.dailySleepDTO ?? null;

  const spo2     = dto?.averageSpO2Value ?? dto?.spO2SleepSummary?.averageSpO2 ?? null;
  const spo2_min = dto?.lowestSpO2Value  ?? null;

  const resting_hr        = hr?.restingHeartRate                       ?? null;
  const max_hr_day        = hr?.maxHeartRate                           ?? null;
  const sleep_duration_s  = dto?.sleepTimeSeconds                      ?? null;
  const deep_sleep_s      = dto?.deepSleepSeconds                      ?? null;
  const light_sleep_s     = dto?.lightSleepSeconds                     ?? null;
  const rem_sleep_s       = dto?.remSleepSeconds                       ?? null;
  const awake_s           = dto?.awakeSleepSeconds                     ?? null;
  const sleep_score       = dto?.sleepScores?.overall?.value           ?? null;
  const sleep_rem_pct     = dto?.sleepScores?.remPercentage?.value     ?? null;
  const sleep_deep_pct    = dto?.sleepScores?.deepPercentage?.value    ?? null;
  const sleep_restfulness = dto?.sleepScores?.restfulness?.value       ?? null;
  const avg_stress        = dto?.avgSleepStress                        ?? null;
  const avg_respiration   = dto?.averageRespirationValue               ?? null;
  const min_respiration   = dto?.lowestRespirationValue                ?? null;
  const max_respiration   = dto?.highestRespirationValue               ?? null;
  const avg_sleep_hr      = dto?.avgHeartRate                          ?? null;
  const awake_count       = dto?.awakeCount                            ?? null;
  const sleep_feedback    = dto?.sleepScoreFeedback                    ?? null;
  // sleepNeed.baseline/actual are in minutes
  const sleep_need_min    = dto?.sleepNeed?.actual ?? dto?.nextSleepNeed?.actual ?? null;
  const nap_duration_s    = dto?.napTimeSeconds   ?? null;
  const nap_count         = Array.isArray(dto?.dailyNapDTOS) ? dto.dailyNapDTOS.length : (nap_duration_s > 0 ? 1 : null);
  const total_steps       = typeof steps === 'number' ? steps : null;
  const weight_kg         = weight?.dailyWeightSummaries?.[0]?.weightInGrams
    ? weight.dailyWeightSummaries[0].weightInGrams / 1000
    : null;

  const hasData = [resting_hr, sleep_duration_s, hrvSummary?.lastNight, total_steps].some(v => v != null);
  if (!hasData) return null;

  return {
    date:   dateStr,
    source: 'garmin',
    resting_hr,
    max_hr_day,
    hrv:            hrvSummary?.lastNight  ?? null,
    hrv_weekly_avg: hrvSummary?.weeklyAvg  ?? null,
    hrv_status:     hrvSummary?.status     ?? null,
    sleep_duration_s,
    sleep_score,
    deep_sleep_s,
    light_sleep_s,
    rem_sleep_s,
    awake_s,
    sleep_rem_pct,
    sleep_deep_pct,
    sleep_restfulness,
    spo2_avg:         spo2,
    spo2_min,
    avg_stress,
    body_battery_high,
    body_battery_low,
    body_battery_charged,
    body_battery_drained,
    avg_respiration,
    min_respiration,
    max_respiration,
    avg_sleep_hr,
    awake_count,
    sleep_feedback,
    sleep_need_min,
    nap_duration_s,
    nap_count,
    steps:    total_steps,
    weight_kg,
    // Store full responses so sleepLevels, hrvReadings etc. are queryable later
    raw_json: JSON.stringify({ hr, sleep, hrv: hrvRaw, bodyBattery: bbDay, steps, weight }),
  };
}
