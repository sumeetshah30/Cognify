\# Cognify — AI Data Intelligence Platform



Cognify is an AI-powered data intelligence platform that helps users upload documents and datasets, ask questions about their content, explore data, generate insights, and automate analysis through an AI agent.



The project combines a modern Angular frontend with a Python FastAPI backend, SQL Server, and Claude AI.



> \*\*Project status:\*\* Actively developed personal portfolio project. Features and architecture may evolve as development continues. This repository is intended to showcase development work, technical decisions, and ongoing learning.



\## Features



\### Document Intelligence

\- Upload PDF, DOCX, TXT, Markdown, CSV, and XLSX files.

\- Process uploaded documents in the background.

\- Ask natural-language questions about uploaded content.

\- Retrieve relevant passages to support AI-generated answers.

\- View previous questions and answers.

\- Compare two documents using AI.



\### Data Analytics

\- Upload structured datasets.

\- Explore dataset information and metadata.

\- Generate bar, line, histogram, and scatter charts.

\- Generate AI-powered dataset insights.



\### AI Reports

\- Generate reports using uploaded documents and custom instructions.

\- View previously generated reports.

\- Delete reports.



\### AI Agent

\- Submit goals to an AI agent.

\- Track agent execution steps and results.

\- Receive live document-processing and agent updates through Server-Sent Events (SSE).



\### Authentication

\- User registration and login.

\- JWT-based authentication.

\- User-specific document and report access.



\## Technology Stack



| Layer | Technologies |

|---|---|

| Frontend | Angular 22, TypeScript, SCSS |

| Backend | Python 3.14, FastAPI |

| Database | Microsoft SQL Server |

| ORM | SQLAlchemy |

| AI | Anthropic Claude |

| Data processing | Python data-processing libraries |

| Frontend visualization | Chart.js |

| Authentication | JWT |

| Live updates | Server-Sent Events |

| API documentation | Swagger / OpenAPI |



\## Architecture



```text

&#x20;                Cognify

&#x20;                   |

&#x20;         Angular 22 Frontend

&#x20;                   |

&#x20;             REST API

&#x20;                   |

&#x20;            FastAPI Backend

&#x20;                   |

&#x20;      +------------+-------------+

&#x20;      |            |             |

&#x20;  Authentication  AI Services  Data Processing

&#x20;      |            |             |

&#x20;      |          Claude       Analytics

&#x20;      |            |             |

&#x20;      +------------+-------------+

&#x20;                   |

&#x20;             SQL Server

&#x20;                   |

&#x20;          Document Storage

```



The frontend communicates with the backend through REST APIs. The backend handles authentication, document processing, data analytics, AI interactions, and persistence.



\## Project Structure



```text

Cognify/

├── backend/

│   ├── app/

│   │   ├── routes/

│   │   ├── services/

│   │   ├── config.py

│   │   ├── db.py

│   │   ├── main.py

│   │   ├── models.py

│   │   └── security.py

│   ├── requirements.txt

│   └── .env.example

│

├── frontend/

│   ├── src/

│   │   └── app/

│   │       ├── core/

│   │       ├── pages/

│   │       └── shared/

│   ├── angular.json

│   └── package.json

│

├── .gitignore

└── README.md

```



\## Screenshots



Screenshots of the application will be added here as development progresses.



<!-- Suggested screenshots:

\- Dashboard

\- Document Library

\- Ask AI

\- Data Analytics

\- Document Comparison

\- AI Agent

\- Reports

\-->



\## Getting Started



\### Prerequisites



\- Python 3.14

\- Node.js 22.22.3 or later

\- Microsoft SQL Server

\- ODBC Driver 18 for SQL Server

\- Anthropic API key



\### 1. Clone the repository



```bash

git clone YOUR\_GITHUB\_REPOSITORY\_URL

cd Cognify

```



\### 2. Configure the backend



```powershell

cd backend

python -m venv .venv

.venv\\Scripts\\Activate.ps1

pip install -r requirements.txt

Copy-Item .env.example .env

```



Update `backend/.env` with your local database connection, Anthropic API key, and JWT secret.



Create an empty SQL Server database named `cognify` before starting the backend.



Start the API:



```powershell

uvicorn app.main:app --reload --port 8000

```



API documentation:



http://localhost:8000/docs



Health check:



http://localhost:8000/api/health



\### 3. Configure the frontend



Open a second terminal:



```powershell

cd frontend

npm install

npm start

```



Open the application:



http://localhost:4200



The frontend expects the backend API at:



http://localhost:8000/api



\## Environment Variables



Create `backend/.env` using `backend/.env.example`.



| Variable | Description |

|---|---|

| DATABASE\_URL | SQL Server database connection |

| ANTHROPIC\_API\_KEY | Anthropic API key |

| CLAUDE\_MODEL | Claude model identifier |

| JWT\_SECRET | Secret used for JWT authentication |



Never commit `.env` files, API keys, passwords, or other private credentials.



\## Roadmap



Planned improvements:



\- Improve document processing and retrieval.

\- Expand AI agent capabilities.

\- Enhance analytics and visualizations.

\- Improve error handling and application reliability.

\- Add automated backend and frontend tests.

\- Improve documentation and application screenshots.

\- Explore additional AI-powered workflows.



\## Disclaimer



Cognify is a personal development and portfolio project. It is not presented as a production-ready enterprise application. Configuration, security, reliability, and deployment capabilities may require further work before production use.



\## Author



\*\*Sumeet Shah\*\*



\- GitHub: \[github.com/sumeetshah30](https://github.com/sumeetshah30)

\- Portfolio: \[sumeetshah30.github.io](https://sumeetshah30.github.io)

\- LinkedIn: \[linkedin.com/in/sumeet-shah30](https://linkedin.com/in/sumeet-shah30)



