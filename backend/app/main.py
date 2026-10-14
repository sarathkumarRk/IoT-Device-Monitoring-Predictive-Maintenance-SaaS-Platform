import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models

from app.services.websocket_service import websocket_manager
from app.services.offline_detection_service import check_offline_devices

from app.routes import (
    auth,
    user,
    sites,
    devices,
    readings,
    alerts,
    alert_rules,
    maintenance,
    notifications,
    dashboard,
)

logger = logging.getLogger(__name__)

OFFLINE_CHECK_INTERVAL = 30

Base.metadata.create_all(bind=engine)

async def offline_monitor():
    while True:
        try:
            await check_offline_devices()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Offline device monitoring failed")

        await asyncio.sleep(OFFLINE_CHECK_INTERVAL)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting IoT Device Monitoring API")

    monitor_task = asyncio.create_task(offline_monitor())

    try:
        yield
    finally:
        monitor_task.cancel()

        try:
            await monitor_task
        except asyncio.CancelledError:
            pass

        logger.info("IoT Device Monitoring API stopped")


app = FastAPI(
    title="IoT Device Monitoring & Predictive Maintenance API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(sites.router)
app.include_router(devices.router)
app.include_router(readings.router)
app.include_router(alert_rules.router)
app.include_router(alerts.router)
app.include_router(maintenance.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception:
        logger.exception("WebSocket connection error")
        websocket_manager.disconnect(websocket)


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "IoT Device Monitoring API is running",
    }



