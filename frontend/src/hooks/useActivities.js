import { api } from '../api/client.js';
import { useFetch } from './useFetch.js';

export function useActivities(params = {}) {
  const key = JSON.stringify(params);
  return useFetch(() => api.getActivities(params), [key]);
}

export function useWeeklyMileage(weeks = 12) {
  return useFetch(() => api.getWeeklyMileage(weeks), [weeks]);
}
