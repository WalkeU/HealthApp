/**
 * Apple Health XML import service.
 * Parses export.xml from iPhone → populates activities + health_daily tables.
 */
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { activityQueries, healthQueries } from '../db/queries.js';

const parseXml = promisify(parseString);

export async function importAppleHealth(xmlBuffer) {
  const xml = xmlBuffer.toString('utf-8');
  const parsed = await parseXml(xml, { explicitArray: true });

  const records = parsed?.HealthData?.Record ?? [];
  const workouts = parsed?.HealthData?.Workout ?? [];

  let healthImported = 0;
  let activitiesImported = 0;

  // Group health records by date
  const byDate = {};
  for (const rec of records) {
    const r = rec.$;
    const date = r.startDate?.slice(0, 10);
    if (!date) continue;
    if (!byDate[date]) byDate[date] = {};

    switch (r.type) {
      case 'HKQuantityTypeIdentifierRestingHeartRate':
        byDate[date].resting_hr = Math.round(parseFloat(r.value));
        break;
      case 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN':
        byDate[date].hrv = parseFloat(r.value);
        break;
      case 'HKCategoryTypeIdentifierSleepAnalysis':
        // Accumulate sleep duration
        if (r.value === 'HKCategoryValueSleepAnalysisAsleep') {
          const start = new Date(r.startDate);
          const end = new Date(r.endDate);
          byDate[date].sleep_duration_s = (byDate[date].sleep_duration_s ?? 0) + Math.round((end - start) / 1000);
        }
        break;
      case 'HKQuantityTypeIdentifierStepCount':
        byDate[date].steps = (byDate[date].steps ?? 0) + parseInt(r.value, 10);
        break;
      case 'HKQuantityTypeIdentifierBodyMass':
        byDate[date].weight_kg = parseFloat(r.value);
        break;
    }
  }

  for (const [date, data] of Object.entries(byDate)) {
    if (Object.keys(data).length === 0) continue;
    healthQueries.upsert({
      date,
      source: 'apple_health',
      resting_hr: data.resting_hr ?? null,
      hrv: data.hrv ?? null,
      sleep_duration_s: data.sleep_duration_s ?? null,
      sleep_score: null,
      steps: data.steps ?? null,
      weight_kg: data.weight_kg ?? null,
      raw_json: null,
    });
    healthImported++;
  }

  for (const wo of workouts) {
    const w = wo.$;
    const type = w.workoutActivityType;
    const actType = type?.includes('Running') ? 'run' : type?.toLowerCase().replace('hkworkoutactivitytype', '') ?? 'other';

    const start = new Date(w.startDate);
    const end = new Date(w.endDate);
    const duration_s = Math.round((end - start) / 1000);

    const distanceStat = wo.WorkoutStatistics?.find?.(s => s.$?.type?.includes('Distance'));
    const hrStat = wo.WorkoutStatistics?.find?.(s => s.$?.type?.includes('HeartRate') && s.$?.average);

    activityQueries.upsert({
      source: 'apple_health',
      external_id: `${w.startDate}_${type}`,
      date: w.startDate?.slice(0, 10),
      type: actType,
      distance_m: distanceStat ? parseFloat(distanceStat.$.sum) * (distanceStat.$.unit === 'km' ? 1000 : 1) : null,
      duration_s,
      avg_hr: hrStat ? Math.round(parseFloat(hrStat.$.average)) : null,
      max_hr: hrStat ? Math.round(parseFloat(hrStat.$.maximum ?? 0)) || null : null,
      elevation_m: null,
      avg_pace_s: null,
      name: null,
      raw_json: JSON.stringify(w),
    });
    activitiesImported++;
  }

  return { ok: true, healthImported, activitiesImported };
}
