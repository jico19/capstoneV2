from django.http import JsonResponse


# this will keep the render awake..
def health_check(request):
    return JsonResponse({"message": "ok!!"})
