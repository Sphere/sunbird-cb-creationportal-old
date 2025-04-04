import { FullscreenOverlayContainer, OverlayContainer } from '@angular/cdk/overlay'
import { APP_BASE_HREF, PlatformLocation } from '@angular/common'
import { HttpClientJsonpModule, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http'
import { APP_INITIALIZER, Injectable, NgModule, ErrorHandler } from '@angular/core'
import {
  GestureConfig,
  MatButtonModule,
  MatCardModule,
  MatDialogModule,
  MatDividerModule,
  MatExpansionModule,
  MatIconModule,
  MatMenuModule,
  MatProgressBarModule,
  MatRippleModule,
  MatSliderModule,
  MatToolbarModule,
  MatTooltipModule,
  MAT_PROGRESS_SPINNER_DEFAULT_OPTIONS,
  MAT_SNACK_BAR_DEFAULT_OPTIONS,
  MatInputModule,
  MatFormFieldModule,
  MatListModule,
} from '@angular/material'
import { BrowserModule, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { BtnFeatureModule, ErrorResolverModule, TourModule, WIDGET_REGISTERED_MODULES, WIDGET_REGISTRATION_CONFIG, PipeContentRoutePipe } from '@ws-widget/collection'
import { StickyHeaderModule } from '@ws-widget/collection/src/lib/_common/sticky-header/sticky-header.module'
import { WidgetResolverModule } from '@ws-widget/resolver'
import { LoggerService, PipeSafeSanitizerModule } from '@ws-widget/utils'
import { SearchModule } from '@ws/app/src/public-api'
import 'hammerjs'
import { KeycloakAngularModule } from 'keycloak-angular'
import { AppRoutingModule } from './app-routing.module'
import { InitService } from './services/init.service'
import { GlobalErrorHandlingService } from './services/global-error-handling.service'

import { RootComponent } from './component/root/root.component'
import { LoginComponent } from './component/login/login.component'
import { AppFooterComponent } from './component/app-footer/app-footer.component'
import { AppNavBarComponent } from './component/app-nav-bar/app-nav-bar.component'
import { AppPublicNavBarComponent } from './component/app-public-nav-bar/app-public-nav-bar.component'
// import { ServiceWorkerModule } from '@angular/service-worker'
// import { environment } from '../environments/environment'
import { DialogConfirmComponent } from './component/dialog-confirm/dialog-confirm.component'
import { InvalidUserComponent } from './component/invalid-user/invalid-user.component'
import { LoginRootComponent } from './component/login-root/login-root.component'
import { LoginRootDirective } from './component/login-root/login-root.directive'
import { TncRendererComponent } from './component/tnc-renderer/tnc-renderer.component'
import { MobileAppModule } from './routes/public/mobile-app/mobile-app.module'
import { PublicAboutModule } from './routes/public/public-about/public-about.module'
import { PublicContactModule } from './routes/public/public-contact/public-contact.module'
import { PublicFaqModule } from './routes/public/public-faq/public-faq.module'
import { TncComponent } from './routes/tnc/tnc.component'
import { AppInterceptorService } from './services/app-interceptor.service'
import { AppRetryInterceptorService } from './services/app-retry-interceptor.service'
import { TncAppResolverService } from './services/tnc-app-resolver.service'
import { TncPublicResolverService } from './services/tnc-public-resolver.service'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { PublicReleaseModule } from './routes/public/public-release/public-about.module'
import { AppTocResolverService } from '@ws/author'
import { AuthInitService } from '../../project/ws/author/src/lib/services/init.service'
// import { ServiceWorkerModule } from '@angular/service-worker'
// import { environment } from '../environments/environment'
import { OrgComponent } from '../../project/ws/app/src/lib/routes/org/components/org/org.component'
import { PlayerVideoPopupComponent } from '../../library/ws-widget/collection/src/lib/player-video-popup/player-video-popup-component'

import { SharedModule } from '../../project/ws/author/src/lib/modules/shared/shared.module'
@Injectable()
export class HammerConfig extends GestureConfig {
  buildHammer(element: HTMLElement) {
    return new GestureConfig({ touchAction: 'pan-y' }).buildHammer(element)
  }
}
const appInitializer = (initSvc: InitService, logger: LoggerService) => async () => {
  try {
    await initSvc.init()
  } catch (error) {
    logger.error('ERROR DURING APP INITIALIZATION >', error)
  }
}

const getBaseHref = (platformLocation: PlatformLocation): string => {
  return platformLocation.getBaseHrefFromDOM()
}

// tslint:disable-next-line: max-classes-per-file
@NgModule({
  declarations: [
    RootComponent,
    LoginComponent,
    AppNavBarComponent,
    AppPublicNavBarComponent,
    TncComponent,
    TncRendererComponent,
    AppFooterComponent,
    InvalidUserComponent,
    DialogConfirmComponent,
    LoginRootComponent,
    LoginRootDirective,
    OrgComponent,
    PlayerVideoPopupComponent
  ],
  imports: [
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,
    HttpClientModule,
    HttpClientJsonpModule,
    BrowserAnimationsModule,
    KeycloakAngularModule,
    AppRoutingModule,
    ...WIDGET_REGISTERED_MODULES,
    WidgetResolverModule.forRoot(WIDGET_REGISTRATION_CONFIG),
    StickyHeaderModule,
    ErrorResolverModule,
    // Material Imports
    MatListModule,
    MatSliderModule,
    MatButtonModule,
    MatCardModule,
    MatToolbarModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatRippleModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    SearchModule,
    BtnFeatureModule,
    PublicAboutModule,
    PublicContactModule,
    PublicFaqModule,
    PublicReleaseModule,
    MobileAppModule,
    PipeSafeSanitizerModule,
    TourModule,
    // ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
  ],
  exports: [
    TncComponent,
  ],
  bootstrap: [RootComponent],
  entryComponents: [
    DialogConfirmComponent,
    LoginComponent,
    PlayerVideoPopupComponent
  ],
  providers: [
    {
      deps: [InitService, LoggerService],
      multi: true,
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
    },
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: { duration: 5000 },
    },
    {
      provide: MAT_PROGRESS_SPINNER_DEFAULT_OPTIONS,
      useValue: {
        diameter: 55,
        strokeWidth: 4,
      },
    },
    { provide: HTTP_INTERCEPTORS, useClass: AppInterceptorService, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AppRetryInterceptorService, multi: true },
    TncAppResolverService,
    TncPublicResolverService,
    PipeContentRoutePipe,
    AppTocResolverService,
    {
      provide: APP_BASE_HREF,
      useFactory: getBaseHref,
      deps: [PlatformLocation],
    },
    { provide: OverlayContainer, useClass: FullscreenOverlayContainer },
    { provide: HAMMER_GESTURE_CONFIG, useClass: HammerConfig },
    { provide: ErrorHandler, useClass: GlobalErrorHandlingService },
    AuthInitService
  ],
})
export class AppModule { }
