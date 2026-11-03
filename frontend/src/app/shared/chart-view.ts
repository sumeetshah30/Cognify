import { Component, ElementRef, OnDestroy, effect, input, viewChild } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  template: `<div class="chart-box"><canvas #cv role="img" [attr.aria-label]="label()"></canvas></div>`,
})
export class ChartView implements OnDestroy {
  config = input.required<ChartConfiguration>();
  label = input('Chart');
  private cv = viewChild.required<ElementRef<HTMLCanvasElement>>('cv');
  private chart?: Chart;

  constructor() {
    effect(() => {
      const cfg = this.config();
      this.chart?.destroy();
      const css = getComputedStyle(document.body);
      Chart.defaults.color = css.color;
      Chart.defaults.borderColor = 'rgba(128,128,128,.25)';
      this.chart = new Chart(this.cv().nativeElement, cfg);
    });
  }
  ngOnDestroy() { this.chart?.destroy(); }
}
