# Implementation Plan: Hog Survey Current Month Default & Farmer Source Detail View

## Goal Description
Enhance the **Hog Survey** module so that:
1. The survey records table defaults to showing the **latest data for the current month** (based on today's date).
2. Clicking any farmer name redirects the surveyor to a dedicated **Farmer Pig Source / Survey Detail View** where they can inspect that farmer's registered inventory history and directly **add a new survey record** for that farmer.

---

## Proposed Changes

### 1. Backend (`backend/apps/maps/viewsets.py` & `serializers.py`)
- **Default Current Month Filter on `HogSurveyViewSet`**:
  - Add optional `current_month=true` query param or default `date_from`/`date_to` to the start and end of the current month when no date parameters are explicitly provided.
- **Farmer Specific History Endpoint**:
  - Add a detail action `POST /api/hog-survey/add_for_farmer/` or extend `create` to easily associate new surveys with registered farmer names and contacts.

### 2. Frontend Navigation & Pages (`frontend/src/routes/` & `frontend/src/pages/barangay/HogSurvey/`)

#### Default Current Month Filtering (`HogSurveyPage.jsx` & `SurveyListTable.jsx`)
- Set default `filterDateFrom` and `filterDateTo` state on load to the 1st day of the current month and the last day of the current month (or current date).
- Add a Quick Filter toggle/button: **"Current Month"** vs **"All Time"**.

#### Farmer Pig Source Detail View / Page ([NEW] `FarmerDetailView.jsx` or Sub-route `/barangay/hog-survey/farmer/:farmerName`)
- Create a dedicated view component when a farmer name is clicked.
- **Header**: Displays Farmer Name, Contact Number, Barangay, Total Current Pigs, and Active/Inactive status.
- **Action**: **"+ Add Survey for [Farmer Name]"** button which opens a pre-filled survey form specifically for this farmer.
- **History Table**: Shows all historical hog survey entries for this specific farmer ordered by survey date.

---

## Verification Plan

### Automated Tests
- Run `python -m pytest apps/maps/tests/test_survey_data.py`.

### Manual Verification
1. Open **Hog Survey Page** → verify table defaults to current month records.
2. Click a farmer in the Roster or Table (e.g. "Antonino M. Razon").
3. Verify redirection to the Farmer Detail / History page showing their registered pig source details.
4. Click **Add Survey Record** → verify farmer details are pre-filled and saving adds to their hog inventory history.
