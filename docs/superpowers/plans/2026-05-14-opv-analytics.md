# OPV Tactical Snapshot Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "Tactical Snapshot" analytics page for OPV staff to monitor livestock movement and validation performance over the last 30 days.

**Architecture:** 
- Backend: A new `APIView` providing aggregated metrics and chart data using Django ORM annotations.
- Frontend: A dedicated analytics page using Recharts components to visualize volume by barangay and destination trends.

**Tech Stack:** Django, DRF, React, Recharts, TanStack Query.

---

### Task 1: Backend Analytics Endpoint

**Files:**
- Create: `backend/apps/dashboard/tests.py`
- Modify: `backend/apps/dashboard/views.py`
- Modify: `backend/apps/dashboard/urls.py`

- [ ] **Step 1: Write failing test for OPV Analytics**

```python
import pytest
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta
from apps.permits.models import PermitApplication, TransportOrigin, OPVValidation
from apps.api.models import User
from apps.maps.models import Barangay

@pytest.mark.django_db
class TestOPVAnalytics:
    def test_opv_analytics_returns_correct_data(self):
        client = APIClient()
        user = User.objects.create_user(username='opv_user', role='Opv', password='password')
        client.force_authenticate(user=user)
        
        # Setup data: 1 validated application with 10 pigs from "Barangay A" to "Manila"
        farmer = User.objects.create_user(username='farmer', role='Farmer')
        b1 = Barangay.objects.create(name='Barangay A')
        app = PermitApplication.objects.create(
            farmer=farmer, 
            status=PermitApplication.Status.OPV_VALIDATED,
            destination='Manila',
            transport_date=timezone.now().date()
        )
        TransportOrigin.objects.create(application=app, barangay=b1, number_of_pigs=10)
        OPVValidation.objects.create(application=app, opv_staff=user, status=OPVValidation.Status.VALIDATED)

        response = client.get('/api/dashboard/opv-analytics/')
        assert response.status_code == 200
        data = response.data
        assert data['kpis']['total_volume'] == 10
        assert data['charts']['top_barangays'][0]['name'] == 'Barangay A'
        assert data['charts']['top_barangays'][0]['count'] == 10
        assert data['charts']['top_destinations'][0]['name'] == 'Manila'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/apps/dashboard/tests.py -v`
Expected: FAIL (404 or View not found)

- [ ] **Step 3: Implement OPVAnalyticsView**

```python
# backend/apps/dashboard/views.py
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from apps.permits import models as permits

class OPVAnalyticsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Opv':
            return Response({"error": "Unauthorized"}, status=403)

        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Filter for applications that reached OPV in last 30 days
        apps_last_30 = permits.PermitApplication.objects.filter(
            created_at__gte=thirty_days_ago
        )
        
        validated_apps = apps_last_30.filter(
            status__in=[
                permits.PermitApplication.Status.OPV_VALIDATED,
                permits.PermitApplication.Status.PERMIT_ISSUED,
                permits.PermitApplication.Status.PAYMENT_PENDING,
                permits.PermitApplication.Status.RELEASED
            ]
        )

        # KPIs
        total_volume = validated_apps.aggregate(total=Sum('origins__number_of_pigs'))['total'] or 0
        
        opv_processed = permits.OPVValidation.objects.filter(validated_at__gte=thirty_days_ago)
        total_processed = opv_processed.count()
        total_validated = opv_processed.filter(status=permits.OPVValidation.Status.VALIDATED).count()
        pass_rate = (total_validated / total_processed * 100) if total_processed > 0 else 0
        
        active_queue = apps_last_30.filter(status=permits.PermitApplication.Status.FORWARDED_TO_OPV).count()

        # Charts
        top_barangays = (
            validated_apps.values('origins__barangay__name')
            .annotate(count=Sum('origins__number_of_pigs'))
            .order_by('-count')[:5]
        )
        
        top_destinations = (
            validated_apps.values('destination')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        return Response({
            "kpis": {
                "total_volume": total_volume,
                "pass_rate": round(pass_rate, 1),
                "active_queue": active_queue
            },
            "charts": {
                "top_barangays": [{"name": item['origins__barangay__name'], "count": item['count']} for item in top_barangays],
                "top_destinations": [{"name": item['destination'], "count": item['count']} for item in top_destinations]
            }
        })
```

