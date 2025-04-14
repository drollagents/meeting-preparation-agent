from flask import Flask, render_template, request, jsonify
from crewai_tools import SerperDevTool
from flask_cors import CORS
import os
import time
import logging
from dotenv import load_dotenv
from llm_helper import get_groq_llm, get_serper_api_key
import markdown2

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('meeting-prep')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def validate_api_keys():
    missing_keys = []
    if not os.environ.get('GROQ_API_KEY'):
        missing_keys.append('GROQ_API_KEY')
    if not os.environ.get('SERPER_API_KEY'):
        missing_keys.append('SERPER_API_KEY')
    return missing_keys

@app.route('/', methods=['GET'])
def index():
    api_keys_set = {
        'groq': os.environ.get('GROQ_API_KEY') is not None,
        'serper': os.environ.get('SERPER_API_KEY') is not None
    }
    return render_template('index.html', api_keys_set=api_keys_set)

@app.route('/health')
def health_check():
    missing_keys = validate_api_keys()
    status = "healthy" if not missing_keys else f"missing keys: {', '.join(missing_keys)}"
    return jsonify({"status": status}), 200 if not missing_keys else 500

@app.route('/prepare_meeting', methods=['POST'])
def prepare_meeting():
    try:
        # Validate API keys
        missing_keys = validate_api_keys()
        if missing_keys:
            return jsonify({
                "error": f"Missing required API keys: {', '.join(missing_keys)}. Please add them to your .env file."
            }), 500

        # Get form data with validation
        data = request.form
        company_name = data.get('company_name')
        meeting_objective = data.get('meeting_objective')
        attendees = data.get('attendees')
        meeting_duration = data.get('meeting_duration')
        focus_areas = data.get('focus_areas')

        # Validate required fields
        if not all([company_name, meeting_objective, attendees, meeting_duration]):
            return jsonify({
                "error": "Missing required fields. Please fill in all required information."
            }), 400

        try:
            meeting_duration = int(meeting_duration)
        except ValueError:
            return jsonify({
                "error": "Meeting duration must be a number."
            }), 400

        logger.info(f"Starting meeting preparation for {company_name}")
        
        # Initialize LLM
        llm = get_groq_llm()
        
        # Search function
        def search_function(query):
            try:
                search_tool = SerperDevTool(api_key=get_serper_api_key())
                return search_tool._run(search_query=query)
            except Exception as e:
                logger.error(f"Search error for query '{query}': {str(e)}")
                return f"Search error: {str(e)}."

        # Gather initial information
        try:
            company_info = search_function(f"company information about {company_name}")
            industry_info = search_function(f"{company_name} industry trends and competitors")
            logger.info("Successfully gathered initial information")
        except Exception as e:
            logger.error(f"Error gathering initial information: {str(e)}")
            return jsonify({
                "error": "Failed to gather company information. Please try again."
            }), 500

        # Generate analyses with rate limiting
        try:
            # Company Analysis
            context_prompt = f"""
            Please analyze the following information about {company_name}:
            
            Company Information:
            {company_info}
            
            Meeting Context:
            - Objective: {meeting_objective}
            - Attendees: {attendees}
            - Duration: {meeting_duration} minutes
            - Focus Areas: {focus_areas}
            
            Provide a concise company analysis focusing on recent news, products, and relevant background information.
            Format your response in Markdown.
            """
            company_analysis = llm.invoke(context_prompt).content
            time.sleep(2)  # Rate limiting

            # Industry Analysis
            industry_prompt = f"""
            Based on this information about {company_name} and its industry:
            
            {industry_info}
            
            Provide a brief industry analysis including:
            1. Key industry trends
            2. Top competitors
            3. Market opportunities
            
            Keep it very concise and use Markdown format.
            """
            industry_analysis = llm.invoke(industry_prompt).content
            time.sleep(2)

            # Meeting Strategy
            strategy_prompt = f"""
            Create a brief {meeting_duration}-minute agenda for a meeting with {company_name}:
            
            Meeting Context:
            - Objective: {meeting_objective}
            - Attendees: {attendees}
            - Focus Areas: {focus_areas}
            
            Include:
            1. 3-4 time-boxed sections
            2. Key talking points for each section
            3. Who should lead each section
            
            Keep it concise and use Markdown format.
            """
            strategy_content = llm.invoke(strategy_prompt).content
            time.sleep(2)

            # Executive Brief
            brief_prompt = f"""
            Create a brief executive summary for the meeting with {company_name}:
            
            Meeting Context:
            - Objective: {meeting_objective}
            - Attendees: {attendees}
            - Focus Areas: {focus_areas}
            
            Include:
            1. Brief summary (2-3 sentences)
            2. 3 key points to remember
            3. 2 recommended actions
            
            Be very concise and use Markdown format.
            """
            brief_content = llm.invoke(brief_prompt).content

            # Combine results
            combined_result = f"""
# Meeting Preparation for {company_name}

## Company Context
{company_analysis}

## Industry Analysis
{industry_analysis}

## Meeting Strategy & Agenda
{strategy_content}

## Executive Brief
{brief_content}
"""
            
            # Convert to HTML
            html_result = markdown2.markdown(combined_result)
            
            logger.info(f"Meeting preparation completed for {company_name}")
            
            return jsonify({
                "result": combined_result,
                "html_result": html_result
            })

        except Exception as e:
            logger.error(f"Error generating content: {str(e)}")
            return jsonify({
                "error": f"Failed to generate meeting materials: {str(e)}"
            }), 500

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({
            "error": f"An unexpected error occurred: {str(e)}"
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)