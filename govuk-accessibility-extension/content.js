// Store original HTML and language state
let originalHtml = null;
let currentLanguage = null;

// Function to translate text content of an element
async function translateText(text, targetLang) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data[0].map(x => x[0]).join('');
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

// Function to process node for translation
async function translateNode(node, targetLang) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const originalText = node.textContent.trim();
        if (originalText) {
            const translatedText = await translateText(originalText, targetLang);
            node.textContent = translatedText;
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Skip script tags and elements with 'notranslate' class
        if (node.tagName === 'SCRIPT' || 
            node.classList.contains('notranslate') ||
            node.getAttribute('translate') === 'no') {
            return;
        }
        
        // Translate alt text for images
        if (node.tagName === 'IMG' && node.alt) {
            node.alt = await translateText(node.alt, targetLang);
        }
        
        // Translate placeholder text
        if (node.placeholder) {
            node.placeholder = await translateText(node.placeholder, targetLang);
        }
        
        // Process child nodes
        for (const child of Array.from(node.childNodes)) {
            await translateNode(child, targetLang);
        }
    }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received:', request);

    if (request.action === 'toggleContrast') {
        document.body.classList.toggle('high-contrast');
        sendResponse({success: true});
    } 
    else if (request.action === 'toggleDyslexicFont') {
        document.body.classList.toggle('dyslexic-font');
        sendResponse({success: true});
    }
    else if (request.action === 'adjustFontSize') {
        const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, li, td, th, label, input, button, .govuk-body, .govuk-heading-xl, .govuk-heading-l, .govuk-heading-m, .govuk-heading-s, .govuk-body-l, .govuk-body-m, .govuk-body-s');
        
        elements.forEach(element => {
            const computedSize = window.getComputedStyle(element).fontSize;
            const currentSize = parseFloat(computedSize);
            const newSize = request.increase ? 
                (currentSize * 1.1) : 
                (currentSize * 0.9);
            element.style.setProperty('font-size', `${newSize}px`, 'important');
        });

        const currentScale = parseFloat(document.body.getAttribute('data-font-scale') || '1.0');
        const newScale = request.increase ? (currentScale * 1.1) : (currentScale * 0.9);
        document.body.setAttribute('data-font-scale', newScale.toString());
        
        sendResponse({success: true});
    }
    else if (request.action === 'translatePage') {
        // Store original HTML if not already stored
        if (!originalHtml) {
            originalHtml = document.documentElement.innerHTML;
        }

        currentLanguage = request.language;
        
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'translation-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00703c;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        loadingDiv.textContent = 'Translating page...';
        document.body.appendChild(loadingDiv);

        // Set language attribute
        document.documentElement.lang = currentLanguage;

        // Translate the page content
        translateNode(document.body, currentLanguage)
            .then(() => {
                loadingDiv.style.background = '#00703c';
                loadingDiv.textContent = 'Translation complete!';
                setTimeout(() => loadingDiv.remove(), 2000);
                sendResponse({success: true});
            })
            .catch(error => {
                console.error('Translation error:', error);
                loadingDiv.style.background = '#d4351c';
                loadingDiv.textContent = 'Translation failed!';
                setTimeout(() => loadingDiv.remove(), 2000);
                sendResponse({success: false, error: error.message});
            });

        // Return true to indicate we'll send the response asynchronously
        return true;
    }
    else if (request.action === 'restoreOriginal') {
        if (originalHtml) {
            document.documentElement.innerHTML = originalHtml;
            document.documentElement.lang = 'en';
            originalHtml = null;
            currentLanguage = null;

            // Reinitialize accessibility features
            document.body.classList.add('govuk-accessibility');
            document.body.setAttribute('data-font-scale', '1.0');
        }
        sendResponse({success: true});
    }
});

// Initialize accessibility features
document.body.classList.add('govuk-accessibility');
document.body.setAttribute('data-font-scale', '1.0');
console.log('Accessibility features initialized');
