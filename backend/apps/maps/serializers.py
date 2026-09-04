from rest_framework import serializers
from .models import Barangay, HogSurvey

class BarangayListDetailSerializer(serializers.ModelSerializer):
    """Used in: GET /barangays/"""

    class Meta:
        model = Barangay
        fields = ["id", "name", "latitude", "longitude", "geojson"]


class BarangayWriteSerializer(serializers.ModelSerializer):
    """Used in: POST /barangays/  |  PATCH /barangays/<id>/"""

    class Meta:
        model = Barangay
        fields = ["name", "latitude", "longitude", "geojson"]


class HogSurveyListDetailSerializer(serializers.ModelSerializer):
    """Used in: GET /hog-surveys/<id>/"""
    barangay_name = serializers.CharField(source="barangay.name", read_only=True)

    class Meta:
        model = HogSurvey
        fields = [
            "id", "barangay_name",
            "farmer_name", "contact_number",
            "inahin", "barako", "fattener", "grower", "bulaw", "starter",
            "total_pigs", "survey_date",
        ]


class HogSurveyWriteSerializer(serializers.ModelSerializer):
    """Used in: POST /hog-surveys/  |  PATCH /hog-surveys/<id>/"""
    farmer_name = serializers.CharField(required=True, allow_blank=False, max_length=200)

    class Meta:
        model = HogSurvey
        fields = [
            "id",
            "barangay",
            "farmer_name", "contact_number",
            "inahin", "barako", "fattener", "grower", "bulaw", "starter",
            "total_pigs", "survey_date",
        ]

    def validate_farmer_name(self, value):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Farmer / Hog Owner name is required.")
        return cleaned

    def validate(self, attrs):
        inahin = attrs.get("inahin", self.instance.inahin if self.instance else 0)
        barako = attrs.get("barako", self.instance.barako if self.instance else 0)
        fattener = attrs.get("fattener", self.instance.fattener if self.instance else 0)
        grower = attrs.get("grower", self.instance.grower if self.instance else 0)
        bulaw = attrs.get("bulaw", self.instance.bulaw if self.instance else 0)
        starter = attrs.get("starter", self.instance.starter if self.instance else 0)

        total = inahin + barako + fattener + grower + bulaw + starter
        if total <= 0:
            raise serializers.ValidationError({"total_pigs": "A survey entry must have at least 1 pig across all categories."})
        attrs["total_pigs"] = total
        return attrs