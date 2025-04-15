/**
 * Droll Agents - Meeting Preparation Agent JavaScript
 * An AI-powered assistant for preparing comprehensive meeting materials.
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initializeApp();
});

/**
 * Initialize the application with all event listeners and UI enhancements
 */
function initializeApp() {
    const form = document.getElementById('meetingForm');
    const loadingEl = document.getElementById('loading');
    const resultEl = document.getElementById('result');
    const resultContentEl = document.getElementById('resultContent');
    
    // Define backend URL based on environment
    const BACKEND_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000'
        : 'https://meeting-preparation-agent-drollagents.onrender.com';
    
    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
    
    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Disable form submission button to prevent multiple submissions
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        
        // Update button text with loading spinner
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"><i class="fas fa-circle-notch fa-spin"></i></span> Processing...';
        
        // Show loading indicator with animation
        loadingEl.style.opacity = '0';
        loadingEl.style.display = 'block';
        setTimeout(() => {
            loadingEl.style.opacity = '1';
            loadingEl.style.transition = 'opacity 0.5s ease';
        }, 10);
        
        // Hide result if visible
        resultEl.style.display = 'none';
        
        // Create progress update simulation
        let progressSteps = [
            'Analyzing company information...',
            'Researching industry trends...',
            'Creating meeting strategy and agenda...',
            'Generating executive brief...',
            'Finalizing meeting preparation materials...'
        ];
        
        let currentStep = 0;
        const loadingText = loadingEl.querySelector('.loading-text');
        const progressInterval = setInterval(() => {
            if (currentStep < progressSteps.length) {
                loadingText.textContent = progressSteps[currentStep];
                currentStep++;
            } else {
                clearInterval(progressInterval);
            }
        }, 12000);
        
        // Collect form data
        const formData = new FormData(this);
        
        // Send data to the server
        fetch(`${BACKEND_URL}/prepare_meeting`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            console.log("Response status:", response.status);
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || `Server returned ${response.status}: ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("Received meeting preparation data");
            
            // Clear progress interval
            clearInterval(progressInterval);
            
            // Hide loading indicator with fade out
            loadingEl.style.opacity = '0';
            setTimeout(() => {
                loadingEl.style.display = 'none';
                
                // Show result with fade in
                resultEl.style.opacity = '0';
                resultEl.style.display = 'block';
                
                setTimeout(() => {
                    resultEl.style.opacity = '1';
                    resultEl.style.transition = 'opacity 0.5s ease';
                    
                    // Scroll to result
                    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 10);
                
                // Use the server-rendered HTML if available
                if (data.html_result) {
                    resultContentEl.innerHTML = data.html_result;
                } else {
                    // Parse markdown to HTML
                    const formattedResult = formatContent(data.result || "No results available");
                    resultContentEl.innerHTML = formattedResult;
                }
                
                // Add copy buttons to each section
                addCopyButtons();
            }, 300);
            
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        })
        .catch(error => {
            console.error("Error:", error);
            
            // Clear progress interval
            clearInterval(progressInterval);
            
            // Hide loading indicator
            loadingEl.style.opacity = '0';
            setTimeout(() => {
                loadingEl.style.display = 'none';
                
                // Show error message
                resultEl.style.opacity = '0';
                resultEl.style.display = 'block';
                setTimeout(() => {
                    resultEl.style.opacity = '1';
                    resultEl.style.transition = 'opacity 0.5s ease';
                }, 10);
                
                resultContentEl.innerHTML = `
                    <div class="alert alert-danger">
                        <h4><i class="fas fa-exclamation-circle me-2"></i>Error</h4>
                        <p>${error.message}</p>
                        <p>Please check that you've set up the required API keys in your .env file.</p>
                    </div>
                `;
                
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }, 300);
        });
    });
    
    // Add input field animations and enhancements
    enhanceFormInputs();
    
    // Add hover effect to back button
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('mouseenter', function() {
            const svg = this.querySelector('svg');
            if (svg) {
                svg.style.transform = 'translateX(-3px)';
            }
        });
        
        backButton.addEventListener('mouseleave', function() {
            const svg = this.querySelector('svg');
            if (svg) {
                svg.style.transform = '';
            }
        });
    }
}

/**
 * Enhance form inputs with focus and animation effects
 */
function enhanceFormInputs() {
    // Add focus styles to form controls
    document.querySelectorAll('.form-control').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
            this.style.boxShadow = '0 0 0 3px rgba(0, 102, 204, 0.15)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
            this.style.boxShadow = '';
        });
    });
    
    // Focus first input field on page load
    setTimeout(() => {
        const firstInput = document.getElementById('company_name');
        if (firstInput) {
            firstInput.focus();
        }
    }, 500);
}

/**
 * Format the content with HTML formatting
 * @param {string} text - The text to format
 * @returns {string} - The formatted HTML
 */
function formatContent(text) {
    // Format headers
    let formatted = text.replace(/^# (.*)/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/^## (.*)/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^### (.*)/gm, '<h3>$1</h3>');
    
    // Format bold and italic text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Format lists
    const listItems = formatted.split('\n').map(line => {
        // Check for bullet points
        if (line.trim().startsWith('- ')) {
            return `<li>${line.trim().substring(2)}</li>`;
        }
        // Check for numbered lists
        else if (/^\d+\.\s+/.test(line.trim())) {
            return `<li>${line.trim().replace(/^\d+\.\s+/, '')}</li>`;
        }
        return line;
    });
    
    // Group list items
    let inList = false;
    let htmlContent = [];
    
    for (let i = 0; i < listItems.length; i++) {
        const item = listItems[i];
        
        if (item.startsWith('<li>') && !inList) {
            htmlContent.push('<ul>');
            inList = true;
        } else if (!item.startsWith('<li>') && inList) {
            htmlContent.push('</ul>');
            inList = false;
        }
        
        htmlContent.push(item);
    }
    
    if (inList) {
        htmlContent.push('</ul>');
    }
    
    // Convert newlines to <br> tags for remaining text
    formatted = htmlContent.join('\n').replace(/\n/g, '<br>');
    
    return formatted;
}

/**
 * Add copy buttons to each section of the result
 */
function addCopyButtons() {
    const headings = document.querySelectorAll('#resultContent h2');
    headings.forEach(heading => {
        // Create copy section button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-sm btn-outline-primary ms-2';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy section';
        copyBtn.style.fontSize = '0.8rem';
        copyBtn.style.padding = '0.2rem 0.5rem';
        
        // Insert after heading text
        heading.appendChild(copyBtn);
        
        // Get content to copy (everything between this h2 and the next h2)
        copyBtn.addEventListener('click', function() {
            let content = heading.innerText.replace('Copy', '').trim() + '\n\n'; // Start with the heading
            let nextEl = heading.nextElementSibling;
            
            while (nextEl && nextEl.tagName !== 'H2') {
                // Get the text content but not from any copy buttons
                let text = nextEl.innerText;
                content += text + '\n\n';
                nextEl = nextEl.nextElementSibling;
            }
            
            // Create temporary textarea to copy content
            const textarea = document.createElement('textarea');
            textarea.value = content.trim();
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            // Show copied feedback
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            copyBtn.classList.add('btn-success');
            copyBtn.classList.remove('btn-outline-primary');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.classList.add('btn-outline-primary');
                copyBtn.classList.remove('btn-success');
            }, 2000);
        });
    });
}
