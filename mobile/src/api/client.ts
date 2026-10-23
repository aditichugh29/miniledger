import { API_URL } from '../config';
import type { Loan, Summary, User } from '../types';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (t: string | null) => (authToken = t);
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  // Only send a JSON content-type when there really is a JSON body (PATCH repay has none)
  if (typeof options.body === 'string') headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('Cannot reach the server. Check your internet and the API URL.');
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && authToken) onUnauthorized?.();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  requestOtp: (phone: string) =>
    request<{ message: string }>('/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
  verifyOtp: (phone: string, otp: string) =>
    request<{ token: string; user: User }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    }),
  listLoans: () => request<Loan[]>('/loans'),
  summary: () => request<Summary>('/loans/summary'),
  createLoan: (body: { friendName: string; amount: number; dueDate: string }) =>
    request<Loan>('/loans', { method: 'POST', body: JSON.stringify(body) }),
  markRepaid: (id: string) => request<Loan>(`/loans/${id}/repay`, { method: 'PATCH' }),
  // Sends the photo as base64 text in a normal JSON request (more reliable than file uploads on phones)
  uploadReceipt: (id: string, imageBase64: string) =>
    request<Loan>(`/loans/${id}/receipt`, { method: 'POST', body: JSON.stringify({ imageBase64 }) }),
  receiptDataUri: async (id: string) =>
    (await request<{ dataUri: string }>(`/loans/${id}/receipt?format=base64`)).dataUri,
};
