// Smart Form Assistant - Enhanced Popup Script with ML Features
document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    // Basic stats
    formsCount: document.getElementById('formsCount'),
    templatesCount: document.getElementById('templatesCount'),
    profileCount: document.getElementById('profileCount'),
    
    // ML stats
    sessionsCount: document.getElementById('sessionsCount'),
    interactionsCount: document.getElementById('interactionsCount'),
    formTypesCount: document.getElementById('formTypesCount'),
    fieldTypesLearned: document.getElementById('fieldTypesLearned'),
    accuracyScore: document.getElementById('accuracyScore'),
    progressPercent: document.getElementById('progressPercent'),
    progressFill: document.getElementById('progressFill'),
    
    // Controls
    extensionToggle: document.getElementById('extensionToggle'),
    learningToggle: document.getElementById('learningToggle'),
    learningIndicator: document.getElementById('learningIndicator'),
    
    // Buttons
    startLearning: document.getElementById('startLearning'),
    editProfile: document.getElementById('editProfile'),
    exportData: document.getElementById('exportData'),
    exportMLData: document.getElementById('exportMLData'),
    importData: document.getElementById('importData'),
    clearData: document.getElementById('clearData'),
    
    // UI feedback
    loading: document.getElementById('loading'),
    successMessage: document.getElementById('successMessage'),
    errorMessage: document.getElementById('errorMessage'),
    fileInput: document.getElementById('fileInput')
  };

  let isEnabled = true;
  let learningMode = true;
  let currentTab = null;

  // Wait for auth to be fully ready
  async function waitForAuth() {
    return new Promise((resolve) => {
      const checkAuth = async () => {
        if (window.popupAuth) {
          await window.popupAuth.initialized;
          resolve();
        } else {
          setTimeout(checkAuth, 50);
        }
      };
      checkAuth();
    });
  }

  await waitForAuth();

  // Make initializePopup available globally for auth refresh
  window.initializePopup = initializePopup;
  await initializePopup();

  // Event listeners
  elements.extensionToggle.addEventListener('click', toggleExtension);
  elements.learningToggle.addEventListener('click', toggleLearningMode);
  elements.startLearning.addEventListener('click', startLearningMode);
  elements.editProfile.addEventListener('click', openProfileEditor);
  elements.exportData.addEventListener('click', exportUserData);
  elements.exportMLData.addEventListener('click', exportMLData);
  elements.importData.addEventListener('click', () => elements.fileInput.click());
  elements.clearData.addEventListener('click', clearAllData);
  elements.fileInput.addEventListener('change', importUserData);

  // Auto-refresh stats every 5 seconds
  setInterval(updateMLStats, 5000);

  async function initializePopup() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;
      
      if (tab) {
        try {
          const stats = await chrome.tabs.sendMessage(tab.id, { action: 'getStats' });
          if (stats) {
            elements.formsCount.textContent = stats.formsDetected || 0;
          }
        } catch (e) {
          console.warn("Could not get stats from content script");
          elements.formsCount.textContent = 'N/A';
        }
      }
      
      // Get storage data
      const storage = await chrome.storage.local.get([
        'isEnabled', 
        'userProfile', 
        'formTemplates', 
        'interactionData',
        'settings'
      ]);
      
      // Update basic UI
      elements.templatesCount.textContent = Object.keys(storage.formTemplates || {}).length;
      elements.profileCount.textContent = Object.keys(storage.userProfile || {}).length;
      
      isEnabled = storage.isEnabled !== false;
      elements.extensionToggle.classList.toggle('active', isEnabled);
      
      learningMode = storage.settings?.learningEnabled !== false;
      elements.learningToggle.classList.toggle('active', learningMode);
      
      // Update ML stats
      await updateMLStats();
      
    } catch (error) {
      console.error('Error initializing popup:', error);
      showError('Could not connect to the current page');
    }
  }

  async function updateMLStats() {
    try {
      // Get ML statistics from background script
      const mlStats = await chrome.runtime.sendMessage({ action: 'getMLStats' });
      
      if (mlStats && !mlStats.error) {
        elements.sessionsCount.textContent = mlStats.totalSessions || 0;
        elements.interactionsCount.textContent = mlStats.totalInteractions || 0;
        elements.formTypesCount.textContent = mlStats.uniqueForms || 0;
        elements.fieldTypesLearned.textContent = mlStats.fieldTypesLearned || 0;
        
        // Calculate and display progress
        const progress = calculateLearningProgress(mlStats);
        elements.progressPercent.textContent = `${progress}%`;
        elements.progressFill.style.width = `${progress}%`;
        
        // Calculate accuracy score (simplified)
        const accuracy = calculateAccuracyScore(mlStats);
        elements.accuracyScore.textContent = `${accuracy}%`;
        
        // Show learning indicator if active
        if (mlStats.totalSessions > 0 && learningMode) {
          elements.learningIndicator.classList.add('active');
        } else {
          elements.learningIndicator.classList.remove('active');
        }
      }
    } catch (error) {
      console.error('Error updating ML stats:', error);
    }
  }

  function calculateLearningProgress(stats) {
    // Simple progress calculation based on data collected
    const sessions = stats.totalSessions || 0;
    const interactions = stats.totalInteractions || 0;
    const uniqueForms = stats.uniqueForms || 0;
    
    // Target: 10 sessions, 100 interactions, 5 unique forms for basic training
    const sessionProgress = Math.min((sessions / 10) * 100, 100);
    const interactionProgress = Math.min((interactions / 100) * 100, 100);
    const formProgress = Math.min((uniqueForms / 5) * 100, 100);
    
    return Math.round((sessionProgress + interactionProgress + formProgress) / 3);
  }

  function calculateAccuracyScore(stats) {
    // Simplified accuracy based on field types learned vs interactions
    const fieldTypes = stats.fieldTypesLearned || 0;
    const interactions = stats.totalInteractions || 0;
    
    if (interactions === 0) return 0;
    
    // Higher score when we've learned more field types relative to interactions
    const accuracy = Math.min((fieldTypes / Math.max(interactions / 10, 1)) * 100, 100);
    return Math.round(accuracy);
  }

  async function toggleExtension() {
    try {
      isEnabled = !isEnabled;
      elements.extensionToggle.classList.toggle('active', isEnabled);
      
      await chrome.storage.local.set({ isEnabled });
      
      if (currentTab) {
        await chrome.tabs.sendMessage(currentTab.id, { 
          action: 'toggleExtension', 
          enabled: isEnabled 
        });
      }
      
      showSuccess(isEnabled ? 'Extension enabled' : 'Extension disabled');
      
    } catch (error) {
      console.error('Error toggling extension:', error);
      showError('Could not toggle extension');
      elements.extensionToggle.classList.toggle('active', !isEnabled);
      isEnabled = !isEnabled;
    }
  }

  async function toggleLearningMode() {
    try {
      learningMode = !learningMode;
      elements.learningToggle.classList.toggle('active', learningMode);
      
      // Update settings
      const storage = await chrome.storage.local.get(['settings']);
      const settings = storage.settings || {};
      settings.learningEnabled = learningMode;
      await chrome.storage.local.set({ settings });
      
      // Update indicator
      if (learningMode) {
        elements.learningIndicator.classList.add('active');
      } else {
        elements.learningIndicator.classList.remove('active');
      }
      
      showSuccess(learningMode ? 'Learning mode enabled' : 'Learning mode disabled');
      
    } catch (error) {
      console.error('Error toggling learning mode:', error);
      showError('Could not toggle learning mode');
      elements.learningToggle.classList.toggle('active', !learningMode);
      learningMode = !learningMode;
    }
  }

  async function startLearningMode() {
    try {
      showLoading(true);
      
      if (!currentTab) {
        throw new Error('No active tab found');
      }
      
      const response = await chrome.tabs.sendMessage(currentTab.id, { 
        action: 'startManualLearning' 
      });
      
      if (response && response.success) {
        showSuccess(`Learning mode activated on ${response.formsFound} forms`);
        elements.learningIndicator.classList.add('active');
        
        // Refresh stats after a delay
        setTimeout(updateMLStats, 2000);
      } else {
        showError('No forms found on this page to learn from');
      }
      
    } catch (error) {
      console.error('Error starting learning mode:', error);
      showError('Could not activate learning mode');
    } finally {
      showLoading(false);
    }
  }

  function openProfileEditor() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('profile.html')
    });
    window.close();
  }

  async function exportUserData() {
    try {
      showLoading(true);
      
      const response = await chrome.runtime.sendMessage({ action: 'exportData' });
      
      if (response.success) {
        downloadFile(response.data, `smart-form-assistant-backup-${getDateString()}.json`);
        showSuccess('Data exported successfully');
      } else {
        showError(response.error || 'Export failed');
      }
      
    } catch (error) {
      console.error('Error exporting data:', error);
      showError('Could not export data');
    } finally {
      showLoading(false);
    }
  }

  async function exportMLData() {
    try {
      showLoading(true);
      
      const response = await chrome.runtime.sendMessage({ action: 'exportMLData' });
      
      if (response.success) {
        downloadFile(response.data, `smart-form-assistant-ml-data-${getDateString()}.json`);
        showSuccess('ML training data exported successfully');
      } else {
        showError(response.error || 'ML export failed');
      }
      
    } catch (error) {
      console.error('Error exporting ML data:', error);
      showError('Could not export ML data');
    } finally {
      showLoading(false);
    }
  }

  async function importUserData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      showLoading(true);
      
      const text = await file.text();
      const response = await chrome.runtime.sendMessage({ 
        action: 'importData', 
        data: text 
      });
      
      if (response.success) {
        showSuccess('Data imported successfully');
        setTimeout(() => {
          initializePopup();
          updateMLStats();
        }, 1000);
      } else {
        showError(response.error || 'Import failed');
      }
      
    } catch (error) {
      console.error('Error importing data:', error);
      showError('Could not import data');
    } finally {
      showLoading(false);
      event.target.value = '';
    }
  }

  async function clearAllData() {
    const confirmed = confirm(
      'Are you sure you want to clear all data?\n\n' +
      'This will delete:\n' +
      '• Your profile information\n' +
      '• All learned form templates\n' +
      '• All ML training data\n' +
      '• Cloud sync data\n\n' +
      'This action cannot be undone.'
    );
    
    if (!confirmed) return;

    try {
      showLoading(true);
      
      const response = await chrome.runtime.sendMessage({ action: 'clearAllData' });
      
      if (response.success) {
        showSuccess('All data cleared successfully');
        
        // Reset all displays
        elements.formsCount.textContent = '0';
        elements.templatesCount.textContent = '0';
        elements.profileCount.textContent = '0';
        elements.sessionsCount.textContent = '0';
        elements.interactionsCount.textContent = '0';
        elements.formTypesCount.textContent = '0';
        elements.fieldTypesLearned.textContent = '0';
        elements.accuracyScore.textContent = '0';
        elements.progressPercent.textContent = '0%';
        elements.progressFill.style.width = '0%';
        elements.learningIndicator.classList.remove('active');
        
      } else {
        showError(response.error || 'Clear failed');
      }
      
    } catch (error) {
      console.error('Error clearing data:', error);
      showError('Could not clear data');
    } finally {
      showLoading(false);
    }
  }

  // Utility functions
  function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  function getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  function showLoading(show) {
    elements.loading.style.display = show ? 'block' : 'none';
  }

  function showSuccess(message) {
    hideMessages();
    elements.successMessage.textContent = message;
    elements.successMessage.style.display = 'block';
    setTimeout(hideMessages, 3000);
  }

  function showError(message) {
    hideMessages();
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
    setTimeout(hideMessages, 5000);
  }

  function hideMessages() {
    elements.successMessage.style.display = 'none';
    elements.errorMessage.style.display = 'none';
  }
});
