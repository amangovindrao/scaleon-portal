from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import auth_router, admin_router, test_router, proctor_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="theScaleOn Hiring Portal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(test_router.router)
app.include_router(proctor_router.router)


@app.get("/")
def root():
    return {"status": "theScaleOn Hiring Portal API is running"}
