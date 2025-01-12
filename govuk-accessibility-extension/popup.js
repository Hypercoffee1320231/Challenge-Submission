function sendMessage(message) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error:', chrome.runtime.lastError);
                } else {
                    console.log('Action completed successfully');
                }
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Existing accessibility controls
    document.getElementById('toggle-contrast').addEventListener('click', function() {
        sendMessage({action: 'toggleContrast'});
    });

    document.getElementById('toggle-dyslexic-font').addEventListener('click', function() {
        sendMessage({action: 'toggleDyslexicFont'});
    });

    document.getElementById('increase-font').addEventListener('click', function() {
        sendMessage({action: 'adjustFontSize', increase: true});
    });

    document.getElementById('decrease-font').addEventListener('click', function() {
        sendMessage({action: 'adjustFontSize', increase: false});
    });

    // Language controls
    const languageSelector = document.getElementById('language-selector');
    const translateButton = document.getElementById('translate-page');
    const restoreButton = document.getElementById('restore-original');

    languageSelector.addEventListener('change', function() {
        translateButton.disabled = !this.value;
    });

    translateButton.addEventListener('click', function() {
        const selectedLanguage = languageSelector.value;
        if (selectedLanguage) {
            sendMessage({
                action: 'translatePage',
                language: selectedLanguage
            });
        }
    });

    restoreButton.addEventListener('click', function() {
        sendMessage({action: 'restoreOriginal'});
        languageSelector.value = '';
        translateButton.disabled = true;
    });
});
