import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';

export const API = 'http://localhost:8000/api';

export interface ColMeta { name: string; dtype: 'number' | 'date' | 'text'; nulls: number; unique: number; sample: string[]; min?: number; max?: number; mean?: number; median?: number }
export interface Doc { id: number; name: string; kind: 'document' | 'dataset'; size: number; status: 'queued' | 'processing' | 'ready' | 'failed'; stage: string; progress: number; error: string | null; summary?: string | null; meta: { rows: number; columns: ColMeta[] } | null; created_at: string }
export interface Source { n: number; document_id: number; document_name: string; locator: string; text: string }
export interface Step { kind: 'thought' | 'tool'; text?: string; name?: string; input?: Record<string, unknown>; output?: string }
export interface Run { id: number; goal: string; status: 'running' | 'done' | 'failed'; steps: Step[]; result: string | null; created_at: string }
export interface Report { id: number; title: string; body: string; created_at: string }
export interface Hist { id: number; question: string; answer: string; sources: Source[]; created_at: string }
export interface ChartData { labels?: string[]; values?: (number | null)[]; points?: { x: number; y: number }[] }
interface AuthRes { token: string; user: { name: string; email: string } }

export function errMsg(e: unknown): string {
  const d = (e as HttpErrorResponse)?.error?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map(x => x.msg).join('. ');
  return (e as HttpErrorResponse)?.status === 0 ? 'Can’t reach the server. Check that the API is running.' : 'Something went wrong. Try again.';
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  token = signal<string | null>(localStorage.getItem('cg_token'));
  user = signal<{ name: string; email: string } | null>(JSON.parse(localStorage.getItem('cg_user') ?? 'null'));

  private set(r: AuthRes) {
    localStorage.setItem('cg_token', r.token);
    localStorage.setItem('cg_user', JSON.stringify(r.user));
    this.token.set(r.token);
    this.user.set(r.user);
  }
  login(email: string, password: string) { return this.http.post<AuthRes>(`${API}/auth/login`, { email, password }).pipe(tap(r => this.set(r))); }
  register(name: string, email: string, password: string) { return this.http.post<AuthRes>(`${API}/auth/register`, { name, email, password }).pipe(tap(r => this.set(r))); }
  logout() { localStorage.removeItem('cg_token'); localStorage.removeItem('cg_user'); this.token.set(null); this.user.set(null); }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth), router = inject(Router);
  const t = auth.token();
  const r = t && req.url.startsWith(API) ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : req;
  return next(r).pipe(catchError(e => {
    if (e.status === 401 && !req.url.includes('/auth/')) { auth.logout(); router.navigateByUrl('/login'); }
    return throwError(() => e);
  }));
};

/** Live state pushed from the server over SSE: file processing status and agent runs. */
@Injectable({ providedIn: 'root' })
export class Live {
  private auth = inject(Auth);
  docs = signal<Doc[]>([]);
  runs = signal<Run[]>([]);
  connected = signal(false);
  private es: EventSource | null = null;

  start() {
    const t = this.auth.token();
    if (this.es || !t) return;
    const es = new EventSource(`${API}/events?token=${encodeURIComponent(t)}`);
    es.onmessage = e => { const d = JSON.parse(e.data); this.docs.set(d.documents); this.runs.set(d.runs); this.connected.set(true); };
    es.onerror = () => this.connected.set(false);
    this.es = es;
  }
  stop() { this.es?.close(); this.es = null; this.docs.set([]); this.runs.set([]); this.connected.set(false); }
}

@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  upload(f: File) { const fd = new FormData(); fd.append('file', f); return this.http.post<{ id: number }>(`${API}/documents`, fd); }
  remove(id: number) { return this.http.delete(`${API}/documents/${id}`); }
  ask(question: string, document_ids: number[] | null) { return this.http.post<{ answer: string; sources: Source[] }>(`${API}/ask`, { question, document_ids }); }
  history() { return this.http.get<Hist[]>(`${API}/history`); }
  compare(a: number, b: number, focus: string) { return this.http.post<{ comparison: string }>(`${API}/compare`, { a, b, focus }); }
  chart(id: number, body: { kind: string; x: string; y?: string | null; agg: string }) { return this.http.post<ChartData>(`${API}/datasets/${id}/chart`, body); }
  insights(id: number) { return this.http.post<{ insights: string }>(`${API}/datasets/${id}/insights`, {}); }
  startRun(goal: string) { return this.http.post<{ id: number }>(`${API}/agent/runs`, { goal }); }
  reports() { return this.http.get<Report[]>(`${API}/reports`); }
  makeReport(title: string, instructions: string, document_ids: number[]) { return this.http.post<{ id: number }>(`${API}/reports`, { title, instructions, document_ids }); }
  removeReport(id: number) { return this.http.delete(`${API}/reports/${id}`); }
}

export interface Msg { role: 'user' | 'assistant'; text: string; sources?: Source[]; error?: boolean; pending?: boolean }

/** Holds the chat thread and past questions so the sidebar and the Ask page share them. */
@Injectable({ providedIn: 'root' })
export class Chat {
  private api = inject(Api);
  messages = signal<Msg[]>([]);
  history = signal<Hist[]>([]);
  scope = signal<number[]>([]);
  busy = signal(false);

  refresh() { this.api.history().subscribe({ next: h => this.history.set(h), error: () => undefined }); }
  reset() { if (!this.busy()) this.messages.set([]); }
  open(h: Hist) { if (!this.busy()) this.messages.set([{ role: 'user', text: h.question }, { role: 'assistant', text: h.answer, sources: h.sources }]); }

  send(text: string) {
    const q = text.trim();
    if (q.length < 3 || this.busy()) return;
    this.messages.update(m => [...m, { role: 'user', text: q }, { role: 'assistant', text: '', pending: true }]);
    this.busy.set(true);
    const ids = this.scope().length ? this.scope() : null;
    this.api.ask(q, ids).subscribe({
      next: r => { this.replaceLast({ role: 'assistant', text: r.answer, sources: r.sources }); this.busy.set(false); this.refresh(); },
      error: e => { this.replaceLast({ role: 'assistant', text: errMsg(e), error: true }); this.busy.set(false); },
    });
  }
  private replaceLast(m: Msg) { this.messages.update(a => [...a.slice(0, -1), m]); }
}
