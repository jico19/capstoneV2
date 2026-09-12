class AllowFramesMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if (
            request.path.startswith('/media/')
            or '/document/' in request.path
            or '/aic' in request.path
            or request.path.endswith('.pdf')
        ):
            response.xframe_options_exempt = True
            if 'X-Frame-Options' in response.headers:
                del response.headers['X-Frame-Options']
            if 'x-frame-options' in response.headers:
                del response.headers['x-frame-options']
        return response
