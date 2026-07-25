# Component Inventory & Unused-Candidate Review

**Total components:** 425 | **Classifier UNUSED-candidates:** 15

> Classifier flags a component UNUSED only if its selector renders in no template, it is not a route target, not in the widget registry, and its class is invoked in no non-barrel .ts. Widgets/viewer flagged here may still be referenced from backend content JSON (outside repo) — confirm before removing.

## ⚠️ UNUSED-candidates (15) — mark [x] the ones safe to remove

- [ ] **ContentPickerV2Component** `ws-widget-content-picker-v2`
  - library/ws-widget/collection/src/lib/\_common/content-picker-v2/content-picker-v2.component.ts
- [ ] **DisplayContentsComponent** `ws-widget-display-contents[contents]`
  - library/ws-widget/collection/src/lib/\_common/display-contents/display-contents.component.ts
- [ ] **EmailInputComponent** `ws-widget-email-input`
  - library/ws-widget/collection/src/lib/\_common/email-input/email-input.component.ts
- [ ] **ProfileImageComponent** `ws-widget-profile-image`
  - library/ws-widget/collection/src/lib/\_common/profile-image/profile-image/profile-image.component.ts
- [ ] **TourComponent** `ws-widget-ws-tour`
  - library/ws-widget/collection/src/lib/\_common/tour-guide/tour-guide.component.ts
- [ ] **BtnSocialDeleteComponent** `ws-widget-btn-social-delete`
  - library/ws-widget/collection/src/lib/discussion-forum/actionBtn/btn-social-delete/btn-social-delete.component.ts
- [ ] **SetupDoneComponent** `ws-app-setup-done`
  - project/ws/app/src/lib/routes/app-setup/components/setup-done/setup-done.component.ts
- [ ] **CommentsComponent** `ws-auth-root-comments`
  - project/ws/author/src/lib/modules/shared/components/comments/comments.component.ts
- [ ] **EntityCardComponent** `ws-auth-entity-card`
  - project/ws/author/src/lib/routing/modules/create/components/entity-card/entity-card.component.ts
- [ ] **ContentStripInputComponent** `ws-auth-content-strip-input`
  - project/ws/author/src/lib/routing/modules/editor/routing/modules/channel/components/input/content-strip-input/content-strip-input.component.ts
- [ ] **ImageGalleryComponent** `ws-auth-image-gallery`
  - project/ws/author/src/lib/routing/modules/editor/routing/modules/channel/components/input/image-gallery/image-gallery.component.ts
- [ ] **CollectionComponent** `ws-auth-collection`
  - project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/collection/collection.component.ts
- [ ] **ResourceModuleComponent** `ws-author-resource-module`
  - project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/collection/resource-module/resource-module.component.ts
- [ ] **ReviewerChecklist** `ws-reviewer-checklist-view`
  - project/ws/author/src/lib/routing/modules/editor/shared/components/reviewer-checklist/reviewer-checklist.component.ts
- [ ] **QuillComponent** `ws-auth-root-ws-quill`
  - project/ws/author/src/lib/routing/modules/editor/shared/components/rich-text-editor/quill.component.ts

---

## Full inventory (all 425) by tier

### 1. widgets (collection)

