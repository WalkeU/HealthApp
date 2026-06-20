# Garmin Connect API — Adat referencia

> Dokumentálja a Garmin Connect API-ból elérhető összes mezőt, ahogy a `raw_json` oszlopban tárolódnak a `health_daily` és `activities` táblákban.

---

## health_daily.raw_json struktúra

A `raw_json` egy JSON objektum, amely 5 API hívás eredményét tárolja:

```json
{
  "hr":          { ... },   // getHeartRate()
  "sleep":       { ... },   // getSleepData()
  "hrv":         { ... },   // GET /hrv-service/hrv/{date}
  "bodyBattery": { ... },   // GET /wellness-service/wellness/bodyBattery/reports/daily
  "steps":       1234,      // getSteps() → szám közvetlenül
  "weight":      { ... }    // getDailyWeightData()
}
```

---

## hr — Napi pulzus (`getHeartRate`)

**Endpoint:** `/wellness-service/wellness/dailyHeartRate?date={YYYY-MM-DD}`

```
hr.userProfilePK                     — Garmin profil azonosító
hr.calendarDate                      — "2026-06-19"
hr.startTimestampGMT                 — "2026-06-18T22:00:00.0"
hr.endTimestampGMT                   — "2026-06-19T22:00:00.0"
hr.startTimestampLocal               — "2026-06-19T00:00:00.0"
hr.endTimestampLocal                 — "2026-06-20T00:00:00.0"
hr.maxHeartRate                      — nap maximális pulsus (bpm)
hr.minHeartRate                      — nap minimális pulsus (bpm)
hr.restingHeartRate                  — NYUGALMI PULZUS (bpm) ✓ tárolt
hr.lastSevenDaysAvgRestingHeartRate  — 7 napos átlag nyugalmi HR
hr.heartRateValueDescriptors         — [{index: 0, key: "timestamp"}, {index: 1, key: "heartrate"}]
hr.heartRateValues                   — [[timestamp_ms, bpm], ...] — 2 perces felbontás, egész nap
                                       (null értékek lehetségesek ahol nincs adat)
```

**Nincs tárolva, de elérhető:**
- `heartRateValues` — teljes napi HR idősoros adat (alvás + nap)
- `lastSevenDaysAvgRestingHeartRate`

---

## sleep — Alvásmérés (`getSleepData`)

**Endpoint:** `/sleep-service/sleep/dailySleepData?date={YYYY-MM-DD}`

### sleep.dailySleepDTO

```
.id                              — alvás rekord azonosítója (timestamp)
.calendarDate                    — "2026-06-19"
.sleepTimeSeconds                — TELJES ALVÁSIDŐ másodpercben ✓ tárolt
.napTimeSeconds                  — szundi ideje másodpercben ✓ tárolt
.sleepWindowConfirmed            — true/false
.sleepWindowConfirmationType     — "enhanced_confirmed_final"
.sleepStartTimestampGMT          — elalvás időpontja (GMT timestamp ms)
.sleepEndTimestampGMT            — ébredés időpontja (GMT timestamp ms)
.sleepStartTimestampLocal        — elalvás helyi időben
.sleepEndTimestampLocal          — ébredés helyi időben
.unmeasurableSleepSeconds        — nem mérhető alvás (pl. levette az órát)
.deepSleepSeconds                — MÉLY ALVÁS ✓ tárolt
.lightSleepSeconds               — KÖNNYŰ ALVÁS ✓ tárolt
.remSleepSeconds                 — REM ALVÁS ✓ tárolt
.awakeSleepSeconds               — ÉBREN TÖLTÖTT IDŐ (alvás közben) ✓ tárolt
.deviceRemCapable                — true (óra képes REM mérésre)
.averageRespirationValue         — ÁTLAGOS LÉGZÉSSZÁM (légzés/perc) ✓ tárolt
.lowestRespirationValue          — legalacsonyabb légzésszám ✓ tárolt
.highestRespirationValue         — legmagasabb légzésszám ✓ tárolt
.awakeCount                      — ÉBREDÉSEK SZÁMA ✓ tárolt
.avgSleepStress                  — alvás közbeni átlagos stressz szint ✓ tárolt
.ageGroup                        — "ADULT"
.avgHeartRate                    — ÁTLAGOS PULZUS ALVÁS KÖZBEN ✓ tárolt
.sleepScoreFeedback              — GARMIN SZÖVEGES ÉRTÉKELÉS ✓ tárolt
                                   pl. "POSITIVE_HIGHLY_RECOVERING"
                                       "NEGATIVE_SHORT_AND_NONRECOVERING"
.sleepScoreInsight               — "NONE", "NEGATIVE_LATE_BED_TIME" stb.
.sleepScorePersonalizedInsight   — "STRESS_POS_EXCELLENT_OR_GOOD_SLEEP_RESTFUL_EVENING"

.sleepScores.totalDuration       — {qualifierKey: "EXCELLENT"/"GOOD"/"FAIR"/"POOR", optimalStart, optimalEnd}
.sleepScores.stress              — stressz minőség
.sleepScores.awakeCount          — ébredések minősítése
.sleepScores.overall             — {value: 96, qualifierKey: "EXCELLENT"} ✓ tárolt (value)
.sleepScores.remPercentage       — {value: 22, qualifierKey: "GOOD", optimalStart: 21, optimalEnd: 31,
                                    idealStartInSeconds, idealEndInSeconds} ✓ tárolt (value)
.sleepScores.restlessness        — nyugtalanság pontszám
.sleepScores.lightPercentage     — {value: 48, ...} ✓ tárolt (value)
.sleepScores.deepPercentage      — {value: 30, ...} ✓ tárolt (value)

.sleepNeed.baseline              — alap alvásigény percben (pl. 480 = 8 óra)
.sleepNeed.actual                — AKTUÁLIS ALVÁSIGÉNY percben ✓ tárolt
                                   (edzés/stressz hatására nő)
.sleepNeed.feedback              — "INCREASED", "NO_CHANGE", "DECREASED"
.sleepNeed.trainingFeedback      — edzés hatása az alvásigényre
.sleepNeed.sleepHistoryAdjustment
.sleepNeed.hrvAdjustment
.sleepNeed.napAdjustment

.nextSleepNeed                   — következő nap alvásigénye (ugyanolyan struktúra)

.dailyNapDTOS                    — szundik listája (tömb) ✓ count tárolt
  [].napTimeSec                  — szundi hossza másodpercben
  [].napStartTimestampGMT        — szundi kezdete
  [].napEndTimestampGMT          — szundi vége
  [].napFeedback                 — "LONG_DURATION_HIGH_NEED", "SHORT_DURATION" stb.
  [].napSource                   — 0 = auto-detected
```

