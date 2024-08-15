import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component').then( m => m.HomeComponent)
  },


  {
    path: '**',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];


// import { Routes } from '@angular/router';
// import { authGuard } from './guards/auth.guard';

// export const routes: Routes = [
//   {
//     path: 'login',
//     loadComponent: () =>
//       import('./core/login/login.page').then((m) => m.LoginPage),
//   },

//   {
//     path: 'content-management-page',
//     loadComponent: () => import('./pages/admin/content-management-page/content-management-page.page').then( m => m.ContentManagementPagePage)
//   },
  
//   {
//     path: 'new-article',
//     loadComponent: () => import('./pages/admin/content-management-page/components/news-crud-component/new-article/new-article.component').then( m => m.NewArticleComponent)
//   },

//   {
//     path: 'new-article/:id',
//     loadComponent: () => import('./pages/admin/content-management-page/components/news-crud-component/new-article/new-article.component').then( m => m.NewArticleComponent)
//   },

//   {
//     path: '',
//     canActivate: [authGuard],
//     loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
//   },
//   {
//     path: '**',
//     redirectTo: '/login',
//     pathMatch: 'full',
//   },
// ];
