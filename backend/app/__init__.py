from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router


def create_app():
    app = FastAPI(title="Chest X-Ray Classifier API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:8080", "*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    @app.get("/")
    async def root():
        return {"status": "ok", "message": "Chest X-Ray Classifier API"}

    return app