| Component                           | Selector                                   | Verdict    | Evidence                                               |
| ----------------------------------- | ------------------------------------------ | ---------- | ------------------------------------------------------ |
| AppTourDialogComponent              | `ws-widget-app-tour-dialog`                | ✅ used    | class ref: setup-done.component.ts                     |
| AvatarPhotoComponent                | `ws-widget-avatar-photo`                   | ✅ used    | selector in template                                   |
| CompletionSpinnerComponent          | `ws-widget-completion-spinner`             | ✅ used    | selector in template                                   |
| FiltersComponent                    | `ws-widget-filters`                        | ✅ used    | selector in template                                   |
| SearchInputComponent                | `ws-widget-search-input`                   | ✅ used    | selector in template                                   |
| ContentPickerV2Component            | `ws-widget-content-picker-v2`              | ⚠️ UNUSED? | no template/route/registry/class ref                   |
| ContentProgressComponent            | `ws-widget-content-progress`               | ✅ used    | selector in template                                   |
| DisplayContentTypeIconComponent     | `ws-widget-display-content-type-icon`      | ✅ used    | selector in template                                   |
| DisplayContentTypeComponent         | `ws-widget-display-content-type`           | ✅ used    | selector in template                                   |
| DisplayContentsComponent            | `ws-widget-display-contents[contents]`     | ⚠️ UNUSED? | no template/route/registry/class ref                   |
| EmailInputComponent                 | `ws-widget-email-input`                    | ⚠️ UNUSED? | no template/route/registry/class ref                   |
| LanguageSelectorComponent           | `ws-widget-language-selector`              | ✅ used    | selector in template                                   |
| LocaleTranslatorComponent           | `ws-widget-locale-translator`              | ✅ used    | selector in template                                   |
| ProfileImageComponent               | `ws-widget-profile-image`                  | ⚠️ UNUSED? | no template/route/registry/class ref                   |
| StickyHeaderComponent               | `ws-widget-sticky-header`                  | ✅ used    | selector in template                                   |
| TourComponent                       | `ws-widget-ws-tour`                        | ⚠️ UNUSED? | no template/route/registry/class ref                   |
| UserAutocompleteComponent           | `ws-widget-user-autocomplete`              | ✅ used    | selector in template                                   |
| UserContentDetailedRatingComponent  | `ws-widget-user-content-detailed-rating`   | ✅ used    | selector in template                                   |
| UserContentRatingComponent          | `ws-widget-user-content-rating`            | ✅ used    | selector in template                                   |
| UserImageComponent                  | `ws-widget-user-image`                     | ✅ used    | selector in template                                   |
| ActivityStripMultipleComponent      | `ws-widget-activity-strip-multiple`        | ✅ used    | route target                                           |
| AtGlanceComponent                   | `ws-widget-at-glance`                      | ✅ used    | selector in template                                   |
| AuthorCardComponent                 | `ws-widget-author-card`                    | ✅ used    | selector in template                                   |
| BtnAppsComponent                    | `ws-widget-btn-apps`                       | ✅ used    | route target                                           |
| BtnCallDialogComponent              | `ws-widget-btn-call-dialog`                | ✅ used    | class ref: btn-call.component.ts                       |
| BtnCallComponent                    | `ws-widget-btn-call`                       | ✅ used    | selector in template                                   |
| BtnCatalogComponent                 | `ws-widget-btn-catalog`                    | ✅ used    | route target                                           |
| BtnChannelAnalyticsComponent        | `ws-widget-btn-channel-analytics`          | ✅ used    | selector in template                                   |
| BtnContentDownloadComponent         | `ws-widget-btn-content-download`           | ✅ used    | selector in template                                   |
| BtnContentFeedbackDialogV2Component | `ws-widget-btn-content-feedback-dialog-v2` | ✅ used    | class ref: btn-content-feedback-v2.component.ts        |
| BtnContentFeedbackV2Component       | `ws-widget-btn-content-feedback-v2`        | ✅ used    | selector in template                                   |
| FeedbackSnackbarComponent           | `ws-widget-feedback-snackbar`              | ✅ used    | class ref: btn-content-feedback-dialog-v2.component.ts |
| BtnContentLikeComponent             | `ws-widget-btn-content-like`               | ✅ used    | selector in template                                   |
| BtnContentMailMeDialogComponent     | `ws-widget-btn-content-mail-me-dialog`     | ✅ used    | class ref: btn-content-mail-me.component.ts            |
| BtnContentMailMeComponent           | `ws-widget-btn-content-mail-me`            | ✅ used    | selector in template                                   |
| BtnContentShareDialogComponent      | `ws-widget-btn-content-share-dialog`       | ✅ used    | class ref: btn-content-share.component.ts              |
| BtnContentShareComponent            | `ws-widget-btn-content-share`              | ✅ used    | selector in template                                   |
| BtnFacebookShareComponent           | `ws-widget-btn-facebook-share`             | ✅ used    | selector in template                                   |
| BtnFeatureComponent                 | `ws-widget-btn-feature`                    | ✅ used    | selector in template                                   |
| BtnFullscreenComponent              | `ws-widget-btn-fullscreen`                 | ✅ used    | selector in template                                   |
| BtnGoalsDialogComponent             | `ws-widget-btn-goals-dialog`               | ✅ used    | class ref: btn-goals.component.ts                      |
| BtnGoalsErrorComponent              | `ws-widget-btn-goals-error`                | ✅ used    | class ref: btn-goals-selection.component.ts            |
| BtnGoalsSelectionComponent          | `ws-widget-btn-goals-selection`            | ✅ used    | selector in template                                   |
| BtnGoalsComponent                   | `ws-widget-btn-goals`                      | ✅ used    | selector in template                                   |
| BtnLinkedinShareComponent           | `ws-widget-btn-linkedin-share`             | ✅ used    | selector in template                                   |
| BtnMailUserDialogComponent          | `ws-widget-btn-mail-user-dialog`           | ✅ used    | class ref: app-toc-single-page.component.ts            |
| BtnMailUserComponent                | `ws-widget-btn-mail-user`                  | ✅ used    | selector in template                                   |
| BtnPageBackNavComponent             | `ws-widget-btn-page-back-nav`              | ✅ used    | selector in template                                   |
| BtnPageBackComponent                | `ws-widget-btn-page-back`                  | ✅ used    | selector in template                                   |
| BtnPlaylistDialogComponent          | `ws-widget-btn-playlist-dialog`            | ✅ used    | class ref: btn-playlist.component.ts                   |
| BtnPlaylistSelectionComponent       | `ws-widget-btn-playlist-selection`         | ✅ used    | selector in template                                   |
| BtnPlaylistComponent                | `ws-widget-btn-playlist`                   | ✅ used    | selector in template                                   |
| BtnPreviewComponent                 | `ws-widget-btn-preview`                    | ✅ used    | route target                                           |
| BtnProfileComponent                 | `ws-widget-btn-profile`                    | ✅ used    | route target                                           |
| BtnSettingsComponent                | `ws-widget-btn-settings`                   | ✅ used    | route target                                           |
| BtnTwitterShareComponent            | `ws-widget-btn-twitter-share`              | ✅ used    | selector in template                                   |
| BtnWhatsappShareComponent           | `ws-widget-btn-whatsapp-share`             | ✅ used    | selector in template                                   |
| CardBreadcrumbComponent             | `ws-widget-card-breadcrumb`                | ✅ used    | route target                                           |
| CardContentComponent                | `ws-widget-card-content`                   | ✅ used    | selector in template                                   |
| CardTableComponent                  | `ws-widget-table-card-content`             | ✅ used    | selector in template                                   |
| ContentStripMultipleComponent       | `ws-widget-content-strip-multiple`         | ✅ used    | route target                                           |
| ContentStripNewMultipleComponent    | `ws-widget-content-strip-new-multiple`     | ✅ used    | route target                                           |
| ContentStripSingleComponent         | `ws-widget-content-strip-single`           | ✅ used    | route target                                           |
| ContentStripVerticalComponent       | `ws-widget-content-strip-vertical`         | ✅ used    | route target                                           |
| BtnSocialDeleteComponent            | `ws-widget-btn-social-delete`              | ⚠️ UNUSED? | no template/route/registry/class ref                   |
| BtnSocialLikeComponent              | `ws-widget-btn-social-like`                | ✅ used    | selector in template                                   |
| BtnSocialVoteComponent              | `ws-widget-btn-social-vote`                | ✅ used    | selector in template                                   |
| DiscussionForumComponent            | `ws-widget-discussion-forum`               | ✅ used    | route target                                           |
| DiscussionPostComponent             | `ws-widget-discussion-post`                | ✅ used    | selector in template                                   |
| DiscussionReplyComponent            | `ws-widget-discussion-reply`               | ✅ used    | selector in template                                   |
| DialogSocialActivityUserComponent   | `ws-widget-dialog-social-activity-user`    | ✅ used    | class ref: btn-social-like.component.ts                |
| DialogSocialDeletePostComponent     | `ws-widget-dialog-social-delete-post`      | ✅ used    | class ref: btn-social-delete.component.ts              |
| EditorQuillComponent                | `ws-widget-editor-quill`                   | ✅ used    | selector in template                                   |
| ElementHtmlComponent                | `ws-widget-element-html`                   | ✅ used    | route target                                           |
| EmbeddedPageComponent               | `ws-widget-embedded-page`                  | ✅ used    | route target                                           |
| ErrorAccessForbiddenComponent       | `ws-widget-error-access-forbidden`         | ✅ used    | selector in template                                   |
| ErrorContentUnavailableComponent    | `ws-widget-error-content-unavailable`      | ✅ used    | selector in template                                   |
| ErrorFeatureDisabledComponent       | `ws-widget-error-feature-disabled`         | ✅ used    | selector in template                                   |
| ErrorFeatureUnavailableComponent    | `ws-widget-error-feature-unavailable`      | ✅ used    | selector in template                                   |
| ErrorInternalServerComponent        | `ws-widget-error-internal-server`          | ✅ used    | selector in template                                   |
| ErrorNotFoundComponent              | `ws-widget-error-not-found`                | ✅ used    | selector in template                                   |
| ErrorServiceUnavailableComponent    | `ws-widget-error-service-unavailable`      | ✅ used    | selector in template                                   |
| ErrorSomethingWrongComponent        | `ws-widget-error-something-wrong`          | ✅ used    | selector in template                                   |
| ErrorResolverComponent              | `ws-widget-error-resolver`                 | ✅ used    | route target                                           |
| GalleryViewComponent                | `ws-widget-gallery-view`                   | ✅ used    | route target                                           |
| GraphGeneralComponent               | `ws-widget-graph-general`                  | ✅ used    | route target                                           |
| GridLayoutComponent                 | `ws-widget-grid-layout`                    | ✅ used    | route target                                           |
| ImageMapResponsiveComponent         | `ws-widget-image-map-responsive`           | ✅ used    | route target                                           |
| IntranetSelectorComponent           | `ws-widget-intranet-selector`              | ✅ used    | route target                                           |
| LayoutLinearComponent               | `ws-widget-layout-linear`                  | ✅ used    | route target                                           |
| LayoutTabComponent                  | `ws-widget-layout-tab`                     | ✅ used    | route target                                           |
| LeftMenuComponent                   | `ws-widget-left-menu`                      | ✅ used    | route target                                           |
| NetworkStripMultipleComponent       | `ws-widget-network-strip-multiple`         | ✅ used    | route target                                           |
| NewGridLayoutComponent              | `ws-widget-new-grid-layout`                | ✅ used    | route target                                           |
| PageComponent                       | `ws-widget-page`                           | ✅ used    | selector in template                                   |
| PickerContentComponent              | `ws-widget-picker-content[widgetData]`     | ✅ used    | selector in template                                   |
| PlayerAmpComponent                  | `ws-widget-player-amp`                     | ✅ used    | route target                                           |
| PlayerAudioComponent                | `ws-widget-player-audio`                   | ✅ used    | route target                                           |
| PlayerNavigationWidgetComponent     | `app-player-navigation-widget`             | ✅ used    | selector in template                                   |
| PlayerPdfComponent                  | `ws-widget-player-pdf`                     | ✅ used    | selector in template                                   |
| PlayerSlidesComponent               | `ws-widget-player-slides`                  | ✅ used    | route target                                           |
| PlayerVideoComponent                | `ws-widget-player-video`                   | ✅ used    | selector in template                                   |
| PlayerWebPagesComponent             | `ws-widget-player-web-pages`               | ✅ used    | route target                                           |
| PlayerYoutubeComponent              | `ws-widget-player-youtube`                 | ✅ used    | route target                                           |
| ProfileAcademicsComponent           | `ws-widget-profile-v2-academics`           | ✅ used    | route target                                           |
| ProfileCareerComponent              | `ws-widget-profile-v2-career`              | ✅ used    | route target                                           |
| ProfileCompetenciesComponent        | `ws-widget-profile-v2-competencies`        | ✅ used    | route target                                           |
| ProfileCretificationsComponent      | `ws-widget-profile-v2-cretifications`      | ✅ used    | route target                                           |
| ProfileDepartmentsComponent         | `ws-widget-profile-v2-departments`         | ✅ used    | route target                                           |
| ProfileHobbiesComponent             | `ws-widget-profile-v2-hobbies`             | ✅ used    | route target                                           |
| ReleaseNotesComponent               | `ws-widget-release-notes`                  | ✅ used    | route target                                           |
| SelectorResponsiveComponent         | `ws-widget-selector-responsive`            | ✅ used    | route target                                           |
| SlidersMobComponent                 | `ws-widget-sliders-mob`                    | ✅ used    | route target                                           |
| SlidersComponent                    | `ws-widget-sliders`                        | ✅ used    | route target                                           |
| TreeCatalogMenuComponent            | `ws-widget-tree-catalog-menu`              | ✅ used    | selector in template                                   |
| TreeCatalogComponent                | `ws-widget-tree-catalog`                   | ✅ used    | route target                                           |
| TreeComponent                       | `ws-widget-tree`                           | ✅ used    | selector in template                                   |

