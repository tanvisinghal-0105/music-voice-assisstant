# Multimodal Live Music Assisstant

This pattern showcases a real-time conversational RAG agent powered by Google Gemini. The agent handles audio, video, and text interactions while leveraging tool calling with a vector DB for grounded responses.

![live_api_diagram](https://storage.googleapis.com/github-repo/generative-ai/sample-apps/e2e-gen-ai-app-starter-pack/live_api_diagram.png)

**Key components:**

- **Python Backend** (in `app/` folder): A production-ready server built with [FastAPI](https://fastapi.tiangolo.com/) and [google-genai](https://googleapis.github.io/python-genai/) that features:

  - **Real-time bidirectional communication** via WebSockets between the frontend and Gemini model
  - **Integrated tool calling** with vector database support for contextual document retrieval
  - **Production-grade reliability** with retry logic and automatic reconnection capabilities
  - **Deployment flexibility** supporting both AI Studio and Vertex AI endpoints
  - **Feedback logging endpoint** for collecting user interactions

- **React Frontend** (in `frontend/` folder): Extends the [Multimodal live API Web Console](https://github.com/google-gemini/multimodal-live-api-web-console), with added features like **custom URLs** and **feedback collection**.

#### Prerequisites

Before you begin, ensure you have the following installed: [Python 3.10+](https://www.python.org/downloads/), [Poetry](https://python-poetry.org/docs/#installation), [Node.js](https://nodejs.org/) (including npm), [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)

#### Backend Setup

1. **Set your default Google Cloud project and region:**

   ```bash
   export PROJECT_ID="your-gcp-project"

   gcloud auth login --update-adc
   gcloud config set project $PROJECT_ID
   gcloud auth application-default set-quota-project $PROJECT_ID
   ```

   <details>
   <summary><b>For AI Studio setup:</b></summary>

   ```bash
   export VERTEXAI=false
   export GOOGLE_API_KEY=your-google-api-key
   ```

   </details>

2. **Install Dependencies:**

   Install the required Python packages using Poetry:

   ```bash
   poetry install
   ```

3. **Run the Backend Server:**

   Start the FastAPI server:

   ```bash
   poetry run uvicorn app.server:app --host 0.0.0.0 --port 8000 --reload
   ```

#### Frontend Setup

1. **Install Dependencies:**

   In a separate terminal, install the required Node.js packages for the frontend:

   ```bash
   npm --prefix frontend install
   ```

2. **Start the Frontend:**

   Launch the React development server:

   ```bash
   npm --prefix frontend start
   ```

   This command starts the frontend application, accessible at `http://localhost:3000`.

