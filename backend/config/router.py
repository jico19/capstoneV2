from rest_framework.routers import DefaultRouter
from apps.permits import views as PermitViewSets
from apps.maps import viewsets as MapsViewSets
from apps.api import viewsets as UserViewSet
from apps.payment import viewsets as PaymentViewSets
from apps.inspector import viewsets as InspectorViewSets

router = DefaultRouter()

# permit
router.register(r'application', PermitViewSets.PermitApplicationViewSet)
router.register(r'document', PermitViewSets.SubmittedDocumentViewSet)
router.register(r'opv', PermitViewSets.OPVValidationViewSet)
router.register(r'issued-permit', PermitViewSets.IssuedPermitViewSet)
router.register(r'ocr-validation', PermitViewSets.OCRValidationResultViewSet)
router.register(r'report', PermitViewSets.ReportViewSet, basename='report')
router.register(r'municipal-config', PermitViewSets.MunicipalConfigViewSet, basename='municipal-config')

# map
router.register(r'barangay', MapsViewSets.BarangayViewSet)
router.register(r'hog-survey', MapsViewSets.HogSurveyViewSet)


# user
router.register(r'user', UserViewSet.UserViewSet)
router.register(r'notification', UserViewSet.NotificationViewSet)
router.register(r'audit-trail', UserViewSet.AuditTrailViewSet)

# payment
router.register(r'payment', PaymentViewSets.PaymentViewSet, basename='payment')

# Inspector
router.register(r'inspector', InspectorViewSets.InspectorLogViewSet)