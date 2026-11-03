import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Live, errMsg } from '../core/api';
import { renderMd } from '../core/md';

@Component({
  imports: [FormsModule],
  template: `
    <header class="page-head"><h2>Compare</h2><p class="muted">Line up two files and see where they agree, differ or conflict.</p></header>
    <form class="row" (ngSubmit)="run()">
      <label>File A <select name="a" [(ngModel)]="a"><option [ngValue]="null" disabled>Choose a file</option>
        @for (d of docs(); track d.id) { <option [ngValue]="d.id">{{ d.name }}</option> }</select></label>
      <label>File B <select name="b" [(ngModel)]="b"><option [ngValue]="null" disabled>Choose a file</option>
        @for (d of docs(); track d.id) { <option [ngValue]="d.id">{{ d.name }}</option> }</select></label>
      <label class="grow">Focus (optional) <input name="f" [(ngModel)]="focus" placeholder="Pricing terms, deadlines, liabilities…"></label>
      <button class="btn" [disabled]="busy() || !a() || !b()">{{ busy() ? 'Comparing…' : 'Compare files' }}</button>
    </form>
    @if (err()) { <p class="err" role="alert">{{ err() }}</p> }
    @if (!docs().length) { <p class="empty">You need at least two ready files to compare.</p> }
    @if (result()) { <article class="prose card" [innerHTML]="html()"></article> }`,
})
export class ComparePage {
  private api = inject(Api);
  private live = inject(Live);
  docs = computed(() => this.live.docs().filter(d => d.status === 'ready'));
  a = signal<number | null>(null); b = signal<number | null>(null); focus = signal('');
  busy = signal(false); err = signal(''); result = signal('');
  html = computed(() => renderMd(this.result()));

  run() {
    this.busy.set(true); this.err.set(''); this.result.set('');
    this.api.compare(this.a()!, this.b()!, this.focus()).subscribe({
      next: r => { this.result.set(r.comparison); this.busy.set(false); },
      error: e => { this.err.set(errMsg(e)); this.busy.set(false); },
    });
  }
}
