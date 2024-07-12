let isReplacing = false;
let intervalId = null;
let replacementText = '';
let uploadedImageUrl = '';

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'startReplacing' && !isReplacing) {
    isReplacing = true;
    replacementText = message.text;
    uploadedImageUrl = message.imageUrl;

    // Start replacing text and images every second
    intervalId = setInterval(function() {
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.executeScript(tab.id, {
            code: `
              // Replace text
              const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, td, th, strong, em, b, i, u, blockquote, q');
              elements.forEach(element => {
                element.textContent = "${replacementText}";
              });
              // Replace images
              const images = document.querySelectorAll('img');
              images.forEach(image => {
                image.src = "${uploadedImageUrl}";
              });
            `
          });
        });
      });
    }, 1000); // Replace text and images every second

/* a, li, td, th, strong, em, b, i, u, blockquote, q');*/

    sendResponse({ message: 'Text and image replacement started.' });
  } else if (message.action === 'stopReplacing' && isReplacing) {
    clearInterval(intervalId);
    isReplacing = false;
    replacementText = '';
    uploadedImageUrl = '';
    sendResponse({ message: 'Text and image replacement stopped.' });
  }
  
  // Keep the message channel open for async response
  return true;
});
