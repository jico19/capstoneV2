# serializers.py
from rest_framework import serializers
from .models import Barangay, HogSurvey


# ─────────────────────────────────────────
# BARANGAY
# ─────────────────────────────────────────

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


# ─────────────────────────────────────────
# HOG SURVEY
# ─────────────────────────────────────────


class HogSurveyListDetailSerializer(serializers.ModelSerializer):
    """Used in: GET /hog-surveys/<id>/"""
    barangay_name = serializers.CharField(source="barangay.name", read_only=True)

    class Meta:
        model = HogSurvey
        fields = [
            "id", "barangay_name",
            "inahin", "barako", "fattener", "grower", "bulaw", "starter",
            "total_pigs", "survey_date",
        ]


class HogSurveyWriteSerializer(serializers.ModelSerializer):
    """Used in: POST /hog-surveys/  |  PATCH /hog-surveys/<id>/"""

    class Meta:
        model = HogSurvey
        fields = [
            "barangay",
            "inahin", "barako", "fattener", "grower", "bulaw", "starter",
            "total_pigs", "survey_date",
        ]