// Smart Form Assistant - Enhanced Background Script with ML Data Handling

// Import Supabase client
importScripts('supabase-client.js');

// --- Top-Level Event Listeners ---

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[SFA Background] Enhanced extension installed/updated.');
  
  if (details.reason === 'install') {
    chrome.storage.local.set({
      isEnabled: true,
      settings: {
        autoFillEnabled: true,
        suggestionsEnabled: true,
        learningEnabled: true,
        dataCollectionEnabled: true // New setting for ML data collection
      }
    });
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }

  setupContextMenus();
  setupAlarms();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'dataUpdated':
      console.log('[SFA Background] Received data update notification - syncing...');
      handleDataSync();
      break;
      
    case 'getTabStats':
      handleGetTabStats(sender.tab.id, sendResponse);
      return true;
      
    case 'clearAllData':
      handleClearAllData().then(sendResponse);
      return true;
      
    case 'exportData':
      handleExportData().then(sendResponse);
      return true;
      
    case 'exportMLData':
      handleExportMLData().then(sendResponse);
      return true;
      
    case 'importData':
      handleImportData(message.data).then(sendResponse);
      return true;
      
    case 'getMLStats':
      handleGetMLStats().then(sendResponse);
      return true;
      
    case 'processMLData':
      handleProcessMLData().then(sendResponse);
      return true;
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'fillField') {
    chrome.tabs.sendMessage(tab.id, { 
      action: 'autoFillField', 
      elementId: info.targetElementId 
    });
  } else if (info.menuItemId === 'saveField') {
    chrome.tabs.sendMessage(tab.id, { 
      action: 'saveFieldValue', 
      elementId: info.targetElementId 
    });
  } else if (info.menuItemId === 'startLearning') {
    chrome.tabs.sendMessage(tab.id, { action: 'startManualLearning' });
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyCleanup') {
    console.log('[SFA Background] Running daily data cleanup.');
    handleDailyCleanup();
  } else if (alarm.name === 'mlDataProcessing') {
    console.log('[SFA Background] Processing ML data for insights.');
    handleMLDataProcessing();
  }
});

// --- Badge Management Logic ---
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  updateBadgeForTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    updateBadgeForTab(tabId);
  }
});

async function updateBadgeForTab(tabId) {
  try {
    const stats = await chrome.tabs.sendMessage(tabId, { action: 'getStats' });
    if (stats && stats.formsDetected > 0) {
      chrome.action.setBadgeText({ 
        text: stats.formsDetected.toString(), 
        tabId: tabId 
      });
      chrome.action.setBadgeBackgroundColor({ 
        color: '#4CAF50', 
        tabId: tabId 
      });
    } else {
      chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
  } catch (error) {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
  }
}

// --- Enhanced Data Handling & ML Functions ---

async function handleGetTabStats(tabId, sendResponse) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'getStats' });
    sendResponse(response);
  } catch (error) {
    sendResponse({ error: 'Could not get stats from the current tab.' });
  }
}

/**
 * Enhanced data sync including ML training data
 */
async function handleDataSync() {
  if (!supabase || !supabase.isAuthenticated()) return;

  try {
    const { userProfile, formTemplates, interactionData } = await chrome.storage.local.get([
      'userProfile', 
      'formTemplates', 
      'interactionData'
    ]);
    const userId = supabase.user.id;

    // Sync user profile
    if (userProfile && Object.keys(userProfile).length > 0) {
      const { error } = await supabase.from('user_profiles').upsert({
        user_id: userId,
        updated_at: new Date(),
        ...userProfile
      });
      if (error) throw error;
      console.log('[SFA Background] User profile synced to Supabase.');
    }

    // Sync form templates
    if (formTemplates && Object.keys(formTemplates).length > 0) {
      const templatesToSync = Object.entries(formTemplates).map(([key, data]) => ({
        user_id: userId,
        template_key: key,
        fields: data.fields,
        created: data.created || new Date(),
        last_used: data.lastUsed || new Date(),
        updated_at: new Date(),
      }));
      
      const { error } = await supabase.from('form_templates').upsert(
        templatesToSync, 
        { onConflict: 'user_id, template_key' }
      );
      if (error) throw error;
      console.log(`[SFA Background] ${templatesToSync.length} form templates synced.`);
    }

    // NEW: Sync ML training data (anonymized)
    if (interactionData && Object.keys(interactionData).length > 0) {
      await syncMLTrainingData(userId, interactionData);
    }

  } catch (error) {
    console.error('[SFA Background] Error during sync:', error);
  }
}