### 2. resolver

| Component                    | Selector                           | Verdict | Evidence                                        |
| ---------------------------- | ---------------------------------- | ------- | ----------------------------------------------- |
| InvalidPermissionComponent   | `ws-resolver-invalid-permission`   | ✅ used | class ref: widget-resolver.service.ts           |
| InvalidRegistrationComponent | `ws-resolver-invalid-registration` | ✅ used | class ref: widget-resolver.service.ts           |
| RestrictedComponent          | `ws-resolver-restricted`           | ✅ used | class ref: widget-resolver.service.ts           |
| UnresolvedComponent          | `ws-resolver-unresolved`           | ✅ used | class ref: widget-resolver.service.ts           |
| WidgetBaseComponent          | `ws-resolver-base`                 | ✅ used | class ref: activity-strip-multiple.component.ts |

### 3. utils

| Component                   | Selector                       | Verdict | Evidence                                |
| --------------------------- | ------------------------------ | ------- | --------------------------------------- |
| AceEditorCompatComponent    | `ace-editor, [ace-editor]`     | ✅ used | selector in template                    |
| ImageCropComponent          | `ws-utils-image-crop`          | ✅ used | class ref: create-course.component.ts   |
| NewImageCropComponent       | `ws-utils-image-crop`          | ✅ used | class ref: module-creation.component.ts |
| HorizontalScrollerComponent | `ws-utils-horizontal-scroller` | ✅ used | selector in template                    |
| LogoutComponent             | `ws-utils-logout`              | ✅ used | class ref: features.component.ts        |

### 4. app

