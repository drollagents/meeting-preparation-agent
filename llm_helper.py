from langchain_groq.chat_models import ChatGroq
import os 
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_groq_llm():
    # Return the LangChain model directly
    return ChatGroq(
        groq_api_key = os.environ.get('GROQ_API_KEY'),
        model = "llama-3.1-8b-instant",
    )

def get_serper_api_key():
    return os.environ.get('SERPER_API_KEY')