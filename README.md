# IoT Device Monitoring & Predictive Maintenance SaaS Platform

## 1. Project Overview

The IoT Device Monitoring & Predictive Maintenance SaaS Platform is a web-based application designed to monitor IoT devices, collect sensor readings, detect abnormal conditions, generate alerts, and manage preventive maintenance tasks.

The platform provides a centralized dashboard for monitoring device status, reviewing sensor readings, managing alerts, and tracking maintenance activities.

Sensor data can be submitted through the backend API using a simulator or integrated devices. Simulated readings are used for development and testing and do not represent measurements from real physical devices.

## 2. Objectives

- Monitor IoT device status and sensor readings.
- Register and manage devices.
- Validate incoming sensor data.
- Configure threshold-based alert rules.
- Generate alerts when configured conditions are met.
- Track alert acknowledgment and resolution.
- Manage maintenance tasks and assignments.
- Calculate predictive maintenance scores, where implemented.
- Display device and alert information through a React dashboard.
- Provide authenticated API access and role-based permissions.

## 3. Technology Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT authentication
- Pytest

### Frontend
- React
- Vite
- JavaScript
- Tailwind CSS
- Axios
- React Router

### Database
- MySQL or PostgreSQL, depending on the configured database connection.

### Additional Components
- Swagger UI for API documentation
- WebSocket for live updates, where configured
- SMTP email notifications, where configured
- Sensor-data simulator or MQTT integration, depending on the implementation

## 4. Main Features

### Authentication and Authorization
- User login and authentication.
- JWT-based access to protected API endpoints.
- Role-based permissions for administrators, operators, and viewers.

### Device Management
- Register and view IoT devices.
- Store device information and configuration.
- Monitor online, offline, warning, and critical statuses where supported.
- View individual device details.

### Sensor Data Monitoring
- Submit sensor readings through the API.
- Validate temperature, humidity, vibration, and battery values.
- Store timestamped readings.
- Prevent duplicate reading events using event IDs.

### Alert Management
- Configure sensor threshold rules.
- Evaluate incoming readings against active rules.
- Generate alerts when configured conditions are satisfied.
- Acknowledge and resolve alerts.
- Maintain alert history where configured.

### Predictive Maintenance
- Calculate device maintenance risk or health scores, if implemented.
- Identify devices requiring inspection.
- Create and assign maintenance tasks.
- Track maintenance task status.

### Dashboard
- Display device statistics.
- Show online and offline devices.
- Display alert summaries.
- Present device and maintenance information retrieved from the backend API.

## 5. Project Structure

The following is the intended high-level structure. Update folder names to match the final repository.

```text
iot-device-monitoring/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── config.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routes/
│   │   ├── services/
│   │   └── dependencies.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── postman_collection.json
│   └── screenshots/
└── README.md
```

## 6. Prerequisites

Install the following before running the application:

- Python 3.10 or later, matching the backend dependencies.
- Node.js and npm.
- MySQL or PostgreSQL.
- Git.

Check the installed versions:

```bash
python --version
node --version
npm --version
```

## 7. Database Setup

Create a database in MySQL or PostgreSQL.

Example for MySQL:

```sql
CREATE DATABASE iot_monitoring;
```

Configure the database connection in the backend environment file.

If the project uses Alembic migrations, apply them after configuration:

```bash
alembic upgrade head
```

If migrations have not been created, prepare and verify the database schema using the project's existing database initialization process before running the application.

## 8. Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Activate it on macOS or Linux:

```bash
source venv/bin/activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file using `.env.example` as a reference and configure the required values.

Start the FastAPI application:

```bash
uvicorn app.main:app --reload
```

Backend base URL:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

Alternative API documentation:

```text
http://127.0.0.1:8000/redoc
```

The Swagger and ReDoc URLs are available when the application has not disabled these documentation endpoints.

## 9. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

### Backend API Configuration

Ensure the Axios API base URL points to the running backend.

Example:

```javascript
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export default API;
```

The frontend should retrieve device information, sensor readings, alerts, and maintenance tasks from backend API endpoints. Do not replace live API data with hardcoded sample values in the final dashboard.

## 10. Environment Variables

Create a `.env.example` file in the backend directory. Include the variables actually used by the project.

Example template:

```dotenv
DATABASE_URL=
SECRET_KEY=
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

SMTP_HOST=
SMTP_PORT=587
SMTP_EMAIL=
SMTP_PASSWORD=