| Component                         | Selector                                            | Verdict    | Evidence                                    |
| --------------------------------- | --------------------------------------------------- | ---------- | ------------------------------------------- |
| AppEventComponent                 | `ws-app-app-event`                                  | ✅ used    | route target                                |
| AppGalleryComponent               | `ws-app-app-gallery`                                | ✅ used    | route target                                |
| CardDetailsComponent              | `ws-app-card-details`                               | ✅ used    | selector in template                        |
| EventBannerComponent              | `ws-app-event-banner`                               | ✅ used    | selector in template                        |
| EventOverviewComponent            | `ws-app-event-overview`                             | ✅ used    | route target                                |
| EventSessionsComponent            | `ws-app-event-sessions`                             | ✅ used    | route target                                |
| IframeLoaderComponent             | `ws-app-iframe-loader`                              | ✅ used    | route target                                |
| MeetupComponent                   | `ws-app-meetup`                                     | ✅ used    | route target                                |
| ProfileDetailComponent            | `ws-auth-profile-detail`                            | ✅ used    | route target                                |
| ViewUsersComponent                | `ws-app-view-users`                                 | ✅ used    | class ref: profile-detail.component.ts      |
| AppSetupHomeComponent             | `ws-app-app-setup-home`                             | ✅ used    | route target                                |
| HomeComponent                     | `ws-app-home`                                       | ✅ used    | route target                                |
| LangSelectComponent               | `ws-app-lang-select`                                | ✅ used    | route target                                |
| SetupDoneComponent                | `ws-app-setup-done`                                 | ⚠️ UNUSED? | no template/route/registry/class ref        |
| TncRendererComponent              | `ws-app-tnc-renderer`                               | ✅ used    | selector in template                        |
| TncComponent                      | `ws-app-tnc`                                        | ✅ used    | route target                                |
| InterestComponent                 | `ws-app-interests`                                  | ✅ used    | route target                                |
| AppLearnerBannerComponent         | `ws-app-learner-banner`                             | ✅ used    | selector in template                        |
| AppTocAnalyticsTilesComponent     | `ws-app-app-toc-analytics-tiles`                    | ✅ used    | selector in template                        |
| AppTocBannerComponent             | `ws-app-toc-banner`                                 | ✅ used    | selector in template                        |
| AppTocCertificateModalComponent   | `ws-app-app-toc-certificate-modal`                  | ✅ used    | class ref: app-learner-banner.component.ts  |
| AppTocCohortsComponent            | `ws-app-toc-cohorts`                                | ✅ used    | selector in template                        |
| AppTocContentCardComponent        | `ws-app-toc-content-card`                           | ✅ used    | selector in template                        |
| AppTocDesktopModalComponent       | `ws-app-app-toc-desktop-modal`                      | ✅ used    | class ref: app-learner-banner.component.ts  |
| AppTocDialogIntroVideoComponent   | `ws-app-app-toc-dialog-intro-video`                 | ✅ used    | class ref: app-toc-banner.component.ts      |
| AppTocDiscussionComponent         | `ws-app-toc-discussion`                             | ✅ used    | selector in template                        |
| AppTocHomeComponent               | `ws-app-app-toc-home`                               | ✅ used    | route target                                |
| AppTocOverviewComponent           | `ws-app-app-toc-overview`                           | ✅ used    | class ref: app-toc-overview.component.ts    |
| AppTocSinglePageComponent         | `ws-app-app-toc-single-page`                        | ✅ used    | class ref: app-toc-single-page.component.ts |
| AssessmentDetailComponent         | `ws-app-assessment-detail`                          | ✅ used    | selector in template                        |
| KnowledgeArtifactDetailsComponent | `ws-app-knowledge-artifact-details`                 | ✅ used    | route target                                |
| LicenseComponent                  | `ws-app-license`                                    | ✅ used    | route target                                |
| AppTocAnalyticsComponent          | `ws-app-app-toc-analytics`                          | ✅ used    | route target                                |
| AccCardComponent                  | `ws-app-toc-certification-acc-card`                 | ✅ used    | selector in template                        |
| AccSlotBookingComponent           | `ws-app-acc-slot-booking`                           | ✅ used    | route target                                |
| AppTocCertificationComponent      | `ws-app-toc-certification`                          | ✅ used    | route target                                |
| AtDeskCardComponent               | `ws-app-toc-certification-at-desk-card`             | ✅ used    | selector in template                        |
| AtDeskSlotBookingComponent        | `ws-app-at-desk-slot-booking`                       | ✅ used    | route target                                |
| BookingCardComponent              | `ws-app-toc-certification-booking-card`             | ✅ used    | selector in template                        |
| BudgetApprovalComponent           | `ws-app-budget-approval`                            | ✅ used    | route target                                |
| BudgetCardComponent               | `ws-app-toc-certification-budget-card`              | ✅ used    | selector in template                        |
| CertificationEligibilityComponent | `ws-app-certification-eligibility`                  | ✅ used    | selector in template                        |
| HomeComponent                     | `ws-app-home`                                       | ✅ used    | route target                                |
| IapCardComponent                  | `ws-app-toc-certification-iap-card`                 | ✅ used    | selector in template                        |
| RequestCancelDialogComponent      | `ws-app-request-cancel-dialog`                      | ✅ used    | class ref: booking-card.component.ts        |
| ResultUploadComponent             | `ws-app-result-upload`                              | ✅ used    | route target                                |
| ResultVerificationCardComponent   | `ws-app-toc-certification-result-verification-card` | ✅ used    | selector in template                        |
| SnackbarComponent                 | `ws-app-certification-snackbar`                     | ✅ used    | class ref: acc-slot-booking.component.ts    |
| AppTocCohortsComponent            | `ws-app-app-toc-cohorts`                            | ✅ used    | route target                                |
| AppTocContentsComponent           | `ws-app-app-toc-contents`                           | ✅ used    | selector in template                        |
| AppTocHomeComponent               | `ws-app-app-toc-home-root`                          | ✅ used    | route target                                |
| AppTocOverviewComponent           | `ws-app-app-toc-overview-root`                      | ✅ used    | class ref: app-toc-overview.component.ts    |
| AppTocSinglePageComponent         | `ws-app-app-toc-single-page-root`                   | ✅ used    | class ref: app-toc-single-page.component.ts |
| FracComponent                     | `ws-app-frac`                                       | ✅ used    | route target                                |
| AboutVideoComponent               | `ws-app-about-video`                                | ✅ used    | selector in template                        |
| AboutHomeComponent                | `ws-app-about-home`                                 | ✅ used    | route target                                |
| ContactHomeComponent              | `ws-app-contact-home`                               | ✅ used    | route target                                |
| FaqHomeComponent                  | `ws-app-faq-home`                                   | ✅ used    | route target                                |
| QuickTourComponent                | `ws-app-quick-tour`                                 | ✅ used    | route target                                |
| MyDashboardHomeComponent          | `ws-app-my-dashboard-home`                          | ✅ used    | route target                                |
| HomeComponent                     | `ws-app-home`                                       | ✅ used    | route target                                |
| NotificationEventComponent        | `ws-app-notification-event`                         | ✅ used    | selector in template                        |
| NotificationComponent             | `ws-app-notification`                               | ✅ used    | route target                                |
| OrgComponent                      | `ws-app-org`                                        | ✅ used    | route target                                |
| CalendarComponent                 | `ws-app-calendar`                                   | ✅ used    | selector in template                        |
| ProfileComponent                  | `ws-app-profile`                                    | ✅ used    | route target                                |
| ProgressSpinnerComponent          | `ws-app-progress-spinner`                           | ✅ used    | selector in template                        |
| TileComponent                     | `ws-app-tile`                                       | ✅ used    | selector in template                        |
| FeatureUsageComponent             | `ws-app-feature-usage`                              | ✅ used    | route target                                |
| LearningComponent                 | `ws-app-learning`                                   | ✅ used    | route target                                |
| PlansComponent                    | `ws-app-plans`                                      | ✅ used    | route target                                |
| BadgesComponent                   | `ws-app-badges`                                     | ✅ used    | route target                                |
| BadgesCardComponent               | `ws-app-badges-card`                                | ✅ used    | selector in template                        |
| BadgesNotEarnedComponent          | `ws-app-badges-not-earned`                          | ✅ used    | selector in template                        |
| BadgesShareDialogComponent        | `ws-app-badges-share-dialog`                        | ✅ used    | class ref: badges-card.component.ts         |
| AchievementsComponent             | `ws-app-achievements`                               | ✅ used    | route target                                |
| CardDetailComponent               | `ws-app-card-detail`                                | ✅ used    | route target                                |
| CompetencyHomeComponent           | `ws-app-competency-home`                            | ✅ used    | route target                                |
| CoursePendingCardComponent        | `ws-app-course-pending-card`                        | ✅ used    | selector in template                        |
| DashboardComponent                | `ws-app-dashboard`                                  | ✅ used    | route target                                |
| InterestComponent                 | `ws-app-interest`                                   | ✅ used    | selector in template                        |
| BubbleChartComponent              | `ws-app-bubble-chart`                               | ✅ used    | selector in template                        |
| HistoryCardComponent              | `ws-app-history-card`                               | ✅ used    | selector in template                        |
| HistoryTileComponent              | `ws-app-history-tile`                               | ✅ used    | selector in template                        |
| LearningHistoryProgressComponent  | `ws-app-learning-history-progress`                  | ✅ used    | selector in template                        |
| LearningHistoryComponent          | `ws-app-learning-history`                           | ✅ used    | route target                                |
| LearningHomeComponent             | `ws-app-learning-home`                              | ✅ used    | route target                                |
| LearningTimeComponent             | `ws-app-learning-time`                              | ✅ used    | route target                                |
| ProgressRadialComponent           | `ws-app-progress-radial`                            | ✅ used    | selector in template                        |
| NotificationSettingsComponent     | `ws-app-notification-settings`                      | ✅ used    | selector in template                        |
| SettingsComponent                 | `ws-app-settings`                                   | ✅ used    | selector in template                        |
| BlogsCardComponent                | `ws-app-blogs-card`                                 | ✅ used    | selector in template                        |
| FilterDisplayComponent            | `ws-app-filter-display`                             | ✅ used    | selector in template                        |
| ItemTileComponent                 | `ws-app-item-tile`                                  | ✅ used    | selector in template                        |
| LearningCardComponent             | `ws-app-learning-card`                              | ✅ used    | selector in template                        |
| QandaCardComponent                | `ws-app-qanda-card`                                 | ✅ used    | selector in template                        |
| SearchInputHomeComponent          | `ws-app-search-input-home`                          | ✅ used    | selector in template                        |
| SearchInputComponent              | `ws-app-search-input`                               | ✅ used    | selector in template                        |
| HomeComponent                     | `ws-app-home`                                       | ✅ used    | route target                                |
| KnowledgeComponent                | `ws-app-knowledge`                                  | ✅ used    | route target                                |
| LearningComponent                 | `ws-app-learning`                                   | ✅ used    | route target                                |
| PeopleComponent                   | `ws-app-people`                                     | ✅ used    | route target                                |
| SearchRootComponent               | `ws-app-search-root`                                | ✅ used    | route target                                |
| SocialComponent                   | `ws-app-social`                                     | ✅ used    | route target                                |

