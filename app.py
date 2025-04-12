from flask import Flask, render_template, request, jsonify
from crewai_tools import SerperDevTool
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

@app.route('/', methods=['GET'])
def index():
    # Check if API keys are available and pass status to template
    api_keys_set = {
        'groq': os.environ.get('GROQ_API_KEY') is not None,
        'serper': os.environ.get('SERPER_API_KEY') is not None
    }
    return render_template('index.html', api_keys_set=api_keys_set)

@app.route('/prepare_meeting', methods=['POST'])
def prepare_meeting():
    # Check for required API keys
    if not os.environ.get('GROQ_API_KEY'):
        return jsonify({
            "error": "GROQ_API_KEY is missing. Please add it to your .env file."
        }), 500
    
    if not os.environ.get('SERPER_API_KEY'):
        return jsonify({
            "error": "SERPER_API_KEY is missing. Please add it to your .env file."
        }), 500

    try:
        # Get form data
        data = request.form
        company_name = data.get('company_name', '')
        meeting_objective = data.get('meeting_objective', '')
        attendees = data.get('attendees', '')
        meeting_duration = int(data.get('meeting_duration', 60))
        focus_areas = data.get('focus_areas', '')
        
        logger.info(f"Starting meeting preparation for {company_name}")
        
        # Initialize the LLM
        llm = get_groq_llm()
        
        # Create a custom function for the agents to use for searching
        def search_function(query):
            try:
                search_tool = SerperDevTool(api_key=get_serper_api_key())
                return search_tool._run(search_query=query)
            except Exception as e:
                logger.error(f"Error searching: {str(e)}")
                return f"Error searching: {str(e)}. Please try a different query."
        
        # Get some initial context about the company without using CrewAI first
        try:
            company_info = search_function(f"company information about {company_name}")
            industry_info = search_function(f"{company_name} industry trends and competitors")
            logger.info("Successfully gathered initial information directly")
        except Exception as e:
            logger.error(f"Error getting initial information: {str(e)}")
            company_info = "Could not retrieve company information."
            industry_info = "Could not retrieve industry information."
        
        # Generate the meeting preparation content using direct LLM calls
        # This avoids the SerperDevTool issue with CrewAI
        
        logger.info("Generating company analysis")
        context_prompt = f"""
        Please analyze the following information about {company_name}:
        
        Company Information:
        {company_info}
        
        Industry Information:
        {industry_info}
        
        Meeting Context:
        - Objective: {meeting_objective}
        - Attendees: {attendees}
        - Duration: {meeting_duration} minutes
        - Focus Areas: {focus_areas}
        
        Provide a concise company analysis focusing on recent news, products, and relevant background information.
        Format your response in Markdown.
        """
        
        context_response = llm.invoke(context_prompt)
        company_analysis = context_response.content
        logger.info("Company analysis generated")
        
        # Wait to avoid rate limits
        time.sleep(15)
        
        logger.info("Generating industry analysis")
        industry_prompt = f"""
        Based on this information about {company_name} and its industry:
        
        {industry_info}
        
        Provide a brief industry analysis including:
        1. Key industry trends
        2. Top competitors
        3. Market opportunities
        
        Keep it very concise and use Markdown format.
        """
        
        industry_response = llm.invoke(industry_prompt)
        industry_analysis = industry_response.content
        logger.info("Industry analysis generated")
        
        # Wait to avoid rate limits
        time.sleep(15)
        
        logger.info("Creating meeting strategy")
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
        
        strategy_response = llm.invoke(strategy_prompt)
        strategy_content = strategy_response.content
        logger.info("Meeting strategy created")
        
        # Wait to avoid rate limits
        time.sleep(15)
        
        logger.info("Creating executive brief")
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
        
        brief_response = llm.invoke(brief_prompt)
        brief_content = brief_response.content
        logger.info("Executive brief created")
        
        # Combine all results
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
        
        # Convert markdown to HTML for better display
        html_result = markdown2.markdown(combined_result)
        
        logger.info(f"Meeting preparation completed for {company_name}")
        
        return jsonify({
            "result": combined_result,
            "html_result": html_result
        })
    
    except Exception as e:
        logger.error(f"Error during meeting preparation: {str(e)}")
        return jsonify({
            "error": f"An error occurred: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)