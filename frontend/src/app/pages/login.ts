import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, errMsg } from '../core/api';

@Component({
  imports: [FormsModule],
  template: `
    <div class="login">
      <section class="login-card">
        <h1>Cognify</h1>
        <p class="muted">Ask your documents and data anything. Every answer shows its source.</p>
        <form (ngSubmit)="submit()">
          @if (mode() === 'register') {
            <label>Name <input name="name" [(ngModel)]="name" required autocomplete="name"></label>
          }
          <label>Email <input name="email" type="email" [(ngModel)]="email" required autocomplete="email"></label>
          <label>Password <input name="pw" type="password" [(ngModel)]="password" required minlength="8" autocomplete="current-password"></label>
          @if (err()) { <p class="err" role="alert">{{ err() }}</p> }
          <button class="btn" [disabled]="busy()">{{ mode() === 'login' ? 'Sign in' : 'Create account' }}</button>
        </form>
        <button class="link" (click)="mode.set(mode() === 'login' ? 'register' : 'login')">
          {{ mode() === 'login' ? 'New here? Create an account' : 'Have an account? Sign in' }}
        </button>
      </section>
    </div>`,
})
export class LoginPage {
  private auth = inject(Auth);
  private router = inject(Router);
  mode = signal<'login' | 'register'>('login');
  name = signal(''); email = signal(''); password = signal('');
  err = signal(''); busy = signal(false);

  submit() {
    this.busy.set(true); this.err.set('');
    const req = this.mode() === 'login' ? this.auth.login(this.email(), this.password())
      : this.auth.register(this.name(), this.email(), this.password());
    req.subscribe({
      next: () => this.router.navigateByUrl('/ask'),
      error: e => { this.err.set(errMsg(e)); this.busy.set(false); },
    });
  }
}
