from django.contrib import admin
from . import models

admin.site.register(models.PermitApplication)
admin.site.register(models.SubmittedDocument)
admin.site.register(models.OCRValidationResult)
admin.site.register(models.OPVValidation)
admin.site.register(models.IssuedPermit)
