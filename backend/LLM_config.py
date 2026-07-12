from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from dotenv import load_dotenv


load_dotenv()
API_KEY = os.getenv("API_KEY")

llm = ChatGroq(
    groq_api_key=API_KEY,
    model_name="llama-3.3-70b-versatile",
    max_tokens=10000,
)

# llm = ChatGoogleGenerativeAI(
#     model="gemini-2.5-flash",
#     temperature=0
# )