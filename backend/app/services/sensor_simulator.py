import asyncio
import logging
import random
import uuid
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)

API_BASE_URL = "http://127.0.0.1:8000"


def generate_sensor_reading(device_id: int | None = None) -> dict:
    """Generate sample IoT sensor data."""

    reading = {
        "event_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "temperature": round(random.uniform(25.0, 75.0), 2),
        "humidity": round(random.uniform(30.0, 80.0), 2),
        "vibration": round(random.uniform(0.5, 4.5), 2),
        "battery_level": round(random.uniform(20.0, 100.0), 2),
    }

    if device_id is not None:
        reading["device_id"] = device_id

    return reading


async def send_sensor_reading(
    device_id: int,
    access_token: str,
    api_base_url: str = API_BASE_URL,
) -> dict:
    """Send one simulated reading to the FastAPI ingestion endpoint."""

    if device_id <= 0:
        raise ValueError("device_id must be greater than zero")

    if not access_token.strip():
        raise ValueError("A valid access token is required")

    reading = generate_sensor_reading(device_id)

    # device_id belongs in the URL, not the request body.
    payload = {
        key: value
        for key, value in reading.items()
        if key != "device_id"
    }

    url = f"{api_base_url.rstrip('/')}/devices/{device_id}/readings"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            url,
            json=payload,
            headers=headers,
        )

        if response.is_success:
            logger.info(
                "Sensor reading sent successfully for device %s",
                device_id,
            )
            return response.json()

        logger.error(
            "Sensor reading failed for device %s: HTTP %s - %s",
            device_id,
            response.status_code,
            response.text,
        )

        response.raise_for_status()


async def run_sensor_simulator(
    device_id: int,
    access_token: str,
    interval_seconds: int = 10,
    api_base_url: str = API_BASE_URL,
) -> None:
    """Continuously generate and send readings until cancelled."""

    if interval_seconds < 1:
        raise ValueError("interval_seconds must be at least 1")

    logger.info("Starting simulator for device %s", device_id)

    while True:
        try:
            await send_sensor_reading(
                device_id=device_id,
                access_token=access_token,
                api_base_url=api_base_url,
            )
        except asyncio.CancelledError:
            raise
        except (httpx.HTTPError, ValueError):
            logger.exception(
                "Simulator request failed for device %s",
                device_id,
            )

        await asyncio.sleep(interval_seconds)