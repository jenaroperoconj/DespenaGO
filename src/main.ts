import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

import { addIcons } from 'ionicons';
import { 
  ellipsisHorizontal, 
  removeOutline, 
  createOutline,
  add,
  ellipsisVertical
} from 'ionicons/icons';

addIcons({
  'ellipsis-horizontal': ellipsisHorizontal,
  'create-outline': createOutline,
  'remove-outline': removeOutline,
  'add': add,
  'ellipsis-vertical': ellipsisVertical
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
