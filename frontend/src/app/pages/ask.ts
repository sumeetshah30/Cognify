import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chat, Live } from '../core/api';
import { renderMd } from '../core/md';
import { Icon } from '../shared/icon';

const SUGGESTIONS = [
  'Summarize the main points of my documents',
  'List the key dates, names and figures',
  'What risks or obligations are mentioned?',
  'Explain this in simple terms',
];

@Component({
  imports: [FormsModule, RouterLink, Icon],
  host: { class: 'chat-host' },
  template: `
    <div class="scroller" #scroller>
      @if (!chat.messages().length) {
        <div class="hero">
          <h1>What do you want to know?</h1>
          @if (ready().length) {
            <p class="muted">Ask about your files. Every answer cites the passages it came from.</p>
            <div class="suggest">
              @for (s of suggestions; track s) { <button (click)="chat.send(s)">{{ s }}</button> }
            </div>
          } @else {
            <p class="muted">You have no files yet. <a routerLink="/library">Upload one in the Library</a> to get started.</p>
          }
        </div>
      } @else {
        <div class="thread">
          @for (m of chat.messages(); track $index) {
            @let i = $index;
            @if (m.role === 'user') {
              <div class="msg user"><div class="bubble">{{ m.text }}</div></div>
            } @else {
              <div class="msg bot">
                @if (m.pending) {
                  <div class="typing" role="status" aria-label="Thinking"><i></i><i></i><i></i></div>
                } @else {
                  <div class="prose" [class.err]="m.error" [innerHTML]="render(m.text)" (click)="cite($event, i)"></div>
                  @if (m.sources && m.sources.length) {
                    <div class="srcs" role="group" aria-label="Sources">
                      @for (s of m.sources; track s.n) {
                        <button class="pill" [class.on]="openSrc() === i + '-' + s.n" (click)="toggleSrc(i, s.n)">
                          <b>{{ s.n }}</b> {{ s.document_name }} <span class="muted">{{ s.locator }}</span></button>
                      }
                    </div>
                    @for (s of m.sources; track s.n) {
                      @if (openSrc() === i + '-' + s.n) {
                        <div class="src-open"><b>{{ s.document_name }}</b> <span class="muted">{{ s.locator }}</span><p>{{ s.text }}</p></div>
                      }
                    }
                  }
                  @if (!m.error) {
                    <div class="actions"><button class="icon-btn" (click)="copy(m.text)" aria-label="Copy answer">
                      <app-icon [name]="copied() === i ? 'check' : 'copy'" [size]="16" /></button></div>
                  }
                }
              </div>
            }
          }
        </div>
      }
    </div>

    <div class="composer-wrap">
      <form class="composer" (ngSubmit)="send()">
        @if (chat.scope().length) {
          <div class="attached">
            @for (id of chat.scope(); track id) {
              <span class="chip on">{{ nameOf(id) }} <button type="button" (click)="toggle(id)" [attr.aria-label]="'Remove ' + nameOf(id)"><app-icon name="x" [size]="12" /></button></span>
            }
          </div>
        }
        <textarea #box name="q" rows="1" [(ngModel)]="draft" (keydown)="key($event)" (input)="grow()"
                  placeholder="Ask about your files" aria-label="Message"></textarea>
        <div class="composer-row">
          <div class="menu-wrap">
            <button type="button" class="icon-btn" (click)="menu.set(!menu())" aria-label="Choose which files to search" [attr.aria-expanded]="menu()">
              <app-icon name="plus" /></button>
            @if (menu()) {
              <div class="popover" role="dialog" aria-label="Choose files">
                <p class="muted small">Limit answers to these files. None selected means all files.</p>
                @for (d of ready(); track d.id) {
                  <label class="check"><input type="checkbox" [checked]="chat.scope().includes(d.id)" (change)="toggle(d.id)"> <span>{{ d.name }}</span></label>
                } @empty { <p class="muted small">No ready files yet.</p> }
              </div>
            }
          </div>
          <button class="send" [disabled]="chat.busy() || draft().trim().length < 3" aria-label="Send message"><app-icon name="send" /></button>
        </div>
      </form>
      <p class="foot">Each question is answered on its own from your files. Check the citations; Cognify can make mistakes.</p>
    </div>`,
})
export class AskPage {
  chat = inject(Chat);
  private live = inject(Live);
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private box = viewChild<ElementRef<HTMLTextAreaElement>>('box');
  suggestions = SUGGESTIONS;
  draft = signal('');
  menu = signal(false);
  openSrc = signal<string | null>(null);
  copied = signal<number | null>(null);
  ready = computed(() => this.live.docs().filter(d => d.status === 'ready'));

  constructor() {
    effect(() => {
      this.chat.messages();
      setTimeout(() => { const el = this.scroller()?.nativeElement; if (el) el.scrollTop = el.scrollHeight; });
    });
  }

  render(t: string) { return renderMd(t, true); }
  nameOf(id: number) { return this.live.docs().find(d => d.id === id)?.name ?? 'File'; }
  toggle(id: number) { this.chat.scope.update(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); }
  toggleSrc(i: number, n: number) { const k = `${i}-${n}`; this.openSrc.set(this.openSrc() === k ? null : k); }
  cite(ev: Event, i: number) {
    const el = ev.target as HTMLElement;
    if (el.classList.contains('cite')) this.openSrc.set(`${i}-${Number(el.textContent)}`);
  }
  key(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); } }
  grow() { const t = this.box()?.nativeElement; if (t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 200) + 'px'; } }
  send() {
    this.chat.send(this.draft());
    this.draft.set(''); this.menu.set(false);
    setTimeout(() => this.grow());
  }
  copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      this.copied.set(this.chat.messages().findIndex(m => m.text === text));
      setTimeout(() => this.copied.set(null), 1500);
    });
  }
}
