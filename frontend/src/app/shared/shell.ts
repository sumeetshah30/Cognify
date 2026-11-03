import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth, Chat, Hist, Live } from '../core/api';
import { Theme } from '../core/theme';
import { Icon } from './icon';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  template: `
    <div class="app" [class.nav-open]="open()">
      <div class="backdrop" (click)="open.set(false)"></div>
      <aside class="side" aria-label="Sidebar">
        <div class="side-top">
          <a class="brand" routerLink="/ask" (click)="newChat()">Cognify</a>
          <button class="icon-btn" (click)="newChat()" aria-label="New chat"><app-icon name="edit" /></button>
        </div>
        <button class="new-chat" (click)="newChat()"><app-icon name="edit" /> New chat</button>
        <nav aria-label="Main" (click)="open.set(false)">
          @for (n of nav; track n.path) {
            <a [routerLink]="n.path" routerLinkActive="active"><app-icon [name]="n.icon" /> {{ n.label }}</a>
          }
        </nav>
        <div class="hist-title">Recent questions</div>
        <ul class="hist-list">
          @for (h of chat.history(); track h.id) {
            <li><button (click)="openChat(h)" [title]="h.question">{{ h.question }}</button></li>
          } @empty { <li class="hist-empty">Nothing yet</li> }
        </ul>
        <div class="side-foot">
          <span class="avatar" aria-hidden="true">{{ initial() }}</span>
          <span class="who">{{ auth.user()?.name }}<small class="live" [class.on]="live.connected()">{{ live.connected() ? 'Live' : 'Reconnecting' }}</small></span>
          <button class="icon-btn" (click)="theme.toggle()" [attr.aria-label]="theme.mode() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'">
            <app-icon [name]="theme.mode() === 'dark' ? 'sun' : 'moon'" /></button>
          <button class="icon-btn" (click)="logout()" aria-label="Sign out"><app-icon name="logout" /></button>
        </div>
      </aside>
      <div class="content">
        <header class="topbar">
          <button class="icon-btn" (click)="open.set(true)" aria-label="Open sidebar"><app-icon name="menu" /></button>
          <span>Cognify</span>
          <button class="icon-btn" (click)="newChat()" aria-label="New chat"><app-icon name="edit" /></button>
        </header>
        <main class="main"><router-outlet /></main>
      </div>
    </div>`,
})
export class Shell {
  auth = inject(Auth);
  live = inject(Live);
  chat = inject(Chat);
  theme = inject(Theme);
  private router = inject(Router);
  open = signal(false);
  nav = [
    { path: '/library', label: 'Library', icon: 'folder' }, { path: '/compare', label: 'Compare', icon: 'columns' },
    { path: '/data', label: 'Data', icon: 'chart' }, { path: '/agent', label: 'Agent', icon: 'spark' },
    { path: '/reports', label: 'Reports', icon: 'doc' },
  ];

  constructor() {
    effect(() => { if (this.auth.token()) { this.live.start(); this.chat.refresh(); } });
  }
  initial() { return (this.auth.user()?.name ?? '?').trim().charAt(0).toUpperCase(); }
  newChat() { this.chat.reset(); this.open.set(false); this.router.navigateByUrl('/ask'); }
  openChat(h: Hist) { this.chat.open(h); this.open.set(false); this.router.navigateByUrl('/ask'); }
  logout() { this.live.stop(); this.chat.messages.set([]); this.chat.history.set([]); this.auth.logout(); this.router.navigateByUrl('/login'); }
}