### 5. author

| Component                        | Selector                                 | Verdict    | Evidence                                          |
| -------------------------------- | ---------------------------------------- | ---------- | ------------------------------------------------- |
| AuthNavigationComponent          | `ws-auth-root-navigation`                | ✅ used    | selector in template                              |
| AuthRootComponent                | `ws-auth-root-root`                      | ✅ used    | route target                                      |
| AuthEditorStepsComponent         | `ws-auth-editor-steps`                   | ✅ used    | selector in template                              |
| AuthExpiryDateConfirmComponent   | `ws-auth-expiry-date-confirm`            | ✅ used    | class ref: content-detail.component.ts            |
| CertificateDialogComponent       | `ws-auth-root-certificate-upload-dialog` | ✅ used    | class ref: content-card.component.ts              |
| CommentsDialogComponent          | `ws-auth-root-comments-dialog`           | ✅ used    | class ref: channel.component.ts                   |
| CommentsViewComponent            | `ws-auth-root-comments-view`             | ✅ used    | route target                                      |
| CommentsComponent                | `ws-auth-root-comments`                  | ⚠️ UNUSED? | no template/route/registry/class ref              |
| ConfirmDialogComponent           | `ws-auth-confirm-dialog`                 | ✅ used    | class ref: channel.component.ts                   |
| DeleteDialogComponent            | `ws-auth-delete-dialog`                  | ✅ used    | class ref: collection.component.ts                |
| DraftDialogComponent             | `ws-auth-draft-dialog`                   | ✅ used    | class ref: content-card-v2.component.ts           |
| ErrorParserComponent             | `ws-auth-error-parser`                   | ✅ used    | class ref: auth-expiry-date-confirm.component.ts  |
| IprDialogComponent               | `ws-auth-ipr-dialog`                     | ✅ used    | class ref: create-course.component.ts             |
| LastUpdateDisplayComponent       | `ws-auth-last-update-display`            | ✅ used    | selector in template                              |
| NotificationComponent            | `ws-auth-root-notification`              | ✅ used    | route target                                      |
| ProgressStepperComponent         | `ws-progress-stepper`                    | ✅ used    | selector in template                              |
| RestoreDialogComponent           | `ws-auth-restore-dialog`                 | ✅ used    | class ref: content-card-v2.component.ts           |
| StatusDisplayComponent           | `ws-auth-status-display`                 | ✅ used    | selector in template                              |
| StatusTrackComponent             | `ws-auth-status-track`                   | ✅ used    | selector in template                              |
| SuccessDialogComponent           | `ws-auth-success-dialog`                 | ✅ used    | class ref: certificate-upload-dialog.component.ts |
| UnpublishDialogComponent         | `ws-auth-unpublish-dialog`               | ✅ used    | class ref: content-card-v2.component.ts           |
| UserIndexConfirmComponent        | `ws-author-user-index-confirm`           | ✅ used    | class ref: module-creation.component.ts           |
| ViewerComponent                  | `ws-auth-viewer`                         | ✅ used    | selector in template                              |
| ViewerComponent                  | `ws-auth-card-viewer`                    | ✅ used    | route target                                      |
| AIHubDashboardComponent          | `ws-author-aihub-dashboard`              | ✅ used    | selector in template                              |
| QuestionGeneratorComponent       | `ws-author-question-generator`           | ✅ used    | selector in template                              |
| TranslateComponent               | `ws-author-translate`                    | ✅ used    | selector in template                              |
| CreateCourseComponent            | `ws-author-create-course`                | ✅ used    | selector in template                              |
| CreateComponent                  | `ws-auth-generic`                        | ✅ used    | route target                                      |
| EntityCardComponent              | `ws-auth-entity-card`                    | ⚠️ UNUSED? | no template/route/registry/class ref              |
| EditorComponent                  | `ws-auth-root-editor`                    | ✅ used    | route target                                      |
| ChannelComponent                 | `ws-auth-channel`                        | ✅ used    | route target                                      |
| AudioVideoComponent              | `ws-auth-audio-video`                    | ✅ used    | selector in template                              |
| BreadcrumComponent               | `ws-auth-breadcrum`                      | ✅ used    | selector in template                              |
| ChipsComponent                   | `ws-auth-chips`                          | ✅ used    | selector in template                              |
| ContentStripInputComponent       | `ws-auth-content-strip-input`            | ⚠️ UNUSED? | no template/route/registry/class ref              |
| ContentStripMultipleComponent    | `ws-auth-content-strip-multiple`         | ✅ used    | selector in template                              |
| ContentStripSingleComponent      | `ws-auth-content-strip-single`           | ✅ used    | selector in template                              |
| ContentStripV2Component          | `ws-auth-content-strip-v2`               | ✅ used    | selector in template                              |
| EmbedComponent                   | `ws-auth-embed`                          | ✅ used    | selector in template                              |
| GalleryV2Component               | `ws-auth-gallery-v2`                     | ✅ used    | selector in template                              |
| GalleryWidgetComponent           | `ws-auth-gallery-widget`                 | ✅ used    | selector in template                              |
| HtmlV2Component                  | `ws-auth-html-v2`                        | ✅ used    | selector in template                              |
| HtmlComponent                    | `ws-auth-html`                           | ✅ used    | selector in template                              |
| ImageGalleryComponent            | `ws-auth-image-gallery`                  | ⚠️ UNUSED? | no template/route/registry/class ref              |
| ImageMapComponent                | `ws-auth-image-map`                      | ✅ used    | selector in template                              |
| ImageV2Component                 | `ws-auth-image-v2`                       | ✅ used    | selector in template                              |
| InputComponent                   | `ws-auth-input`                          | ✅ used    | class ref: store.service.ts                       |
| IntranetSelectorComponent        | `ws-auth-intranet-selector`              | ✅ used    | selector in template                              |
| MediaWrapperComponent            | `ws-auth-media-wrapper`                  | ✅ used    | selector in template                              |
| SelectorResponsiveV2Component    | `ws-auth-selector-responsive-v2`         | ✅ used    | selector in template                              |
| SliderComponent                  | `ws-auth-slider`                         | ✅ used    | selector in template                              |
| PageEditorComponent              | `ws-auth-page-editor`                    | ✅ used    | selector in template                              |
| TemplateComponent                | `ws-auth-template`                       | ✅ used    | selector in template                              |
| InputV2Component                 | `ws-auth-input-v2`                       | ✅ used    | class ref: store.service.ts                       |
| PageEditorV2Component            | `ws-auth-page-editor-v2`                 | ✅ used    | selector in template                              |
| RendererV2Component              | `ws-auth-renderer-v2`                    | ✅ used    | selector in template                              |
| ViewerComponent                  | `ws-auth-viewer-v2`                      | ✅ used    | selector in template                              |
| ContentStripHolderComponent      | `ws-auth-content-strip-holder`           | ✅ used    | selector in template                              |
| ContentStripComponent            | `ws-auth-content-strip`                  | ✅ used    | selector in template                              |
| GalleryComponent                 | `ws-auth-gallery`                        | ✅ used    | selector in template                              |
| GridComponent                    | `ws-auth-grid`                           | ✅ used    | selector in template                              |
| LinearComponent                  | `ws-auth-linear`                         | ✅ used    | selector in template                              |
| RendererComponent                | `ws-auth-renderer`                       | ✅ used    | selector in template                              |
| SelectorResponsiveComponent      | `ws-auth-selector-responsive`            | ✅ used    | selector in template                              |
| TabComponent                     | `ws-auth-tab`                            | ✅ used    | selector in template                              |
| AuthCollectionMatmenuComponent   | `ws-auth-collection-matmenu`             | ✅ used    | selector in template                              |
| AuthEditorOptionsComponent       | `ws-auth-editor-options`                 | ✅ used    | selector in template                              |
| AuthTableOfContentsComponent     | `ws-auth-table-of-contents`              | ✅ used    | selector in template                              |
| AuthTableTreeLabelComponent      | `ws-auth-table-tree-label`               | ✅ used    | selector in template                              |
| AuthTocComponent                 | `ws-author-auth-toc`                     | ✅ used    | selector in template                              |
| CollectionComponent              | `ws-auth-collection`                     | ⚠️ UNUSED? | no template/route/registry/class ref              |
| ModuleCreationComponent          | `ws-author-module-creation`              | ✅ used    | selector in template                              |
| ResourceModuleComponent          | `ws-author-resource-module`              | ⚠️ UNUSED? | no template/route/registry/class ref              |
| CourseCollectionComponent        | `ws-author-course-collection`            | ✅ used    | route target                                      |
| CourseHeaderComponent            | `ws-author-course-header`                | ✅ used    | selector in template                              |
| CurateComponent                  | `ws-auth-curate`                         | ✅ used    | route target                                      |
| UrlUploadComponent               | `ws-auth-url-upload`                     | ✅ used    | selector in template                              |
| GeneralDetailsComponent          | `ws-auth-general-details`                | ✅ used    | selector in template                              |
| IapAssessmentComponent           | `ws-auth-root-iap-assessment`            | ✅ used    | route target                                      |
| SectionDialogComponent           | `ws-auth-section-dialog`                 | ✅ used    | class ref: general-details.component.ts           |
| ViewQuestionDialogComponent      | `ws-auth-view-question-dialog`           | ✅ used    | class ref: general-details.component.ts           |
| FillUpsEditorComponent           | `ws-auth-fill-ups-editor`                | ✅ used    | selector in template                              |
| MatchTheFollowingComponent       | `ws-auth-match-the-following`            | ✅ used    | selector in template                              |
| MultipleChoiceQuestionComponent  | `ws-auth-multiple-choice-question`       | ✅ used    | selector in template                              |
| QuestionEditorComponent          | `ws-auth-question-editor`                | ✅ used    | selector in template                              |
| QuizComponent                    | `ws-auth-quiz`                           | ✅ used    | selector in template                              |
| OpenPlainCkEditorComponent       | `ws-auth-open-plain-ck-editor`           | ✅ used    | class ref: fill-ups-editor.component.ts           |
| QuestionEditorSidenavComponent   | `ws-auth-question-editor-sidebar`        | ✅ used    | selector in template                              |
| FileUploadComponent              | `ws-auth-file-upload`                    | ✅ used    | selector in template                              |
| UploadComponent                  | `ws-auth-upload`                         | ✅ used    | route target                                      |
| UploadAudioComponent             | `ws-auth-upload-audio`                   | ✅ used    | class ref: web-module-editor.component.ts         |
| WebModuleEditorComponent         | `ws-auth-web-module-editor`              | ✅ used    | selector in template                              |
| AudioStripsComponent             | `ws-auth-audio-strips`                   | ✅ used    | selector in template                              |
| AceEditorComponent               | `ws-auth-ace-editor`                     | ✅ used    | selector in template                              |
| AuthEditorActionButtonsComponent | `ws-auth-editor-action-buttons`          | ✅ used    | selector in template                              |
| AuthPickerComponent              | `ws-auth-picker`                         | ✅ used    | class ref: auth-table-of-contents.component.ts    |
| CatalogSelectComponent           | `ws-auth-catalog-select`                 | ✅ used    | class ref: course-settings.component.ts           |
| ContentQualityComponent          | `ws-auth-content-quality`                | ✅ used    | selector in template                              |
| CourseSettingsComponent          | `ws-auth-course-settings`                | ✅ used    | selector in template                              |
| EditMetaComponent                | `ws-auth-edit-meta`                      | ✅ used    | selector in template                              |
| PlainCKEditorComponent           | `ws-auth-plain-ckeditor`                 | ✅ used    | selector in template                              |
| ReviewerChecklist                | `ws-reviewer-checklist-view`             | ⚠️ UNUSED? | no template/route/registry/class ref              |
| QuillComponent                   | `ws-auth-root-ws-quill`                  | ⚠️ UNUSED? | no template/route/registry/class ref              |
| ContentDetailHomeComponent       | `ws-auth-content-detail-home`            | ✅ used    | route target                                      |
| ContentDetailComponent           | `ws-auth-content-detail`                 | ✅ used    | route target                                      |
| ContentDiscussionComponent       | `ws-auth-content-discussion`             | ✅ used    | selector in template                              |
| ContentInsightsComponent         | `ws-auth-content-insights`               | ✅ used    | route target                                      |
| DashboardComponent               | `ws-auth-root-dashboard`                 | ✅ used    | selector in template                              |
| AuthHomeComponent                | `ws-auth-root-home`                      | ✅ used    | route target                                      |
| AllContentComponent              | `ws-auth-all-content`                    | ✅ used    | route target                                      |
| MandatoryContentComponent        | `ws-auth-mandatory-content`              | ✅ used    | selector in template                              |
| MyContentComponent               | `ws-auth-my-content`                     | ✅ used    | route target                                      |
| ContentCardV2Component           | `ws-auth-content-card-v2`                | ✅ used    | selector in template                              |
| ContentCardComponent             | `ws-auth-root-content-card`              | ✅ used    | selector in template                              |
| MyContentComponent               | `ws-auth-my-content`                     | ✅ used    | route target                                      |

