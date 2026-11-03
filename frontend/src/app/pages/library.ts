import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api, Live, errMsg } from '../core/api';

@Component({
  template: `
    <header class="page-head"><h2>Library</h2>
      <p class="muted">Upload the files you want to ask about. They are read and indexed on your server. No AI is used here.</p></header>
    <label class="drop" [class.over]="over()" (dragover)="$event.preventDefault(); over.set(true)" (dragleave)="over.set(false)"
           (drop)="$event.preventDefault(); over.set(false); send($event.dataTransfer?.files)">
      <input type="file" multiple hidden accept=".pdf,.docx,.txt,.md,.csv,.xlsx" (change)="send($any($event.target).files)">
      <strong>{{ busy() ? 'Uploading ' + busy() + ' file(s)…' : 'Drop files here or click to choose' }}</strong>
      <span class="muted small">PDF, DOCX, TXT, MD, CSV, XLSX · up to 50 MB each</span>
    </label>
    @if (err()) { <p class="err" role="alert">{{ err() }}</p> }

    <div class="scroll"><table class="tbl lib">
      <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Status</th><th><span class="sr">Actions</span></th></tr></thead>
      <tbody>
        @for (d of live.docs(); track d.id) {
          <tr>
            <td class="name">{{ d.name }}</td>
            <td>{{ d.kind === 'dataset' ? 'Dataset' : 'Document' }}</td>
            <td>{{ size(d.size) }}</td>
            <td>
              @if (d.status === 'ready') { <span class="ok">Ready</span> }
              @else if (d.status === 'failed') { <span class="err">Failed</span><div class="small err">{{ d.error }}</div> }
              @else {
                <div class="bar" role="progressbar" [attr.aria-valuenow]="d.progress" aria-valuemin="0" aria-valuemax="100"><i [style.width.%]="d.progress"></i></div>
                <span class="muted small">{{ d.stage }} · {{ d.progress }}%</span>
              }
            </td>
            <td><button class="link danger" (click)="remove(d.id)" [attr.aria-label]="'Delete ' + d.name">Delete</button></td>
          </tr>
        } @empty { <tr><td colspan="5" class="empty">No files yet. Upload a report or a spreadsheet to begin.</td></tr> }
      </tbody>
    </table></div>`,
})
export class LibraryPage {
  live = inject(Live);
  private api = inject(Api);
  busy = signal(0); over = signal(false); err = signal('');

  size(b: number) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  async send(files?: FileList | null) {
    if (!files?.length) return;
    this.err.set('');
    for (const f of Array.from(files)) {
      this.busy.update(n => n + 1);
      try { await firstValueFrom(this.api.upload(f)); }
      catch (e) { this.err.set(`${f.name}: ${errMsg(e)}`); }
      finally { this.busy.update(n => n - 1); }
    }
  }
  remove(id: number) { this.api.remove(id).subscribe({ error: e => this.err.set(errMsg(e)) }); }
}