### sleep.sleepLevels (alvásfázis idővonal)

```
Tömb: [{startGMT, endGMT, activityLevel}, ...]

activityLevel értékei:
  0 = Mély alvás (Deep)
  1 = Könnyű alvás (Light)
  2 = Ébren (Awake)
  3 = REM

Példa:
  {"startGMT": "2026-06-18T22:30:00.0", "endGMT": "2026-06-18T23:15:00.0", "activityLevel": 1}
  {"startGMT": "2026-06-18T23:15:00.0", "endGMT": "2026-06-19T00:45:00.0", "activityLevel": 0}
  {"startGMT": "2026-06-19T00:45:00.0", "endGMT": "2026-06-19T01:30:00.0", "activityLevel": 3}
```

### sleep.sleepMovement (mozgásintenzitás)

```
Tömb: [{startGMT, endGMT, activityLevel (float)}, ...]

1 perces felbontású mozgásintenzitás (0.0 = mozdulatlan, ~6+ = aktív mozgás)
NEM alvásfázis — ez az accelerométer nyers adata.
```

### sleep.remSleepData

```
boolean — true ha az eszköz képes volt REM adatot rögzíteni
```

---

## hrv — Szívfrekvencia-variabilitás (`/hrv-service/hrv/{date}`)

```
hrv.hrvSummary.calendarDate          — "2026-06-19"
hrv.hrvSummary.weeklyAvg             — HETI ÁTLAG HRV ✓ tárolt
hrv.hrvSummary.lastNight             — TEGNAP ÉJSZAKAI HRV (ms) ✓ tárolt
hrv.hrvSummary.lastFive5MinHighHrv   — utolsó 5 perc legmagasabb HRV értéke
hrv.hrvSummary.baseline.lowUpper     — egyéni baseline tartomány alja
hrv.hrvSummary.baseline.balancedLow  — egyéni balanced tartomány alja
hrv.hrvSummary.baseline.balancedUpper — egyéni balanced tartomány teteje
hrv.hrvSummary.status                — "BALANCED" / "UNBALANCED" / "LOW" ✓ tárolt
hrv.hrvSummary.feedbackPhrase        — "HRV_BALANCED_3" stb.
hrv.hrvSummary.startTimestampGMT     — mérés kezdete
hrv.hrvSummary.endTimestampGMT       — mérés vége

hrv.hrvReadings                      — [{hrv, startTimestampGMT, endTimestampGMT}, ...]
                                       5 perces felbontású HRV értékek az éjszaka folyamán
```

