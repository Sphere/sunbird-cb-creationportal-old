import { NsWidgetResolver } from '@ws-widget/resolver'

// Components
import { BtnAppsComponent } from './btn-apps/btn-apps.component'

// Modules

import { AuthorCardModule } from './author-card/author-card.module'

import { AuthorCardComponent } from './author-card/author-card.component'

import { AvatarPhotoModule } from './_common/avatar-photo/avatar-photo.module'

import { BtnAppsModule } from './btn-apps/btn-apps.module'

import { BtnCallComponent } from './btn-call/btn-call.component'

import { BtnCallModule } from './btn-call/btn-call.module'

import { BtnCatalogComponent } from './btn-catalog/btn-catalog.component'

import { BtnCatalogModule } from './btn-catalog/btn-catalog.module'

import { BtnContentLikeComponent } from './btn-content-like/btn-content-like.component'

import { BtnContentLikeModule } from './btn-content-like/btn-content-like.module'

import { BtnContentShareComponent } from './btn-content-share/btn-content-share.component'

import { BtnContentShareModule } from './btn-content-share/btn-content-share.module'

import { BtnContentDownloadComponent } from './btn-content-download/btn-content-download.component'

import { BtnContentDownloadModule } from './btn-content-download/btn-content-download.module'

import { BtnGoalsComponent } from './btn-goals/btn-goals.component'

import { BtnGoalsModule } from './btn-goals/btn-goals.module'

import { BtnFeatureComponent } from './btn-feature/btn-feature.component'

import { BtnFeatureModule } from './btn-feature/btn-feature.module'

import { BtnFullscreenComponent } from './btn-fullscreen/btn-fullscreen.component'

import { BtnFullscreenModule } from './btn-fullscreen/btn-fullscreen.module'

import { BtnPageBackComponent } from './btn-page-back/btn-page-back.component'

import { BtnPageBackNavModule } from './btn-page-back-nav/btn-page-back-nav.module'

import { BtnPageBackModule } from './btn-page-back/btn-page-back.module'

import { BtnPreviewComponent } from './btn-preview/btn-preview.component'

import { BtnPreviewModule } from './btn-preview/btn-preview.module'

import { BtnProfileComponent } from './btn-profile/btn-profile.component'

import { BtnProfileModule } from './btn-profile/btn-profile.module'

import { CardBreadcrumbComponent } from './card-breadcrumb/card-breadcrumb.component'

import { CardBreadcrumbModule } from './card-breadcrumb/card-breadcrumb.module'

import { CardContentComponent } from './card-content/card-content.component'

import { CardContentModule } from './card-content/card-content.module'

// import { CardLearnComponent } from './card-learn/card-learn.component'

// import { CardLearnModule } from './card-learn/card-learn.module'

// import { CardWelcomeComponent } from './card-welcome/card-welcome.component'

// import { CardNetworkComponent } from './card-network/card-network.component'

// import { CardBrowseCourseModule } from './card-browse-course/card-browse-course.module'

// import { CardHomeDiscussModule } from './card-home-discuss/card-home-discuss.module'

import { ROOT_WIDGET_CONFIG } from './collection.config'

import { ContentStripMultipleComponent } from './content-strip-multiple/content-strip-multiple.component'

import { ContentStripNewMultipleComponent } from './content-strip-new-multiple/content-strip-new-multiple.component'

import { ContentStripMultipleModule } from './content-strip-multiple/content-strip-multiple.module'

import { ContentStripNewMultipleModule } from './content-strip-new-multiple/content-strip-new-multiple.module'

import { ContentStripSingleComponent } from './content-strip-single/content-strip-single.component'

import { ContentStripSingleModule } from './content-strip-single/content-strip-single.module'

import { ErrorResolverComponent } from './error-resolver/error-resolver.component'

import { ErrorResolverModule } from './error-resolver/error-resolver.module'

import { GraphGeneralComponent } from './graph-general/graph-general.component'

import { GraphGeneralModule } from './graph-general/graph-general.module'

import { GridLayoutComponent } from './grid-layout/grid-layout.component'

import { GridLayoutModule } from './grid-layout/grid-layout.module'

import { ImageMapResponsiveComponent } from './image-map-responsive/image-map-responsive.component'

import { ImageMapResponsiveModule } from './image-map-responsive/image-map-responsive.module'

import { IntranetSelectorComponent } from './intranet-selector/intranet-selector.component'

import { IntranetSelectorModule } from './intranet-selector/intranet-selector.module'

import { ActivityStripMultipleModule } from './activity-strip-multiple/activity-strip-multiple.module'

import { ActivityStripMultipleComponent } from './activity-strip-multiple/activity-strip-multiple.component'

import { PageComponent } from './page/page.component'

import { PageModule } from './page/page.module'

import { ProfileAcademicsComponent } from './profile-v2/profile-academics/profile-academics.component'

import { ProfileAcademicsModule } from './profile-v2/profile-academics/profile-academics.module'

import { ProfileCareerComponent } from './profile-v2/profile-career/profile-career.component'