/**
 * NEW: Sync ML training data to Supabase for model training
 */
async function syncMLTrainingData(userId, interactionData) {
  try {
    const trainingRecords = [];
    
    // Process each form's interaction sessions
    for (const [templateKey, sessions] of Object.entries(interactionData)) {
      for (const session of sessions) {
        // Create anonymized training records from interactions
        for (const interaction of session.interactions) {
          const trainingRecord = {
            user_id: userId, // For user's own data tracking
            session_id: session.sessionId,
            template_key: templateKey,
            interaction_type: interaction.actionType,
            
            // Anonymized form structure data (this is the key ML training data)
            html_context: interaction.htmlContext,
            dom_path: interaction.domPath,
            element_tag: interaction.tagName,
            element_type: interaction.elementType,
            
            // Field semantics (anonymized)
            field_label: interaction.label,
            field_placeholder: interaction.placeholder,
            predicted_field_type: interaction.predictedFieldType,
            
            // Behavioral patterns (no personal data)
            time_to_fill: interaction.timeToFill,
            keystroke_count: interaction.keystrokes,
            form_position: interaction.formPosition,
            
            // Context data for ML
            parent_context: interaction.parentContext,
            nearby_elements: interaction.nearbyElements,
            
            // Metadata
            timestamp: new Date(interaction.timestamp),
            created_at: new Date()
          };
          
          trainingRecords.push(trainingRecord);
        }
      }
    }

    if (trainingRecords.length > 0) {
      // Insert in batches to avoid large requests
      const batchSize = 100;
      for (let i = 0; i < trainingRecords.length; i += batchSize) {
        const batch = trainingRecords.slice(i, i + batchSize);
        const { error } = await supabase.from('ml_training_data').insert(batch);
        if (error) throw error;
      }
      
      console.log(`[SFA Background] Synced ${trainingRecords.length} ML training records.`);
    }
  } catch (error) {
    console.error('[SFA Background] Error syncing ML data:', error);
  }
}

/**
 * NEW: Export ML training data for external processing
 */