**Nincs tárolva, de elérhető:**
- `hrvReadings` — éjszakai HRV idősoros adat (5 perces felbontás)
- `lastFive5MinHighHrv`
- `baseline` tartomány értékei

---

## bodyBattery — Akkumulátor (`/wellness-service/wellness/bodyBattery/reports/daily`)

```
bodyBattery[0].date                    — "2026-06-19"
bodyBattery[0].charged                 — TÖLTÖTT PONTOK (elsősorban alvás alatt) ✓ tárolt
bodyBattery[0].drained                 — MERÜLT PONTOK (edzés/stressz) ✓ tárolt
bodyBattery[0].bodyBatteryValuesArray  — [[timestamp_ms, level], ...]
                                         egész nap, 2 perces felbontás
                                         → MAX = body_battery_high ✓ tárolt
                                         → MIN = body_battery_low  ✓ tárolt
```

**Nincs tárolva, de elérhető:**
- `bodyBatteryValuesArray` — teljes napi BB idősoros adat (séta, edzés, stressz hatása percre pontosan)

---

## steps — Napi lépésszám (`getSteps`)

```
Egyszerű szám — total steps az adott napra. ✓ tárolt
```

---

## weight — Testsúly (`getDailyWeightData`)

```
weight.dailyWeightSummaries[0].weightInGrams  — gramm → kg ✓ tárolt (weight_kg)
weight.dailyWeightSummaries[0].calendarDate
```

---

## activities.raw_json struktúra

A `getActivities` lista-végpontja visszaadja az összes mezőt közvetlenül.

```
activityId                              — Garmin belső azonosító ✓ external_id
activityName                            — futás neve ✓ tárolt
startTimeLocal                          — "2026-06-18 07:30:00" ✓ date
activityType.typeKey                    — "running", "trail_running", "cycling" stb. ✓ type

distance                                — méter ✓ tárolt
duration                                — másodperc (moving time) ✓ tárolt
elapsedDuration                         — teljes eltelt idő (szünetekkel) ✓ tárolt
movingDuration                          — mozgással töltött idő ✓ tárolt
averageSpeed                            — m/s ✓ → avg_pace_s, avg_speed_ms
maxSpeed                                — m/s ✓ tárolt

averageHR                               — átlagpulzus ✓ tárolt
maxHR                                   — maximális pulzus ✓ tárolt
hrTimeInZone_1..5                       — idő HR zónánként (mp) ✓ tárolt

elevationGain                           — emelkedés (m) ✓ tárolt
elevationLoss                           — ereszkedés (m) ✓ tárolt
calories                                — aktív kalória ✓ tárolt
bmrCalories                             — alap anyagcsere kalória

averageRunningCadenceInStepsPerMinute   — átlag kadencia ✓ avg_cadence
maxRunningCadenceInStepsPerMinute       — max kadencia ✓ max_cadence
steps                                   — lépések száma ✓ tárolt
avgStrideLength                         — átlagos lépéshossz (m) ✓ tárolt
avgVerticalOscillation                  — vertikális oszcilláció (cm) ✓ tárolt
avgGroundContactTime                    — talajon töltött idő (ms) ✓ tárolt
avgVerticalRatio                        — vertikális arány (%) ✓ tárolt

avgPower                                — átlagos teljesítmény (W) ✓ tárolt
maxPower                                — max teljesítmény ✓ tárolt
normPower                               — normalizált teljesítmény ✓ tárolt

aerobicTrainingEffect                   — aerob edzéshatás (0-5) ✓ tárolt
anaerobicTrainingEffect                 — anaerob edzéshatás ✓ tárolt
trainingEffectLabel                     — "TEMPO", "BASE", "THRESHOLD" stb. ✓ tárolt
vO2MaxValue / vo2MaxValue               — VO2max becslés ✓ tárolt

locationName                            — helyszín neve ✓ tárolt
pr                                      — személyi rekord (boolean) ✓ is_pr
```

**Nincs tárolva, de elérhető:**
- `bmrCalories` — alap anyagcsere
- GPS route: a `getActivity(id)` hívással kérhető le részletes lap/split adat

---

## Összefoglalás: Mit tárolunk vs. Mi érhető még el

| Kategória | Tárolt | Elérhető de nem tárolt |
|-----------|--------|----------------------|
| HR | resting HR, max HR nap | Teljes napi HR idősor (minden 2 percben) |
| HRV | last night, weekly avg, status | Éjszakai HRV idősor (5 perc), baseline tartomány |
| Alvás | összes összesítő mező | sleepMovement (nyers mozgás) |
| Alvásfázis | sleepLevels (raw_json-ban) | — |
| Body Battery | high, low, charged, drained | Teljes napi BB idősor |
| Futás | 30+ mező | bmrCalories, részletes lap data |