import { ProfileCareerModule } from './profile-v2/profile-career/profile-career.module'

import { ProfileCompetenciesComponent } from './profile-v2/profile-competencies/profile-competencies.component'

import { ProfileCompetenciesModule } from './profile-v2/profile-competencies/profile-competencies.module'

import { PickerContentModule } from './picker-content/picker-content.module'

import { PlayerAudioComponent } from './player-audio/player-audio.component'

import { PlayerAudioModule } from './player-audio/player-audio.module'

import { PlayerPdfComponent } from './player-pdf/player-pdf.component'

import { PlayerPdfModule } from './player-pdf/player-pdf.module'

import { PlayerSlidesComponent } from './player-slides/player-slides.component'

import { PlayerSlidesModule } from './player-slides/player-slides.module'

import { PlayerVideoComponent } from './player-video/player-video.component'

import { PlayerVideoModule } from './player-video/player-video.module'

import { PlayerWebPagesComponent } from './player-web-pages/player-web-pages.component'

import { PlayerWebPagesModule } from './player-web-pages/player-web-pages.module'

import { PlayerYoutubeComponent } from './player-youtube/player-youtube.component'

import { PlayerYoutubeModule } from './player-youtube/player-youtube.module'

import { ReleaseNotesComponent } from './release-notes/release-notes.component'

import { ReleaseNotesModule } from './release-notes/release-notes.module'

import { SelectorResponsiveComponent } from './selector-responsive/selector-responsive.component'

import { SelectorResponsiveModule } from './selector-responsive/selector-responsive.module'

import { TreeCatalogModule } from './tree-catalog/tree-catalog.module'

import { ContentStripVerticalModule } from './content-strip-vertical/content-strip-vertical.module'

import { ContentStripVerticalComponent } from './content-strip-vertical/content-strip-vertical.component'

// import { CardNetworkHomeComponent } from './card-network-home/card-network-home.component'

// import { CardHomeDiscussComponent } from './card-home-discuss/card-home-discuss.component'

// import { CardBrowseCourseComponent } from './card-browse-course/card-browse-course.component'

// import { CardNetworkHomeModule } from './card-network-home/card-network-home.module'

// import { DiscussStripMultipleComponent } from './discuss-strip-multiple/discuss-strip-multiple.component'

// import { DiscussStripMultipleModule } from './discuss-strip-multiple/discuss-strip-multiple.module'

// import { CardActivityComponent } from './card-activity/card-activity.component'

// import { CardActivityModule } from './card-activity/card-activity.module'

import { LeftMenuModule } from './left-menu/left-menu.module'

import { LeftMenuComponent } from './left-menu/left-menu.component'

import { CardTableModule } from './card-table/card-table.module'

import { CardTableComponent } from './card-table/card-table.component'

import { DiscussionForumModule } from './discussion-forum/discussion-forum.module'

import { DiscussionForumComponent } from './discussion-forum/components/discussion-forum/discussion-forum.component'

// import { UserListDisplayComponent } from './ui-table/components/user-list-display/user-list-display.component'

export const WIDGET_REGISTERED_MODULES = [
  AuthorCardModule,
  AvatarPhotoModule,
  BtnAppsModule,
  BtnCallModule,
  BtnCatalogModule,

  BtnContentDownloadModule,
  BtnGoalsModule,
  BtnContentLikeModule,
  BtnContentShareModule,
  BtnFullscreenModule,
  BtnPageBackNavModule,
  BtnPageBackModule,
  BtnPreviewModule,
  BtnProfileModule,
  CardBreadcrumbModule,
  CardContentModule,
  CardTableModule,
  // CardLearnModule,
  // CardWelcomeModule,
  // CardNetworkModule,

  // CardBrowseCourseModule,
  // CardHomeDiscussModule,
  // UITableModule,
  ContentStripMultipleModule,
  ContentStripNewMultipleModule,
  ContentStripSingleModule,
  ContentStripVerticalModule,
  DiscussionForumModule,
  GraphGeneralModule,
  LeftMenuModule,
  PickerContentModule,
  PlayerAudioModule,
  PlayerPdfModule,
  PlayerSlidesModule,
  PlayerVideoModule,
  PlayerWebPagesModule,
  PlayerYoutubeModule,
  ReleaseNotesModule,
  TreeCatalogModule,
  PageModule,
  ProfileAcademicsModule,
  ProfileCareerModule,
  ProfileCompetenciesModule,
  SelectorResponsiveModule,
  GridLayoutModule,
  ErrorResolverModule,
  BtnFeatureModule,
  ImageMapResponsiveModule,
  IntranetSelectorModule,

  ActivityStripMultipleModule,
]

