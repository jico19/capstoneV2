# Spec: OPV Tactical Snapshot Analytics

**Date:** 2026-05-14
**Topic:** OPV Operational Analytics
**Status:** DRAFT

## 1. Purpose
Provide OPV (Provincial Veterinary Office) staff with a "Tactical Snapshot" of current operations. This includes monitoring livestock movement volume, geographic origins, destination hotspots, and validation performance over a rolling 30-day period.

## 2. Backend Implementation

### 2.1 View: `OPVAnalyticsView`
- **Location**: `backend/apps/dashboard/views.py`
- **URL**: `/api/dashboard/opv-analytics/`
- **Logic**:
    - **Time Window**: Last 30 days based on `PermitApplication.created_at` or `OPVValidation.validated_at`.
    - **KPIs**:
        - `total_volume`: Sum of `number_of_pigs` from `TransportOrigin` for applications where status is `OPV_VALIDATED` or further.
        - `pass_rate`: Percentage of `OPV_VALIDATED` status vs total processed by OPV (`VALIDATED` + `REJECTED`) within the window.
        - `active_queue`: Count of applications with status `FORWARDED_TO_OPV`.
    - **Charts**:
        - `top_barangays`: Aggregated sum of `number_of_pigs` per `Barangay`, top 5.
        - `top_destinations`: Aggregated count of `PermitApplication` per `destination` string, top 5.

## 3. Frontend Implementation

### 3.1 Data Fetching
- **Hook**: Add `useGetOPVAnalytics` to `frontend/src/hooks/useDashboard.jsx`.
- **Query Key**: `['opv_analytics']`.

### 3.2 UI: `OpvAnalytics.jsx`
- **Path**: `frontend/src/pages/opv/Analytics/OpvAnalytics.jsx`.
- **Components**:
    - `KPICard`: Display Total Volume, Pass Rate, and Active Queue.
    - `BarChartComponent`: 
        - Chart 1: "Top Breeding/Origin Areas" (Barangay Volume).
        - Chart 2: "High-Traffic Destinations" (Destination Count).
- **Design Rules**:
    - `rounded-none` on all containers.
    - Primary color: `green-700`.
    - Background: `bg-white`.
    - Typography: All caps labels, bold headings, stone-scale text.

## 4. Verification Plan

### 4.1 Automated Tests
- **Backend**: Test `OPVAnalyticsView` returns correct aggregations for a mix of validated and rejected applications.
- **Frontend**: Verify `OpvAnalytics` renders charts when data is provided and shows appropriate loading/empty states.

### 4.2 Manual Check
- Verify volume sums match the database for a known test set.
- Ensure charts are responsive and labels are readable.
