# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
from typing import Dict

import google
import vertexai
from google import genai
from google.genai.types import LiveConnectConfig, Content, FunctionDeclaration, Tool
from langchain_google_vertexai import VertexAIEmbeddings

from app.templates import SYSTEM_INSTRUCTION, FORMAT_DOCS
from app.vector_store import get_vector_store

# Constants
VERTEXAI = os.getenv("VERTEXAI", "true").lower() == "true"
LOCATION = "us-central1"
EMBEDDING_MODEL = "text-embedding-004"
MODEL_ID = "gemini-2.0-flash-exp"
URLS = [
    "https://docs.google.com/spreadsheets/d/1yR7e-MaswpZexNNY-IAv9C54H40zYwnGIuUxFya9vXU/edit?usp=sharing",
    "https://docs.google.com/spreadsheets/d/1yZZIXX9InxYzk9eJFQdeE1DtM3q-w82n7Yf4CiMCZZ4/edit?usp=sharing",
    "https://docs.google.com/spreadsheets/d/1cJpq8cPFC9NVithTZM4j7O-u1ipEta0b9DY9eHUmX6U/edit?usp=sharing",
    "https://docs.google.com/spreadsheets/d/1PA1fzpbSr5BxiBLcuAZDk6mR4ibAuAB59RvyS_r-7FA/edit?usp=sharing"
]

# Initialize Google Cloud clients
credentials, project_id = google.auth.default()
vertexai.init(project=project_id, location=LOCATION)


if VERTEXAI:
    genai_client = genai.Client(project=project_id, location=LOCATION, vertexai=True)
else:
    # API key should be set using GOOGLE_API_KEY environment variable
    genai_client = genai.Client(http_options={"api_version": "v1alpha"})

# Initialize vector store and retriever
embedding = VertexAIEmbeddings(model_name=EMBEDDING_MODEL)
vector_store = get_vector_store(embedding=embedding, urls=URLS)
retriever = vector_store.as_retriever()


def retrieve_docs(query: str) -> Dict[str, str]:
    """
    Retrieves pre-formatted documents about MLOps (Machine Learning Operations),
      Gen AI lifecycle, and production deployment best practices.

    Args:
        query: Search query string related to MLOps, Gen AI, or production deployment.

    Returns:
        A set of relevant, pre-formatted documents.
    """
    docs = retriever.invoke(query)
    formatted_docs = FORMAT_DOCS.format(docs=docs)
    return {"output": formatted_docs}

lists = {}

def look_at_lists() -> Dict[str, Dict[str, list]]:
    return lists

def edit_list(list_id: str, heading: str, list_array: list):
    if list_id in lists:
        lists[list_id] = {"heading": heading, "list_array": list_array}
    else:
        raise ValueError(f"List with ID '{list_id}' does not exist.")

def remove_list(list_id: str):
    if list_id in lists:
        del lists[list_id]
    else:
        raise ValueError(f"List with ID '{list_id}' does not exist.")

def create_list(list_id: str, heading: str, list_array: list):
    if list_id in lists:
        raise ValueError(f"List with ID '{list_id}' already exists.")
    lists[list_id] = {"heading": heading, "list_array": list_array}

retrieve_docs_function = FunctionDeclaration.from_function(client=genai_client, func=retrieve_docs)
create_list_function = FunctionDeclaration.from_function(client=genai_client, func=create_list)
edit_list_function = FunctionDeclaration.from_function(client=genai_client, func=edit_list)
remove_list_function = FunctionDeclaration.from_function(client=genai_client, func=remove_list)
look_at_lists_function = FunctionDeclaration.from_function(client=genai_client, func=look_at_lists)

tools = Tool(
    function_declarations=[
        retrieve_docs_function, create_list_function, edit_list_function, remove_list_function, look_at_lists_function
    ]
)


tool_functions = {"retrieve_docs": retrieve_docs, "look_at_lists": look_at_lists, "create_list": create_list, "edit_list": edit_list, "remove_list": remove_list}

live_connect_config = LiveConnectConfig(
    response_modalities=["AUDIO"],
    tools=[tools],
    system_instruction=Content(parts=[{"text": SYSTEM_INSTRUCTION}]),
)