MQTT_BROKER_HOST=
MQTT_BROKER_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
```

Remove unused variables and add any additional settings required by the actual configuration module.

**Security:** Never commit real passwords, database credentials, JWT secrets, SMTP credentials, or production tokens to GitHub.

## 11. Sensor Data Simulator and MQTT

The application can receive sensor readings through its sensor-reading API. A simulator can be used to send test readings during development.

A simulator should:
1. Generate a unique event ID for each new reading.
2. Include a timestamp with a valid timezone.
3. Send supported sensor fields such as temperature, humidity, vibration, and battery level.
4. Submit readings to the appropriate device-reading endpoint.
5. Check the API response for successful ingestion.
6. Use values that intentionally trigger configured alert rules when testing alerts.

Example request body:

```json
{
  "event_id": "sample-event-001",
  "timestamp": "2026-01-01T10:00:00+00:00",
  "temperature": 35,
  "humidity": 65,
  "vibration": 2.5,
  "battery_level": 90
}
```

Example endpoint:

```text
POST /devices/{device_id}/readings
```

Replace `{device_id}` with an existing device ID. The request must use the authentication and permissions required by the backend.

The sample values above are illustrative only. They are not readings from a real device.

### MQTT Integration

If MQTT is implemented or configured, document the broker address, topic names, authentication, payload format, and message-to-API processing flow here.

If MQTT is not implemented, describe it as a future integration rather than a completed feature.

## 12. API Documentation and Postman

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

Use Swagger to inspect available endpoints, schemas, required authentication, and response codes.

A Postman collection should be exported and saved at:

```text
docs/postman_collection.json
```

The collection should include the implemented endpoints for authentication, devices, sensor readings, alert rules, alerts, maintenance, and dashboard analytics.

Configure the backend base URL and authentication token through Postman variables. Only include endpoints that exist in the final backend.

## 13. Testing with Pytest

Install testing dependencies:

```bash
pip install pytest pytest-asyncio httpx
```

Run tests from the backend directory:

```bash
pytest -v
```

To display a shorter failure report:

```bash
pytest -v --tb=short
```

### Required Test Coverage

The test suite should cover at least 12 meaningful cases:

1. Authentication and role permissions.
2. Device registration.
3. Duplicate device-code rejection.
4. Invalid sensor payload rejection.
5. Unknown device rejection.
6. Duplicate reading prevention.
7. Threshold-based alert creation.
8. Duplicate active-alert prevention.
9. Stale-device detection.
10. Alert acknowledgment and resolution.
11. Maintenance assignment and status validation.
12. Predictive maintenance score calculation.
13. Dashboard aggregation.

Include failure cases and edge cases in addition to successful requests.

### Test Results

Record the actual test results after executing the test suite.

```text
Total tests: [actual count]
Passed: [actual count]
Failed: [actual count]
Skipped: [actual count]
Execution date: [date]
```

Do not fill in these values until the tests have been executed. Attach the actual test output to the submission.

## 14. Screenshots

Save screenshots of the running application in:

```text
docs/screenshots/
```

Include the following screenshots:

1. Live dashboard with backend-provided statistics.
2. Device details page with sensor readings.
3. Alerts page with alert statuses.
4. Maintenance module with task assignments and statuses.

If using simulated sensor data, label it clearly in the UI or screenshot description, for example:

**Data source: Simulated sensor readings**

Do not present simulator data as measurements collected from physical IoT hardware.

## 15. Troubleshooting

### Backend does not start
- Verify the virtual environment is activated.
- Install the dependencies.
- Check the database URL and database availability.
- Review the terminal traceback.

### Frontend cannot load backend data
- Confirm the backend is running.
- Check the Axios base URL.
- Check browser console errors and failed network requests.
- Verify authentication and CORS configuration.

### Sensor readings are rejected
- Confirm the device exists and is active.
- Verify the request fields and data types.
- Use a timezone-aware timestamp.
- Confirm the user has permission to submit readings.
- Use a new event ID for a new reading.

### Alerts are not generated
- Confirm the alert rule is active.
- Check its sensor field, operator, threshold, and required duration.
- Confirm the submitted reading satisfies the rule.
- Check backend logs and the alert database.

### Tests fail
- Check the test database configuration.
- Confirm test fixtures match the current models.
- Review endpoint paths, authentication overrides, and response schemas.
- Avoid using the production database for automated tests.

## 16. Security Considerations

- Store credentials in environment variables.
- Use hashed passwords.
- Protect sensitive endpoints using authentication and role checks.
- Validate incoming sensor payloads.
- Avoid exposing secrets in API responses or logs.
- Use a separate database for automated tests.
- Configure HTTPS and secure deployment settings before production use.

## 17. Future Enhancements

- MQTT ingestion from physical devices.
- More advanced predictive maintenance models.
- Device health trend analysis.
- Automated maintenance scheduling.
- Expanded dashboard analytics.
- Improved notification delivery and retry handling.
- Production deployment and monitoring.

## 18. Submission Checklist

- [ ] FastAPI backend source code.
- [ ] React/Vite frontend source code.
- [ ] Database schema and migration files.
- [ ] Sensor simulator or MQTT integration instructions.
- [ ] `.env.example`.
- [ ] README and setup instructions.
- [ ] Swagger API documentation.
- [ ] Postman collection.
- [ ] At least 12 meaningful Pytest cases.
- [ ] Actual test results.
- [ ] Dashboard screenshot.
- [ ] Device details screenshot.
- [ ] Alerts screenshot.
- [ ] Maintenance screenshot.
- [ ] Clear distinction between simulated and real device data.

## 19. Conclusion

The IoT Device Monitoring & Predictive Maintenance SaaS Platform provides a centralized interface for monitoring IoT devices, ingesting sensor readings, managing alerts, and coordinating maintenance activities.

The backend exposes APIs for device and sensor-data workflows, while the React frontend provides a user interface for interacting with backend data. Automated testing helps validate authentication, input validation, alert processing, maintenance workflows, and dashboard responses.

The final submission should include the implemented source code, setup instructions, API documentation, automated tests and actual test results, and screenshots of the running application.
