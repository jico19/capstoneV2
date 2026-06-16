# Future AI/ML Feature Roadmap — FarmPass

This document outlines high-impact AI and Machine Learning features proposed for future integration into the FarmPass system.

---

## 🟢 1. Municipal Supply-Demand Forecasting
**Target Goal:** Economic Stability & Market Control

### Concept
Analyze historical permit transit data and current hog survey counts to predict municipal-level surplus or shortages of livestock.

### Technical Details
- **Logic:** Time-Series Analysis (e.g., Meta's `Prophet` or `Statsmodels`).
- **Data Sources:** `permits.Permit` (historical count/dates), `maps.HogSurvey` (current inventory).
- **Implementation:** Django-based background service for monthly data aggregation and model training.

### Considerations
- **Watch for:** Informal/untracked market movements ("Dark Market") that skew predictions.
- **Requirement:** At least 6-12 months of historical data for seasonality detection.

---

## 🟡 2. Pig Density & Risk Prediction
**Target Goal:** Biosecurity & Disease Prevention (e.g., ASF Mitigation)

### Concept
Create a live geospatial heatmap of Sariaya showing hog concentrations and cross-referencing them with active transport routes to identify high-risk disease spread zones.

### Technical Details
- **Logic:** Geospatial AI / Spatial Regression (e.g., Kernel Density Estimation via `GeoPandas`).
- **Data Sources:** `maps.HogSurvey` (farm locations), `permits.Permit` (transit routes), Zoning/Land-use maps.
- **Visualization:** Interactive Leaflet/MapLibre heatmaps in the `maps` dashboard.

### Considerations
- **Watch for:** Data lag between physical surveys and system updates.
- **Requirement:** Accurate GPS/Coordinate data for farms and transport checkpoints.

---

## 🔵 3. Visual Weight Estimator (Computer Vision)
**Target Goal:** Farmer Support & Fairness

### Concept
Allow farmers to estimate hog weight using a mobile camera photo and a reference object, ensuring accurate permit declarations and fair market pricing.

### Technical Details
- **Logic:** CNN-based image regression.
- **Implementation:** Mobile-optimized inference (TensorFlow Lite or similar).

---

## 🔵 4. Voice-to-Form "Agri-Bot" (NLP)
**Target Goal:** Accessibility & Ease of Use

### Concept
Hands-free permit application via voice commands, allowing farmers to apply for permits while working in the field.

### Technical Details
- **Logic:** Natural Language Processing (Named Entity Recognition).
- **Function:** Extract Origin, Destination, Count, and Time from spoken sentences.
