import { Component, computed, input } from '@angular/core';

const PATHS: Record<string, string> = {
  edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  columns: 'M4 5h7v14H4z M13 5h7v14h-7z',
  chart: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  doc: 'M7 3h8l4 4v14H7z M15 3v4h4',
  send: 'M12 19V5 M5 12l7-7 7 7',
  plus: 'M12 5v14 M5 12h14',
  copy: 'M8 8h12v13H8z M5 16V3h11',
  x: 'M6 6l12 12 M18 6L6 18',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5',
  moon: 'M21 13A9 9 0 1111 3a7 7 0 0010 10z',
  logout: 'M9 4H5v16h4 M16 8l4 4-4 4 M20 12H9',
  check: 'M5 12l5 5 9-10',
};

@Component({
  selector: 'app-icon',
  template: `<svg viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="d()" /></svg>`,
  host: { style: 'display:inline-flex;vertical-align:middle' },
})
export class Icon {
  name = input.required<string>();
  size = input(18);
  d = computed(() => PATHS[this.name()] ?? '');
}
