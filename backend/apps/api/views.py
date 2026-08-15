from django.http import JsonResponse
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

class LoginRateThrottle(SimpleRateThrottle):
    rate = '5/min'
    scope = 'login'

    def get_cache_key(self, request, view):
        username = request.data.get('username', '').strip()
        ip = self.get_ident(request)
        
        if username:
            return self.cache_format % {
                'scope': self.scope,
                'ident': f"{ip}_{username}"
            }
        return self.cache_format % {
            'scope': self.scope,
            'ident': ip
        }

class CustomTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]


# this will keep the render awake..
def health_check(request):
    return JsonResponse({"message": "ok!!"})