- [ ] **Step 4: Register URL**

```python
# backend/apps/dashboard/urls.py
path('opv-analytics/', views.OPVAnalyticsView.as_view()),
```

- [ ] **Step 5: Run tests and verify PASS**

Run: `pytest backend/apps/dashboard/tests.py -v`

- [ ] **Step 6: Commit**

```bash
git add backend/apps/dashboard/views.py backend/apps/dashboard/urls.py backend/apps/dashboard/tests.py
git commit -m "feat(dashboard): add OPV tactical analytics endpoint"
```

---

### Task 2: Frontend Data Hook

**Files:**
- Modify: `frontend/src/hooks/useDashboard.jsx`

- [ ] **Step 1: Add useGetOPVAnalytics hook**

```javascript
// frontend/src/hooks/useDashboard.jsx
export const useGetOPVAnalytics = () => {
    return useQuery({
        queryKey: ['opv_analytics'],
        queryFn: async () => {
            const res = await api.get('/dashboard/opv-analytics/')
            return res.data
        }
    })
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useDashboard.jsx
git commit -m "feat(frontend): add useGetOPVAnalytics hook"
```

---

### Task 3: OPV Analytics Page Implementation

**Files:**
- Modify: `frontend/src/pages/opv/Analytics/OpvAnalytics.jsx`

- [ ] **Step 1: Implement the UI**

```jsx
import { useGetOPVAnalytics } from "/src/hooks/useDashboard";
import KPICard from "/src/components/KPICard";
import BarChartComponent from "/src/components/charts/BarChart";
import { Truck, Percent, ClipboardList } from "lucide-react";

const OpvAnalytics = () => {
    const { data: metrics, isLoading, isError } = useGetOPVAnalytics();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="p-8 text-center text-red-600 font-black uppercase tracking-widest">
                Failed to load analytics data.
            </div>
        );
    }

    const { kpis, charts } = metrics;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 bg-white min-h-screen rounded-none">
            {/* Header */}
            <div className="border-b border-stone-100 pb-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Tactical Insights</p>
                <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter italic">OPV.Analytics</h1>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Total Volume"
                    value={kpis.total_volume}
                    subtitle="Heads transported (30d)"
                    icon={Truck}
                    colorClass="bg-green-50 text-green-700"
                />
                <KPICard
                    title="Pass Rate"
                    value={kpis.pass_rate}
                    subtitle="Validation success rate"
                    icon={Percent}
                    colorClass="bg-blue-50 text-blue-700"
                    isPercent={true}
                />
                <KPICard
                    title="Active Queue"
                    value={kpis.active_queue}
                    subtitle="Awaiting validation"
                    icon={ClipboardList}
                    colorClass="bg-amber-50 text-amber-700"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-stone-50 border border-stone-200 p-8 rounded-none">
                    <h3 className="text-sm font-black uppercase tracking-widest text-stone-800 mb-6 border-l-4 border-green-700 pl-4">
                        Top Origin Areas
                    </h3>
                    <div className="bg-white p-6 border border-stone-100">
                        <BarChartComponent
                            data={charts.top_barangays}
                            xKey="name"
                            yKey="count"
                            height={300}
                            barColor="#15803d"
                        />
                    </div>
                </div>

                <div className="bg-stone-50 border border-stone-200 p-8 rounded-none">
                    <h3 className="text-sm font-black uppercase tracking-widest text-stone-800 mb-6 border-l-4 border-blue-700 pl-4">
                        Destination Hotspots
                    </h3>
                    <div className="bg-white p-6 border border-stone-100">
                        <BarChartComponent
                            data={charts.top_destinations}
                            xKey="name"
                            yKey="count"
                            height={300}
                            barColor="#1d4ed8"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OpvAnalytics;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/opv/Analytics/OpvAnalytics.jsx
git commit -m "feat(frontend): implement OPV Tactical Analytics page"
```
