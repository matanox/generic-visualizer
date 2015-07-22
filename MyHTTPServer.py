import BaseHTTPServer
import SimpleHTTPServer
server_address = ("", 8000)

class MyRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if self.path.startswith('/cae-data'):
          return SimpleHTTPServer.SimpleHTTPRequestHandler.translate_path(self, path)
        else:
          return '../../visualizer/' + path

httpd = BaseHTTPServer.HTTPServer(server_address, MyRequestHandler)
httpd.serve_forever()