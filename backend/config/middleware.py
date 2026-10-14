class AllowFramesMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if (
            request.path.startswith('/media/')
            or request.path.endswith('.pdf')
        ):
            response.xframe_options_exempt = True
            if 'X-Frame-Options' in response.headers:
                del response.headers['X-Frame-Options']
            if 'x-frame-options' in response.headers:
                del response.headers['x-frame-options']
            # Allow framing exclusively from self and authorized frontends
            response.headers['Content-Security-Policy'] = (
                "frame-ancestors 'self' http://localhost:5173 http://127.0.0.1:5173 "
                "https://farmpass-ph.me https://farm-pass-smoky.vercel.app"
            )
        return response
