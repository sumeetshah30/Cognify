import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Live, Run, errMsg } from '../core/api';
import { renderMd } from '../core/md';

const LABELS: Record<string, string> = {
  list_files: 'Listing your files', search_documents: 'Searching documents', read_document: 'Reading a document',
  profile_dataset: 'Profiling a dataset', aggregate_dataset: 'Aggregating a dataset', save_report: 'Saving a report',
};
const EXAMPLES = [
  'Summarize the main obligations and deadlines across all my contracts.',
  'Which region had the highest total revenue in my sales dataset, and what do the documents say about why?',
  'Write a report on the key risks mentioned in my files and save it.',
];

@Component({
  imports: [FormsModule],
  template: `
    <header class="page-head"><h2>Agent</h2>
      <p class="muted">Give the agent a goal. It searches, reads and calculates in up to 8 steps, using read-only tools on your files.</p></header>
    <form class="askbar" (ngSubmit)="start()">
      <textarea name="g" rows="3" [(ngModel)]="goal" placeholder="Describe what you want done"></textarea>
      <button class="btn" [disabled]="busy() || goal().trim().length < 5">{{ busy() ? 'Starting…' : 'Run agent' }}</button>
    </form>
    <div class="chips">@for (e of examples; track e) { <button type="button" class="chip" (click)="goal.set(e)">{{ e }}</button> }</div>
    @if (err()) { <p class="err" role="alert">{{ err() }}</p> }

    <div class="agent-grid">
      <ul class="runs" aria-label="Runs">
        @for (r of live.runs(); track r.id) {
          <li><button class="run" [class.on]="r.id === current()?.id" (click)="pick.set(r.id)">
            <span class="dot" [class]="r.status"></span><span>{{ r.goal }}</span></button></li>
        } @empty { <li class="empty">No runs yet.</li> }
      </ul>
      @if (current(); as r) {
        <section class="run-view" aria-live="polite">
          <h3>{{ r.goal }}</h3>
          <ol class="steps">
            @for (s of r.steps; track $index) {
              <li [class]="s.kind">
                @if (s.kind === 'thought') { <p>{{ s.text }}</p> } @else {
                  <b>{{ label(s.name) }}</b>
                  <code>{{ brief(s.input) }}</code>
                  <details><summary>Result</summary><pre>{{ s.output }}</pre></details>
                }
              </li>
            }
            @if (r.status === 'running') { <li class="working">Working…</li> }
          </ol>
          @if (r.result) {
            <article class="prose card" [class.bad]="r.status === 'failed'" [innerHTML]="html(r)"></article>
          }
        </section>
      }
    </div>`,
})
export class AgentPage {
  live = inject(Live);
  private api = inject(Api);
  examples = EXAMPLES;
  goal = signal(''); busy = signal(false); err = signal(''); pick = signal<number | null>(null);
  current = computed<Run | null>(() => this.live.runs().find(r => r.id === this.pick()) ?? this.live.runs()[0] ?? null);

  label(n?: string) { return LABELS[n ?? ''] ?? n ?? 'Tool'; }
  brief(i?: Record<string, unknown>) { return i ? Object.values(i).map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(' · ') : ''; }
  html(r: Run) { return renderMd(r.result ?? ''); }

  start() {
    this.busy.set(true); this.err.set('');
    this.api.startRun(this.goal().trim()).subscribe({
      next: r => { this.pick.set(r.id); this.goal.set(''); this.busy.set(false); },
      error: e => { this.err.set(errMsg(e)); this.busy.set(false); },
    });
  }
}