### 6. viewer

| Component                    | Selector                               | Verdict | Evidence                                    |
| ---------------------------- | -------------------------------------- | ------- | ------------------------------------------- |
| ReviewDialogComponent        | `ws-auth-root-review-dialog`           | ✅ used | class ref: viewer-top-bar.component.ts      |
| ViewerTocComponent           | `viewer-viewer-toc`                    | ✅ used | selector in template                        |
| ViewerTopBarComponent        | `viewer-viewer-top-bar`                | ✅ used | selector in template                        |
| AudioNativeComponent         | `viewer-plugin-audio-native`           | ✅ used | selector in template                        |
| CertificationComponent       | `viewer-plugin-certification`          | ✅ used | selector in template                        |
| ClassDiagramComponent        | `viewer-plugin-class-diagram`          | ✅ used | selector in template                        |
| ClassDiagramResultComponent  | `viewer-class-diagram-result`          | ✅ used | selector in template                        |
| HandsOnDialogComponent       | `viewer-hands-on-dialog`               | ✅ used | class ref: hands-on.component.ts            |
| HandsOnComponent             | `viewer-plugin-hands-on`               | ✅ used | selector in template                        |
| HtmlPickerComponent          | `viewer-plugin-html-picker`            | ✅ used | selector in template                        |
| HtmlComponent                | `viewer-plugin-html`                   | ✅ used | selector in template                        |
| IapComponent                 | `viewer-plugin-iap`                    | ✅ used | selector in template                        |
| OverviewComponent            | `viewer-overview`                      | ✅ used | selector in template                        |
| QuestionComponent            | `viewer-question`                      | ✅ used | selector in template                        |
| SubmitQuizDialogComponent    | `viewer-submit-quiz-dialog`            | ✅ used | class ref: quiz.component.ts                |
| QuizComponent                | `viewer-plugin-quiz`                   | ✅ used | selector in template                        |
| DbmsBestPracticeComponent    | `viewer-dbms-best-practice`            | ✅ used | selector in template                        |
| DbmsConceptCreateComponent   | `viewer-dbms-concept-create`           | ✅ used | selector in template                        |
| DbmsConceptDropdownComponent | `viewer-dbms-concept-dropdown`         | ✅ used | selector in template                        |
| DbmsExerciseComponent        | `viewer-dbms-exercise`                 | ✅ used | selector in template                        |
| DbmsPlaygroundComponent      | `viewer-dbms-playground`               | ✅ used | selector in template                        |
| ExecutionResultComponent     | `viewer-execution-result`              | ✅ used | selector in template                        |
| SubmissionDialogComponent    | `viewer-submission-dialog`             | ✅ used | class ref: dbms-exercise.component.ts       |
| RdbmsHandsOnComponent        | `viewer-plugin-rdbms-hands-on`         | ✅ used | selector in template                        |
| ViewSubmissionComponent      | `viewer-view-submission`               | ✅ used | class ref: resource-collection.component.ts |
| ResourceCollectionComponent  | `viewer-plugin-resource-collection`    | ✅ used | selector in template                        |
| WebModuleComponent           | `viewer-plugin-web-module`             | ✅ used | selector in template                        |
| AudioNativeComponent         | `viewer-audio-native-container`        | ✅ used | selector in template                        |
| AudioComponent               | `viewer-audio-container`               | ✅ used | selector in template                        |
| CertificationComponent       | `viewer-certification-container`       | ✅ used | selector in template                        |
| ClassDiagramComponent        | `viewer-class-diagram-container`       | ✅ used | selector in template                        |
| HandsOnComponent             | `viewer-hands-on-container`            | ✅ used | selector in template                        |
| HtmlPickerComponent          | `viewer-html-picker-container`         | ✅ used | selector in template                        |
| HtmlComponent                | `viewer-html-container`                | ✅ used | selector in template                        |
| IapComponent                 | `viewer-iap-container`                 | ✅ used | selector in template                        |
| PdfComponent                 | `viewer-pdf-container`                 | ✅ used | selector in template                        |
| QuizComponent                | `viewer-quiz-container`                | ✅ used | selector in template                        |
| RdbmsHandsOnComponent        | `viewer-rdbms-hands-on-container`      | ✅ used | selector in template                        |
| ResourceCollectionComponent  | `viewer-resource-collection-container` | ✅ used | selector in template                        |
| VideoComponent               | `viewer-video-container`               | ✅ used | selector in template                        |
| WebModuleComponent           | `viewer-web-module-container`          | ✅ used | selector in template                        |
| YoutubeComponent             | `viewer-youtube-container`             | ✅ used | selector in template                        |
| AudioNativeComponent         | `viewer-audio-native`                  | ✅ used | route target                                |
| AudioComponent               | `viewer-audio`                         | ✅ used | route target                                |
| CertificationComponent       | `viewer-certification`                 | ✅ used | route target                                |
| ChannelComponent             | `viewer-channel`                       | ✅ used | route target                                |
| ClassDiagramComponent        | `viewer-class-diagram`                 | ✅ used | route target                                |
| DndQuizComponent             | `viewer-dnd-quiz`                      | ✅ used | route target                                |
| HandsOnComponent             | `viewer-hands-on`                      | ✅ used | route target                                |
| HtmlPickerComponent          | `viewer-html-picker`                   | ✅ used | route target                                |
| HtmlComponent                | `viewer-html`                          | ✅ used | route target                                |
| IapComponent                 | `viewer-iap`                           | ✅ used | route target                                |
| InteractiveExerciseComponent | `viewer-interactive-exercise`          | ✅ used | route target                                |
| PdfComponent                 | `viewer-pdf`                           | ✅ used | route target                                |
| QuizComponent                | `viewer-quiz`                          | ✅ used | route target                                |
| RdbmsHandsOnComponent        | `viewer-rdbms-hands-on`                | ✅ used | route target                                |
| ResourceCollectionComponent  | `viewer-resource-collection`           | ✅ used | route target                                |
| VideoComponent               | `viewer-video`                         | ✅ used | route target                                |
| WebModuleComponent           | `viewer-web-module`                    | ✅ used | route target                                |
| YoutubeComponent             | `viewer-youtube`                       | ✅ used | route target                                |
| ViewerComponent              | `viewer-container`                     | ✅ used | route target                                |

