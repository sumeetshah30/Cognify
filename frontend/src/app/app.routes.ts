import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Auth } from './core/api';
import { Shell } from './shared/shell';

const authGuard: CanActivateFn = () => (inject(Auth).token() ? true : inject(Router).createUrlTree(['/login']));

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login').then(m => m.LoginPage) },
  {
    path: '', component: Shell, canActivate: [authGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'ask' },
      { path: 'library', loadComponent: () => import('./pages/library').then(m => m.LibraryPage), title: 'Library · Cognify' },
      { path: 'ask', loadComponent: () => import('./pages/ask').then(m => m.AskPage), title: 'Ask · Cognify' },
      { path: 'compare', loadComponent: () => import('./pages/compare').then(m => m.ComparePage), title: 'Compare · Cognify' },
      { path: 'data', loadComponent: () => import('./pages/data').then(m => m.DataPage), title: 'Data · Cognify' },
      { path: 'agent', loadComponent: () => import('./pages/agent').then(m => m.AgentPage), title: 'Agent · Cognify' },
      { path: 'reports', loadComponent: () => import('./pages/reports').then(m => m.ReportsPage), title: 'Reports · Cognify' },
    ],
  },
  { path: '**', redirectTo: '' },
];
