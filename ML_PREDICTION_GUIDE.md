# ML Pig Density Prediction Guide (Heatmap Optimized)

This document outlines the implementation plan for predicting pig density across all Sariaya barangays for a target date, designed to integrate seamlessly with the Leaflet heatmap.

## 1. Architecture Overview
The system uses a **Random Forest Regressor** to generate a "Predictive Snapshot" of the entire municipality for a future date.

### Features (Inputs)
- **Geospatial:** Latitude and Longitude for each barangay.
- **Temporal:** Target Month (extracted from date), Target Year, Season (Wet/Dry based on month).

### Target (Output)
An array of objects representing every barangay, formatted identically to the historical `survey_data` endpoint.

## 2. Technical Stack
- **Library:** `scikit-learn` (Random Forest Regressor).
- **Data Handling:** `pandas`.
- **Serialization:** `joblib`.

## 3. Implementation Steps

### Phase 1: Preparation
1. Add `pandas`, `scikit-learn`, and `joblib` to `backend/requirements/requirements.txt`.
2. Ensure `backend/apps/ml_engine/models/` folder exists.

### Phase 2: The ML Service (`services.py`)
Implement `MLService` to:
- Merge historical data with coordinates.
- Train the model and save to `apps/ml_engine/models/pig_model.joblib`.
- **New Logic:** Implement `predict_all(target_date)` which loops through all registered barangays and generates a prediction for each one.

### Phase 3: The API (`views.py`)
Expose a **GET** endpoint: `GET /api/ml/predict-density/?date=2026-08-15`

**Expected Response Payload (Heatmap Format):**
```json
[
  {
    "barangay": "Antipolo",
    "latitude": 13.965000,
    "longitude": 121.525000,
    "total_pigs": 145,
    "density_level": "Medium"
  },
  {
    "barangay": "Balubal",
    "latitude": 13.972000,
    "longitude": 121.518000,
    "total_pigs": 520,
    "density_level": "Very High"
  }
]
```

## 4. Density Classification Rules
The prediction must follow the same project standards as `MapsViewSets`:
- **None:** 0 pigs
- **Low:** < 50 pigs
- **Medium:** < 200 pigs
- **High:** < 500 pigs
- **Very High:** 500+ pigs

## 5. Training Command
`python manage.py train_pig_model`
This command should be run whenever new historical data is imported to keep the predictions accurate.
