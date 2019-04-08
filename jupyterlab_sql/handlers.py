import json
from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler
from tornado.escape import json_decode
import tornado.ioloop

from .query_executor import QueryExecutor


class SqlQueryHandler(IPythonHandler):
    def initialize(self, query_executor):
        self._query_executor = query_executor

    def execute_query(self, connection_url, query):
        result = self._query_executor.execute_query(connection_url, query)
        return result

    def error_response(self, message):
        response = {
            "responseType": "error",
            "responseData": {"message": message},
        }
        return response

    async def post(self):
        data = json_decode(self.request.body)
        query = data["query"]
        connection_url = data["connectionString"]
        ioloop = tornado.ioloop.IOLoop.current()
        try:
            result = await ioloop.run_in_executor(
                None, self.execute_query, connection_url, query
            )
            if result.has_rows:
                response = {
                    "responseType": "success",
                    "responseData": {
                        "hasRows": True,
                        "keys": result.keys,
                        "rows": result.rows,
                    },
                }
            else:
                response = {
                    "responseType": "success",
                    "responseData": {"hasRows": False},
                }
        except Exception as e:
            response = self.error_response(str(e))
        self.finish(json.dumps(response))


class StructureHandler(IPythonHandler):
    async def post(self):
        response = {
            "responseType": "success",
            "responseData": {
                "tables": ["a", "b", "c"]
            }
        }
        self.finish(json.dumps(response))


def form_route(web_app, endpoint):
    return url_path_join(
        web_app.settings["base_url"], "/jupyterlab-sql/", endpoint
    )


def register_handlers(nbapp):
    web_app = nbapp.web_app
    host_pattern = ".*$"
    executor = QueryExecutor()
    handlers = [
        (form_route(web_app, "query"), SqlQueryHandler, {"query_executor": executor}),
        (form_route(web_app, "structure"), StructureHandler)
    ]
    web_app.add_handlers(host_pattern, handlers)