async function handleExportMLData() {
  try {
    const { interactionData, formTemplates } = await chrome.storage.local.get([
      'interactionData', 
      'formTemplates'
    ]);

    if (!interactionData || Object.keys(interactionData).length === 0) {
      return {
        success: false,
        error: 'No ML training data available'
      };
    }

    // Process and format the data for ML training
    const mlDataset = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        totalSessions: Object.values(interactionData).reduce((sum, sessions) => sum + sessions.length, 0),
        totalInteractions: Object.values(interactionData).reduce((sum, sessions) => 
          sum + sessions.reduce((sessionSum, session) => sessionSum + session.interactions.length, 0), 0
        ),
        uniqueForms: Object.keys(interactionData).length
      },
      
      // Training features and labels
      trainingData: [],
      
      // Form templates for reference
      formTemplates: formTemplates || {}
    };

    // Convert interaction data to ML training format
    for (const [templateKey, sessions] of Object.entries(interactionData)) {
      for (const session of sessions) {
        for (const interaction of session.interactions) {
          const trainingExample = {
            // Input features (what the ML model will use to make predictions)
            features: {
              htmlContext: interaction.htmlContext,
              domPath: interaction.domPath,
              elementTag: interaction.tagName,
              elementType: interaction.elementType,
              fieldLabel: interaction.label,
              fieldPlaceholder: interaction.placeholder,
              parentContext: interaction.parentContext,
              nearbyElements: interaction.nearbyElements,
              formPosition: interaction.formPosition
            },
            
            // Target labels (what the ML model should predict)
            labels: {
              fieldType: interaction.predictedFieldType,
              actionType: interaction.actionType,
              interactionOrder: interaction.relativeTime
            },
            
            // Metadata
            metadata: {
              templateKey,
              sessionId: session.sessionId,
              timestamp: interaction.timestamp,
              timeToFill: interaction.timeToFill,
              keystrokeCount: interaction.keystrokes
            }
          };
          
          mlDataset.trainingData.push(trainingExample);
        }
      }
    }

    return {
      success: true,
      data: JSON.stringify(mlDataset, null, 2)
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * NEW: Get ML statistics
 */
async function handleGetMLStats() {
  try {
    const { interactionData } = await chrome.storage.local.get(['interactionData']);
    
    if (!interactionData) {
      return {
        totalSessions: 0,
        totalInteractions: 0,
        uniqueForms: 0,
        fieldTypesLearned: 0
      };
    }

    const stats = {
      totalSessions: Object.values(interactionData).reduce((sum, sessions) => sum + sessions.length, 0),
      totalInteractions: Object.values(interactionData).reduce((sum, sessions) => 
        sum + sessions.reduce((sessionSum, session) => sessionSum + session.interactions.length, 0), 0
      ),
      uniqueForms: Object.keys(interactionData).length,
      fieldTypesLearned: new Set(
        Object.values(interactionData).flatMap(sessions => 
          sessions.flatMap(session => 
            session.interactions.map(i => i.predictedFieldType)
          )
        )
      ).size
    };

    return stats;
  } catch (error) {
    console.error('[SFA Background] Error getting ML stats:', error);
    return { error: error.message };
  }
}

/**
 * NEW: Process ML data for insights
 */
async function handleProcessMLData() {
  try {
    const { interactionData } = await chrome.storage.local.get(['interactionData']);
    
    if (!interactionData) {
      return { success: false, error: 'No data to process' };
    }

    // Analyze patterns in the data
    const insights = {
      mostCommonFields: {},
      averageTimeToFill: {},
      formComplexityScores: {},
      commonDOMPatterns: []
    };

    // Process each session
    for (const [templateKey, sessions] of Object.entries(interactionData)) {
      const formInsights = {
        totalSessions: sessions.length,
        averageInteractions: sessions.reduce((sum, s) => sum + s.interactions.length, 0) / sessions.length,
        commonFields: {}
      };

      for (const session of sessions) {
        for (const interaction of session.interactions) {
          const fieldType = interaction.predictedFieldType;
          
          // Count field types
          if (!insights.mostCommonFields[fieldType]) {
            insights.mostCommonFields[fieldType] = 0;
          }
          insights.mostCommonFields[fieldType]++;

          // Track timing data
          if (interaction.timeToFill && fieldType !== 'unknown') {
            if (!insights.averageTimeToFill[fieldType]) {
              insights.averageTimeToFill[fieldType] = [];
            }
            insights.averageTimeToFill[fieldType].push(interaction.timeToFill);
          }
        }
      }

      insights.formComplexityScores[templateKey] = formInsights;
    }

    // Calculate averages
    for (const fieldType in insights.averageTimeToFill) {
      const times = insights.averageTimeToFill[fieldType];
      insights.averageTimeToFill[fieldType] = {
        average: times.reduce((sum, time) => sum + time, 0) / times.length,
        count: times.length,
        min: Math.min(...times),
        max: Math.max(...times)
      };
    }

    console.log('[SFA Background] ML data processing completed:', insights);
    
    return {
      success: true,
      insights
    };

  } catch (error) {
    console.error('[SFA Background] Error processing ML data:', error);
    return { success: false, error: error.message };
  }
}

// --- Existing Functions (Enhanced) ---

async function handleClearAllData() {
  try {
    if (supabase && supabase.isAuthenticated()) {
      await supabase.from('user_profiles').delete().eq('user_id', supabase.user.id);
      await supabase.from('form_templates').delete().eq('user_id', supabase.user.id);
      await supabase.from('ml_training_data').delete().eq('user_id', supabase.user.id); // NEW: Clear ML data
    }
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ isEnabled: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleExportData() {
  try {
    let userProfile = {};
    let formTemplates = {};
    let interactionData = {}; // NEW: Include ML data in export
    
    if (supabase && supabase.isAuthenticated()) {
      const profileResult = await supabase.from('user_profiles').select('*').eq('user_id', supabase.user.id).single();
      const templatesResult = await supabase.from('form_templates').select('*').eq('user_id', supabase.user.id);
      
      userProfile = profileResult.data || {};
      formTemplates = (templatesResult.data || []).reduce((acc, t) => { 
        acc[t.template_key] = t; 
        return acc; 
      }, {});
    } else {
      const data = await chrome.storage.local.get(['userProfile', 'formTemplates', 'interactionData']);
      userProfile = data.userProfile || {};
      formTemplates = data.formTemplates || {};
      interactionData = data.interactionData || {};
    }

    const exportData = { 
      userProfile, 
      formTemplates,
      interactionData, // NEW: Include interaction data
      exportDate: new Date().toISOString(), 
      version: '1.1.0' // Updated version
    };

    return { success: true, data: JSON.stringify(exportData, null, 2) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleImportData(importData) {
  try {
    const data = JSON.parse(importData);
    if (data.userProfile && data.formTemplates) {
      // Import all available data
      const importObj = {
        userProfile: data.userProfile,
        formTemplates: data.formTemplates
      };
      
      // Import interaction data if available (from new version)
      if (data.interactionData) {
        importObj.interactionData = data.interactionData;
      }

      await chrome.storage.local.set(importObj);
      await handleDataSync(); // Sync imported data to cloud
      return { success: true };
    } else {
      return { success: false, error: 'Invalid data format' };
    }
  } catch (error) {
    return { success: false, error: 'Invalid JSON data' };
  }
}

async function handleDailyCleanup() {
  try {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let cleaned = 0;
    
    if (supabase.isAuthenticated()) {
      // Clean old form templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('form_templates')
        .delete()
        .eq('user_id', supabase.user.id)
        .lt('last_used', oneMonthAgo);
      
      if (templatesError) throw templatesError;
      
      // Clean old ML training data
      const { data: mlData, error: mlError } = await supabase
        .from('ml_training_data')
        .delete()
        .eq('user_id', supabase.user.id)
        .lt('created_at', oneMonthAgo);
        
      if (mlError) throw mlError;
      
      cleaned = (templatesData?.length || 0) + (mlData?.length || 0);
    }
    
    if (cleaned > 0) {
      console.log(`[SFA Background] Cleaned up ${cleaned} old records from cloud.`);
    }
  } catch (error) {
    console.error('[SFA Background] Error during daily cleanup:', error);
  }
}

/**
 * NEW: Regular ML data processing
 */
async function handleMLDataProcessing() {
  try {
    const insights = await handleProcessMLData();
    if (insights.success) {
      // Store insights for popup display
      await chrome.storage.local.set({
        mlInsights: insights.insights,
        lastMLProcessing: Date.now()
      });
    }
  } catch (error) {
    console.error('[SFA Background] Error in ML data processing:', error);
  }
}

// --- Setup Functions ---

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'smartFormAssistant',
      title: 'Smart Form Assistant',
      contexts: ['editable']
    });
    chrome.contextMenus.create({
      id: 'fillField',
      parentId: 'smartFormAssistant',
      title: 'Auto-fill this field',
      contexts: ['editable']
    });
    chrome.contextMenus.create({
      id: 'saveField',
      parentId: 'smartFormAssistant',
      title: 'Remember this field',
      contexts: ['editable']
    });
    chrome.contextMenus.create({
      id: 'startLearning',
      parentId: 'smartFormAssistant',
      title: '🎓 Start learning mode',
      contexts: ['page']
    });
  });
}

function setupAlarms() {
  chrome.alarms.get('dailyCleanup', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('dailyCleanup', { periodInMinutes: 24 * 60 });
      console.log('[SFA Background] Daily cleanup alarm created.');
    }
  });
  
  // NEW: ML data processing alarm
  chrome.alarms.get('mlDataProcessing', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('mlDataProcessing', { periodInMinutes: 6 * 60 }); // Every 6 hours
      console.log('[SFA Background] ML data processing alarm created.');
    }
  });
}
