import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration } from 'chart.js';
import { Api, ChartData, Live, errMsg } from '../core/api';
import { renderMd } from '../core/md';
import { ChartView } from '../shared/chart-view';

const TEAL = '#10a37f', AMBER = '#e0a43a';

@Component({
  imports: [FormsModule, ChartView],
  template: `
    <header class="page-head"><h2>Data</h2><p class="muted">Profile a dataset, chart it, and get AI-suggested questions to investigate.</p></header>
    @if (!sets().length) { <p class="empty">No datasets are ready. Upload a CSV or XLSX in the Library.</p> } @else {
      <label>Dataset <select [ngModel]="ds()?.id" (ngModelChange)="id.set($event); reset()">
        @for (d of sets(); track d.id) { <option [ngValue]="d.id">{{ d.name }}</option> }</select></label>
    }
    @if (ds(); as d) {
      <p class="muted">{{ d.meta?.rows }} rows, {{ d.meta?.columns?.length }} columns</p>
      <div class="scroll"><table class="tbl">
        <thead><tr><th>Column</th><th>Type</th><th>Unique</th><th>Missing</th><th>Range or sample</th></tr></thead>
        <tbody>@for (c of d.meta?.columns; track c.name) {
          <tr><td>{{ c.name }}</td><td>{{ c.dtype }}</td><td>{{ c.unique }}</td><td>{{ c.nulls }}</td>
            <td>{{ c.dtype === 'number' ? c.min + ' to ' + c.max : c.sample.join(', ') }}</td></tr> }</tbody>
      </table></div>

      <h3 class="sub">Chart</h3>
      <form class="row" (ngSubmit)="draw()">
        <label>Type <select name="k" [(ngModel)]="kind">
          <option value="bar">Bar</option><option value="line">Line</option><option value="histogram">Histogram</option><option value="scatter">Scatter</option></select></label>
        <label>{{ kind() === 'scatter' ? 'X (number)' : kind() === 'histogram' ? 'Column (number)' : 'Group by' }}
          <select name="x" [(ngModel)]="x">@for (c of cols(); track c.name) { <option [value]="c.name">{{ c.name }}</option> }</select></label>
        @if (kind() !== 'histogram') {
          <label>{{ kind() === 'scatter' ? 'Y (number)' : 'Value' }}
            <select name="y" [(ngModel)]="y"><option [ngValue]="null">(row count)</option>
              @for (c of nums(); track c.name) { <option [value]="c.name">{{ c.name }}</option> }</select></label>
        }
        @if (kind() === 'bar' || kind() === 'line') {
          <label>Combine by <select name="g" [(ngModel)]="agg">
            @for (a of aggs; track a) { <option [value]="a">{{ a }}</option> }</select></label>
        }
        <button class="btn" [disabled]="!x()">Draw chart</button>
      </form>
      @if (err()) { <p class="err" role="alert">{{ err() }}</p> }
      @if (cfg(); as c) { <div class="card"><app-chart [config]="c" label="Chart of the selected columns" /></div> }

      <h3 class="sub">Suggested questions</h3>
      <button class="btn ghost" (click)="getInsights()" [disabled]="busy()">{{ busy() ? 'Analyzing…' : 'Suggest insights' }}</button>
      @if (insights()) { <article class="prose card" [innerHTML]="html()"></article> }
    }`,
})
export class DataPage {
  private api = inject(Api);
  private live = inject(Live);
  aggs = ['sum', 'mean', 'count', 'median', 'min', 'max'];
  sets = computed(() => this.live.docs().filter(d => d.kind === 'dataset' && d.status === 'ready'));
  id = signal<number | null>(null);
  ds = computed(() => this.sets().find(d => d.id === (this.id() ?? this.sets()[0]?.id)) ?? null);
  cols = computed(() => this.ds()?.meta?.columns ?? []);
  nums = computed(() => this.cols().filter(c => c.dtype === 'number'));
  kind = signal('bar'); x = signal<string | null>(null); y = signal<string | null>(null); agg = signal('sum');
  cfg = signal<ChartConfiguration | null>(null); err = signal(''); busy = signal(false); insights = signal('');
  html = computed(() => renderMd(this.insights()));

  reset() { this.cfg.set(null); this.insights.set(''); this.x.set(null); this.y.set(null); this.err.set(''); }

  draw() {
    const d = this.ds(); if (!d || !this.x()) return;
    this.err.set('');
    const kind = this.kind(), x = this.x()!, y = this.y();
    this.api.chart(d.id, { kind, x, y, agg: y ? this.agg() : 'count' }).subscribe({
      next: r => this.cfg.set(this.build(kind, x, y, r)),
      error: e => { this.err.set(errMsg(e)); this.cfg.set(null); },
    });
  }

  private build(kind: string, x: string, y: string | null, r: ChartData): ChartConfiguration {
    const grid = { color: 'rgba(128,128,128,.22)' };
    const common = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
    if (kind === 'scatter') {
      return { type: 'scatter', data: { datasets: [{ data: r.points ?? [], backgroundColor: TEAL, pointRadius: 3 }] },
        options: { ...common, scales: { x: { title: { display: true, text: x }, grid }, y: { title: { display: true, text: y ?? '' }, grid } } } };
    }
    const label = kind === 'histogram' ? 'Rows' : y ? `${this.agg()} of ${y}` : 'Rows';
    return { type: kind === 'line' ? 'line' : 'bar',
      data: { labels: r.labels, datasets: [{ label, data: r.values ?? [], backgroundColor: TEAL, borderColor: kind === 'line' ? AMBER : TEAL, tension: .25 }] },
      options: { ...common, scales: { x: { grid: { display: false }, title: { display: true, text: x } }, y: { grid, title: { display: true, text: label } } } } };
  }

  getInsights() {
    const d = this.ds(); if (!d) return;
    this.busy.set(true); this.err.set('');
    this.api.insights(d.id).subscribe({
      next: r => { this.insights.set(r.insights); this.busy.set(false); },
      error: e => { this.err.set(errMsg(e)); this.busy.set(false); },
    });
  }
}
