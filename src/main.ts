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
  ellipsisVertical,
  notificationsOutline,
  flashOutline,
  restaurantOutline,
  scanOutline
} from 'ionicons/icons';

// Registrar Swiper
import { register } from 'swiper/element/bundle';
register();

addIcons({
  'ellipsis-horizontal': ellipsisHorizontal,
  'create-outline': createOutline,
  'remove-outline': removeOutline,
  'add': add,
  'ellipsis-vertical': ellipsisVertical,
  'notifications-outline': notificationsOutline,
  'flash-outline': flashOutline,
  'restaurant-outline': restaurantOutline,
  'scan-outline': scanOutline
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
