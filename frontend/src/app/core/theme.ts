import { Injectable, signal } from '@angular/core';

/** Light/dark theme. Follows the system until the user picks one, then remembers it. */
@Injectable({ providedIn: 'root' })
export class Theme {
  mode = signal<'dark' | 'light'>(this.initial());

  constructor() { this.apply(); }

  private initial(): 'dark' | 'light' {
    const saved = localStorage.getItem('cg_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  toggle() {
    this.mode.set(this.mode() === 'dark' ? 'light' : 'dark');
    localStorage.setItem('cg_theme', this.mode());
    this.apply();
  }
  private apply() { document.documentElement.dataset['theme'] = this.mode(); }
}
