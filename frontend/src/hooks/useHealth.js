import { api } from '../api/client.js';
import { useFetch } from './useFetch.js';

export function useHrTrend(days = 30) {
  return useFetch(() => api.getHrTrend(days), [days]);
}

export function useHrvTrend(days = 30) {
  return useFetch(() => api.getHrvTrend(days), [days]);
}

export function useSleepTrend(days = 30) {
  return useFetch(() => api.getSleepTrend(days), [days]);
}

export function useBbTrend(days = 30) {
  return useFetch(() => api.getBbTrend(days), [days]);
}
