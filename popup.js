document.addEventListener('DOMContentLoaded', function() {
  const replaceButton = document.getElementById('replaceButton');
  const replaceTextElement = document.getElementById('replaceText');
  const uploadImageElement = document.getElementById('uploadImage');
  const uploadedImageContainer = document.getElementById('uploadedImageContainer');
  const uploadedImagePreview = document.getElementById('uploadedImagePreview');
  let isReplacing = false;
  let uploadedImageUrl = '';

  // Load saved state, text, and image from storage
  chrome.storage.local.get(['replacementText', 'isReplacing', 'uploadedImageUrl'], function(result) {
    if (result.replacementText) {
      replaceTextElement.value = result.replacementText;
    }
    if (result.isReplacing) {
      isReplacing = result.isReplacing;
      updateButtonState(isReplacing);
    }
    if (result.uploadedImageUrl) {
      uploadedImageUrl = result.uploadedImageUrl;
      updateUploadButtonText(true);
      displayUploadedImage(uploadedImageUrl);
    }
  });

  replaceButton.addEventListener('click', function() {
    const replaceText = replaceTextElement.value;

    if (!isReplacing) {
      // Send message to background script to start replacing
      chrome.runtime.sendMessage({ action: 'startReplacing', text: replaceText, imageUrl: uploadedImageUrl }, function(response) {
        console.log(response.message); // Optional: Log response from background script
      });

      isReplacing = true;
    } else {
      // Send message to background script to stop replacing
      chrome.runtime.sendMessage({ action: 'stopReplacing' }, function(response) {
        console.log(response.message); // Optional: Log response from background script
      });

      isReplacing = false;

      // Reload the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.reload(tabs[0].id);
      });
    }

    // Save state and text to storage
    chrome.storage.local.set({ 'replacementText': replaceText, 'isReplacing': isReplacing });

    // Update button state
    updateButtonState(isReplacing);
  });

  uploadImageElement.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        uploadedImageUrl = e.target.result;
        // Save image URL to storage
        chrome.storage.local.set({ 'uploadedImageUrl': uploadedImageUrl });
        // Update upload button text
        updateUploadButtonText(true);
        // Display uploaded image
        displayUploadedImage(uploadedImageUrl);
      };
      reader.readAsDataURL(file);
    }
  });

  function updateButtonState(isReplacing) {
    if (isReplacing) {
      replaceButton.textContent = 'Stop Replacing Text + Images';
      replaceButton.classList.remove('startButton');
      replaceButton.classList.add('stopButton');
    } else {
      replaceButton.textContent = 'Start Replacing Text + Images';
      replaceButton.classList.remove('stopButton');
      replaceButton.classList.add('startButton');
    }
  }

  function updateUploadButtonText(isImageUploaded) {
    const uploadLabel = document.getElementById('uploadLabel').querySelector('span');
    uploadLabel.textContent = isImageUploaded ? 'Image Uploaded - Click To Upload Another' : 'Upload Image you want to replace everything with';
  }

  function displayUploadedImage(imageUrl) {
    uploadedImagePreview.src = imageUrl;
    uploadedImageContainer.style.display = 'block';
  }

});
