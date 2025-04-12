document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('meetingForm');
    const loadingEl = document.getElementById('loading');
    const resultEl = document.getElementById('result');
    const resultContentEl = document.getElementById('resultContent');
    
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
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...';
        
        // Show loading indicator with animation
        loadingEl.style.opacity = '0';
        loadingEl.style.display = 'block';
        setTimeout(() => {
            loadingEl.style.opacity = '1';
            loadingEl.style.transition = 'opacity 0.3s ease';
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
        }, 12000); // Update every 12 seconds to roughly match actual processing time
        
        // Collect form data
        const formData = new FormData(this);
        
        // Send data to the server
        fetch('/prepare_meeting', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'An unknown error occurred');
                });
            }
            return response.json();
        })
        .then(data => {
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
                    // Parse markdown to HTML (simplified version as fallback)
                    let html = data.result.replace(/\n/g, '<br>');
                    html = html.replace(/^# (.*)/gm, '<h1>$1</h1>');
                    html = html.replace(/^## (.*)/gm, '<h2>$1</h2>');
                    html = html.replace(/^### (.*)/gm, '<h3>$1</h3>');
                    html = html.replace(/\*\*(.*)\*\*/gm, '<strong>$1</strong>');
                    html = html.replace(/\*(.*)\*/gm, '<em>$1</em>');
                    
                    resultContentEl.innerHTML = html;
                }
                
                // Add copy button to each section
                addCopyButtons();
            }, 300);
            
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Meeting Materials';
        })
        .catch(error => {
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
                    <div class="alert alert-danger" role="alert">
                        <h4><i class="fas fa-exclamation-circle me-2"></i>Error</h4>
                        <p>${error.message}</p>
                        <p>Please check that you've set up the required API keys in your .env file.</p>
                    </div>
                `;
                
                console.error('Error:', error);
                
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Meeting Materials';
            }, 300);
        });
    });
    
    // Function to add copy buttons to each section
    function addCopyButtons() {
        const headings = resultContentEl.querySelectorAll('h2');
        headings.forEach(heading => {
            // Create copy section button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn btn-sm btn-outline-secondary ms-2';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = 'Copy section';
            copyBtn.style.fontSize = '0.8rem';
            copyBtn.style.padding = '0.2rem 0.5rem';
            
            // Insert after heading text
            heading.appendChild(copyBtn);
            
            // Get content to copy (everything between this h2 and the next h2)
            copyBtn.addEventListener('click', function() {
                let content = heading.outerHTML;
                let nextEl = heading.nextElementSibling;
                
                while (nextEl && nextEl.tagName !== 'H2') {
                    content += nextEl.outerHTML;
                    nextEl = nextEl.nextElementSibling;
                }
                
                // Create temporary textarea to copy content
                const textarea = document.createElement('textarea');
                textarea.value = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                
                // Show copied feedback
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.classList.add('btn-success');
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.remove('btn-success');
                }, 2000);
            });
        });
    }
});