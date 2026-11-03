import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Live, Report, errMsg } from '../core/api';
import { renderMd } from '../core/md';

@Component({
  template: `
    <header class="page-head"><h2>Reports</h2><p class="muted">Turn selected files into a written report. Agent-saved reports appear here too.</p></header>
    <form class="stack" (ngSubmit)="create()">
      <label>Title <input name="t" [(ngModel)]="title" placeholder="Q3 risk review"></label>
      <label>What should it cover? <textarea name="i" rows="3" [(ngModel)]="instructions" placeholder="Summarize findings for the leadership team and recommend next steps."></textarea></label>
      <div class="chips" role="group" aria-label="Files to include">
        @for (d of ready(); track d.id) {
          <button type="button" class="chip" [class.on]="sel().has(d.id)" [attr.aria-pressed]="sel().has(d.id)" (click)="toggle(d.id)">{{ d.name }}</button>
        } @empty { <span class="empty">No ready files yet.</span> }
      </div>
      <button class="btn" [disabled]="busy() || !sel().size || instructions().trim().length < 3">{{ busy() ? 'Writing report…' : 'Generate report' }}</button>
    </form>
    @if (err()) { <p class="err" role="alert">{{ err() }}</p> }
    @for (r of reports(); track r.id) {
      <article class="card report">
        <div class="file-top"><h3>{{ r.title }}</h3>
          <span>
            <button class="link" (click)="download(r)">Download .md</button>
            <button class="link danger" (click)="remove(r)">Delete</button>
          </span></div>
        <p class="muted small">{{ r.created_at | date: 'medium' }}</p>
        <details><summary>Read report</summary><div class="prose" [innerHTML]="html(r)"></div></details>
      </article>
    }`,
  imports: [FormsModule, DatePipe],
})
export class ReportsPage {
  private api = inject(Api);
  private live = inject(Live);
  ready = computed(() => this.live.docs().filter(d => d.status === 'ready'));
  title = signal(''); instructions = signal(''); sel = signal(new Set<number>());
  reports = signal<Report[]>([]); busy = signal(false); err = signal('');

  constructor() { this.load(); }
  load() { this.api.reports().subscribe(r => this.reports.set(r)); }
  toggle(id: number) { this.sel.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  html(r: Report) { return renderMd(r.body); }

  create() {
    this.busy.set(true); this.err.set('');
    this.api.makeReport(this.title().trim() || 'Untitled report', this.instructions().trim(), [...this.sel()]).subscribe({
      next: () => { this.busy.set(false); this.load(); },
      error: e => { this.err.set(errMsg(e)); this.busy.set(false); },
    });
  }
  remove(r: Report) { this.api.removeReport(r.id).subscribe(() => this.load()); }
  download(r: Report) {
    const url = URL.createObjectURL(new Blob([r.body], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${r.title.replace(/[^\w-]+/g, '-')}.md`; a.click();
    URL.revokeObjectURL(url);
  }
}
