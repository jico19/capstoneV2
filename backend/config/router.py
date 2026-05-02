from rest_framework.routers import DefaultRouter
from apps.permits import viewset as PermitViewSets
from apps.maps import viewsets as MapsViewSets
from apps.api import viewsets as UserViewSets
from apps.payment import viewsets as PaymentViewSets
from apps.inspector import viewsets as InspectorViewSets

routers = DefaultRouter()

# permit
routers.register(r'application', PermitViewSets.PermitApplicationViewSets)
routers.register(r'document', PermitViewSets.SubmittedDocumentViewSets)
routers.register(r'opv', PermitViewSets.OPVValidationViewSets)
routers.register(r'issued-permit', PermitViewSets.IssuedPermitViewSets)
routers.register(r'ocr-validation', PermitViewSets.OCRValidationResultViewSets)

# map
routers.register(r'barangay', MapsViewSets.BarangayViewSets)
routers.register(r'hog-survey', MapsViewSets.HogSurveyViewSets)


# user
routers.register(r'user', UserViewSets.UserViewSets)
routers.register(r'notification', UserViewSets.NotificationViewSets)

# payment
routers.register(r'payment', PaymentViewSets.PaymentViewSets)

# Inspector
routers.register(r'inspector', InspectorViewSets.InspectorLogViewSets)