export const WIDGET_REGISTRATION_CONFIG: NsWidgetResolver.IRegistrationConfig[] = [
  {
    widgetType: ROOT_WIDGET_CONFIG.authorCard._type,
    widgetSubType: ROOT_WIDGET_CONFIG.authorCard.default,
    component: AuthorCardComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.apps,
    component: BtnAppsComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.call,
    component: BtnCallComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.catalog,
    component: BtnCatalogComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.contentDownload,
    component: BtnContentDownloadComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.contentLike,
    component: BtnContentLikeComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.goals,
    component: BtnGoalsComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.contentShare,
    component: BtnContentShareComponent,
  },
  // {
  //   widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
  //   widgetSubType: ROOT_WIDGET_CONFIG.actionButton.contentShare,
  //   component: BtnContentShareComponent,
  // },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.fullscreen,
    component: BtnFullscreenComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.pageBack,
    component: BtnPageBackComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.preview,
    component: BtnPreviewComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.newProfile,
    component: BtnProfileComponent,
  },

  {
    widgetType: ROOT_WIDGET_CONFIG.card._type,
    widgetSubType: ROOT_WIDGET_CONFIG.card.breadcrumb,
    component: CardBreadcrumbComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.card._type,
    widgetSubType: ROOT_WIDGET_CONFIG.card.content,
    component: CardContentComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.card._type,
    widgetSubType: ROOT_WIDGET_CONFIG.table.cardTable,
    component: CardTableComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.contentStrip._type,
    widgetSubType: ROOT_WIDGET_CONFIG.contentStrip.multiStrip,
    component: ContentStripMultipleComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.contentStrip._type,
    widgetSubType: ROOT_WIDGET_CONFIG.contentStrip.multiStripNew,
    component: ContentStripNewMultipleComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.contentStrip._type,
    widgetSubType: ROOT_WIDGET_CONFIG.contentStrip.verticalStrip,
    component: ContentStripVerticalComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.contentStrip._type,
    widgetSubType: ROOT_WIDGET_CONFIG.contentStrip.singleStrip,
    component: ContentStripSingleComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.graph._type,
    widgetSubType: ROOT_WIDGET_CONFIG.graph.graphGeneral,
    component: GraphGeneralComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.menus._type,
    widgetSubType: ROOT_WIDGET_CONFIG.menus.leftMenu,
    component: LeftMenuComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.activityStrip._type,
    widgetSubType: ROOT_WIDGET_CONFIG.activityStrip.multipleStrip,
    component: ActivityStripMultipleComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.player._type,
    widgetSubType: ROOT_WIDGET_CONFIG.player.audio,
    component: PlayerAudioComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.player._type,
    widgetSubType: ROOT_WIDGET_CONFIG.player.pdf,
    component: PlayerPdfComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.player._type,
    widgetSubType: ROOT_WIDGET_CONFIG.player.slides,
    component: PlayerSlidesComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.player._type,
    widgetSubType: ROOT_WIDGET_CONFIG.player.video,
    component: PlayerVideoComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.player._type,
    widgetSubType: ROOT_WIDGET_CONFIG.player.webPages,
    component: PlayerWebPagesComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.player._type,
    widgetSubType: ROOT_WIDGET_CONFIG.player.youtube,
    component: PlayerYoutubeComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.releaseNotes._type,
    widgetSubType: ROOT_WIDGET_CONFIG.releaseNotes.user,
    component: ReleaseNotesComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.page._type,
    widgetSubType: ROOT_WIDGET_CONFIG.page.standard,
    component: PageComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.profileV2._type,
    widgetSubType: ROOT_WIDGET_CONFIG.profileV2.academics,
    component: ProfileAcademicsComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.profileV2._type,
    widgetSubType: ROOT_WIDGET_CONFIG.profileV2.career,
    component: ProfileCareerComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.profileV2._type,
    widgetSubType: ROOT_WIDGET_CONFIG.profileV2.competencies,
    component: ProfileCompetenciesComponent,
  },

  {
    widgetType: ROOT_WIDGET_CONFIG.selector._type,
    widgetSubType: ROOT_WIDGET_CONFIG.selector.responsive,
    component: SelectorResponsiveComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.discussionForum._type,
    widgetSubType: ROOT_WIDGET_CONFIG.discussionForum.discussionForum,
    component: DiscussionForumComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.layout._type,
    widgetSubType: ROOT_WIDGET_CONFIG.layout.grid,
    component: GridLayoutComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.errorResolver._type,
    widgetSubType: ROOT_WIDGET_CONFIG.errorResolver.errorResolver,
    component: ErrorResolverComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.actionButton._type,
    widgetSubType: ROOT_WIDGET_CONFIG.actionButton.feature,
    component: BtnFeatureComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.imageMap._type,
    widgetSubType: ROOT_WIDGET_CONFIG.imageMap.imageMapResponsive,
    component: ImageMapResponsiveComponent,
  },
  {
    widgetType: ROOT_WIDGET_CONFIG.selector._type,
    widgetSubType: ROOT_WIDGET_CONFIG.selector.intranet,
    component: IntranetSelectorComponent,
  },
  // {
  //   widgetType: ROOT_WIDGET_CONFIG.selector._type,
  //   widgetSubType: ROOT_WIDGET_CONFIG.selector.intranet,
  //   component: UserListDisplayComponent,
  // },
]
