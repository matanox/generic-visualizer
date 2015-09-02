# Run this when working on the front-end. It will use static data included
# with the front-end project.

import BaseHTTPServer
import SimpleHTTPServer
server_address = ("", 8000)

class MyRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def translate_path(self, path):
      return SimpleHTTPServer.SimpleHTTPRequestHandler.translate_path(self, path)

httpd = BaseHTTPServer.HTTPServer(server_address, MyRequestHandler)
httpd.serve_forever()