from django.db import models



class Barangay(models.Model):
    name = models.CharField(max_length=100, unique=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, default=0)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, default=0)
    geojson = models.JSONField(default=dict,null=True, blank=True)
    

    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name}"

class HogSurvey(models.Model):
    barangay = models.ForeignKey(Barangay, on_delete=models.CASCADE)

    inahin = models.PositiveIntegerField(
        default=0,
    )
    barako = models.PositiveIntegerField(
        default=0,
    )
    fattener = models.PositiveIntegerField(
        default=0,
    )
    grower = models.PositiveIntegerField(
        default=0,
    )
    bulaw = models.PositiveIntegerField(
        default=0,
    )
    
    starter = models.PositiveIntegerField(
        default=0,
    )
    
    total_pigs = models.PositiveIntegerField(
        default=0,
    )
    
    survey_date = models.DateField(auto_created=True, null=True, blank=True)
    uploaded_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-survey_date"]


    def __str__(self):
        return f"{self.barangay.name} - {self.total_pigs}"