import { api } from '../api/client.js';
import { useFetch } from './useFetch.js';

export function useDashboard() {
  return useFetch(() => api.getDashboardSummary(), []);
}