### 7. shell (src/app)

| Component                      | Selector                      | Verdict | Evidence                          |
| ------------------------------ | ----------------------------- | ------- | --------------------------------- |
| CompetencyPopupComponent       | `ws-competency-popup`         | ✅ used | class ref: edit-meta.component.ts |
| AppFooterComponent             | `ws-app-footer`               | ✅ used | selector in template              |
| AppNavBarComponent             | `ws-app-nav-bar`              | ✅ used | selector in template              |
| AppPublicNavBarComponent       | `ws-app-public-nav-bar`       | ✅ used | selector in template              |
| InvalidUserComponent           | `ws-invalid-user`             | ✅ used | route target                      |
| LoginRootComponent             | `ws-login-root`               | ✅ used | route target                      |
| LoginComponent                 | `ws-login`                    | ✅ used | class ref: login-root.service.ts  |
| RootComponent                  | `ws-root`                     | ✅ used | selector in template              |
| TncRendererComponent           | `ws-tnc-renderer`             | ✅ used | selector in template              |
| ImageUploadIntroPopupComponent | `ws-image-upload-intro-popup` | ✅ used | class ref: quiz.component.ts      |
| FeaturesComponent              | `ws-app-root-features`        | ✅ used | route target                      |
| MobileAppHomeComponent         | `ws-app-mobile-app-home`      | ✅ used | route target                      |
| PublicAboutComponent           | `ws-public-about`             | ✅ used | route target                      |
| PublicFaqComponent             | `ws-public-faq`               | ✅ used | route target                      |
| SignupAutoComponent            | `ws-signup-auto`              | ✅ used | route target                      |
| SignupComponent                | `ws-signup`                   | ✅ used | route target                      |
| TncComponent                   | `ws-tnc`                      | ✅ used | route target                      |
