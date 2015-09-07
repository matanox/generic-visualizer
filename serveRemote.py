# Run this from a directory of a project where the extractor has already run -
# typically useful for compiler plugin development

import BaseHTTPServer
import SimpleHTTPServer
server_address = ("", 8000)

class MyRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if self.path.startswith('/canve-data/root/'):
          return SimpleHTTPServer.SimpleHTTPRequestHandler.translate_path(self, path)
        else:
          return '../../visualizer/' + path

httpd = BaseHTTPServer.HTTPServer(server_address, MyRequestHandler)
httpd.serve_forever()