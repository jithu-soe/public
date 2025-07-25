// Smart Form Assistant - Profile Management Script
document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('profileForm');
  const clearButton = document.getElementById('clearProfile');
  const backButton = document.getElementById('backToPopup');
  const loading = document.getElementById('loading');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  
  // Stat elements
  const profileFieldsCount = document.getElementById('profileFieldsCount');
  const formsFilledCount = document.getElementById('formsFilledCount');
  const templatesCount = document.getElementById('templatesCount');

  // Field mappings for auto-save
  const fieldMappings = {
    firstName: 'firstName',
    lastName: 'lastName',
    fullName: 'fullName',
    email: 'email',
    phone: 'phone',
    dateOfBirth: 'dateOfBirth',
    address: 'address',
    city: 'city',
    state: 'state',
    zipCode: 'zipCode',
    country: 'country',
    university: 'university',
    degree: 'degree',
    gpa: 'gpa',
    portfolio: 'portfolio',
    linkedin: 'linkedin',
    experience: 'experience',
    coverLetter: 'coverLetter'
  };

  // Initialize page
  await loadProfile();
  setupEventListeners();

  async function loadProfile() {
    try {
      showLoading(true);
      
      // Load user profile and stats
      const data = await chrome.storage.local.get(['userProfile', 'formTemplates']);
      const userProfile = data.userProfile || {};
      const formTemplates = data.formTemplates || {};
      
      // Populate form fields
      Object.entries(fieldMappings).forEach(([fieldId, profileKey]) => {
        const element = document.getElementById(fieldId);
        if (element && userProfile[profileKey]) {
          element.value = userProfile[profileKey];
        }
      });

      // Update stats
      updateStats(userProfile, formTemplates);
      
      showSuccess('Profile loaded successfully');
      
    } catch (error) {
      console.error('Error loading profile:', error);
      showError('Failed to load profile data');
    } finally {
      showLoading(false);
    }
  }

  function updateStats(userProfile, formTemplates) {
    const profileFields = Object.keys(userProfile).length;
    const templates = Object.keys(formTemplates).length;
    const formsUsed = Object.values(formTemplates).reduce((sum, template) => sum + (template.usage || 0), 0);

    profileFieldsCount.textContent = profileFields;
    templatesCount.textContent = templates;
    formsFilledCount.textContent = formsUsed;
  }

  function setupEventListeners() {
    // Form submission
    form.addEventListener('submit', saveProfile);
    
    // Clear profile
    clearButton.addEventListener('click', clearProfile);
    
    // Back to popup
    backButton.addEventListener('click', () => {
      window.close();
    });

    // Auto-save on field changes (debounced)
    let saveTimeout;
    Object.keys(fieldMappings).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.addEventListener('input', () => {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(autoSave, 1000); // Save after 1 second of inactivity
        });
      }
    });

    // Auto-generate full name from first and last name
    const firstNameField = document.getElementById('firstName');
    const lastNameField = document.getElementById('lastName');
    const fullNameField = document.getElementById('fullName');

    function updateFullName() {
      const firstName = firstNameField.value.trim();
      const lastName = lastNameField.value.trim();
      if (firstName && lastName && !fullNameField.value) {
        fullNameField.value = `${firstName} ${lastName}`;
      }
    }

    firstNameField.addEventListener('blur', updateFullName);
    lastNameField.addEventListener('blur', updateFullName);
  }

  async function saveProfile(event) {
    event.preventDefault();
    
    try {
      showLoading(true);
      
      // Collect form data
      const userProfile = {};
      Object.entries(fieldMappings).forEach(([fieldId, profileKey]) => {
        const element = document.getElementById(fieldId);
        if (element && element.value.trim()) {
          userProfile[profileKey] = element.value.trim();
        }
      });

      // Save to storage
      await chrome.storage.local.set({ userProfile });
      
      // Update stats
      const data = await chrome.storage.local.get(['formTemplates']);
      updateStats(userProfile, data.formTemplates || {});
      
      showSuccess('Profile saved successfully! Your information will now be used for smart auto-filling.');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Failed to save profile. Please try again.');
    } finally {
      showLoading(false);
    }
  }

  async function autoSave() {
    try {
      // Collect current form data
      const userProfile = {};
      Object.entries(fieldMappings).forEach(([fieldId, profileKey]) => {
        const element = document.getElementById(fieldId);
        if (element && element.value.trim()) {
          userProfile[profileKey] = element.value.trim();
        }
      });

      // Save to storage
      await chrome.storage.local.set({ userProfile });
      
      // Show brief success indicator
      const currentSuccess = successMessage.style.display;
      if (currentSuccess !== 'block') {
        showSuccess('Auto-saved', 1000);
      }
      
    } catch (error) {
      console.error('Error auto-saving profile:', error);
    }
  }

  async function clearProfile() {
    if (!confirm('Are you sure you want to clear your entire profile? This action cannot be undone.')) {
      return;
    }

    try {
      showLoading(true);
      
      // Clear form
      form.reset();
      
      // Clear storage
      await chrome.storage.local.set({ userProfile: {} });
      
      // Update stats
      updateStats({}, {});
      
      showSuccess('Profile cleared successfully');
      
    } catch (error) {
      console.error('Error clearing profile:', error);
      showError('Failed to clear profile');
    } finally {
      showLoading(false);
    }
  }

  function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
  }

  function showSuccess(message, duration = 3000) {
    hideMessages();
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    setTimeout(hideMessages, duration);
  }

  function showError(message, duration = 5000) {
    hideMessages();
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(hideMessages, duration);
  }

  function hideMessages() {
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
  }

  // Validation helpers
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^[\+]?[\d\s\-\(\)]{10,}$/.test(phone);
  }

  function validateURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Add real-time validation
  document.getElementById('email').addEventListener('blur', function() {
    if (this.value && !validateEmail(this.value)) {
      this.style.borderColor = '#f56565';
      showError('Please enter a valid email address', 2000);
    } else {
      this.style.borderColor = '#e2e8f0';
    }
  });

  document.getElementById('phone').addEventListener('blur', function() {
    if (this.value && !validatePhone(this.value)) {
      this.style.borderColor = '#f56565';
      showError('Please enter a valid phone number', 2000);
    } else {
      this.style.borderColor = '#e2e8f0';
    }
  });

  ['portfolio', 'linkedin'].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('blur', function() {
      if (this.value && !validateURL(this.value)) {
        this.style.borderColor = '#f56565';
        showError('Please enter a valid URL', 2000);
      } else {
        this.style.borderColor = '#e2e8f0';
      }
    });
  });
});