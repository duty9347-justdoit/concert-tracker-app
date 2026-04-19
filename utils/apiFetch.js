// utils/apiFetch.js
// Wrapper around fetch that automatically adds the X-API-Key header
import { API_BASE_URL, API_KEY } from '../config';

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  return res;
}