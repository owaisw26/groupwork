from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(title="GroupWork API", version="1.0.0")
    return app
