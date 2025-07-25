// Smart Form Assistant - Welcome Page Script

// Handle button clicks
document.getElementById('setupProfile').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('profile.html') });
  window.close();
});

document.getElementById('openExtension').addEventListener('click', (e) => {
  e.preventDefault();
  // This might not work as intended since opening a popup programmatically is restricted.
  // The user should click the extension icon. We can guide them.
  alert("Please click the Smart Form Assistant icon in your browser's toolbar to open the extension.");
  window.close();
});

document.getElementById('closeWelcome').addEventListener('click', () => {
  window.close();
});

// Add some interactive animations
const features = document.querySelectorAll('.feature');
features.forEach((feature, index) => {
  feature.style.animationDelay = `${index * 0.1}s`;
  feature.style.animation = 'fadeInUp 0.6s ease-out forwards';
});

const steps = document.querySelectorAll('.step');
steps.forEach((step, index) => {
  step.style.animationDelay = `${index * 0.1 + 0.3}s`;
  step.style.animation = 'fadeInUp 0.6s ease-out forwards';
});
