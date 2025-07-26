// Smart Form Assistant - Complete Enhanced Content Script with ML Data Collection
// Version 2.0 - Full ML Training Data Collection System

class InteractionRecorder {
  constructor() {
    this.isRecording = false;
    this.currentSession = null;
    this.interactions = [];
    this.sessionStartTime = null;
  }

  startRecording(formElement, templateKey) {
    this.isRecording = true;
    this.currentSession = {
      templateKey,
      formElement,
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      url: window.location.href,
      formSignature: this.generateFormSignature(formElement)
    };
    this.interactions = [];
    this.sessionStartTime = Date.now();
    
    console.log(`[SFA Recorder] Started recording session: ${this.currentSession.sessionId}`);
    this.addVisualIndicator();
  }

  stopRecording() {
    if (!this.isRecording) return null;
    
    this.isRecording = false;
    const sessionData = {
      ...this.currentSession,
      endTime: Date.now(),
      duration: Date.now() - this.sessionStartTime,
      interactions: [...this.interactions],
      totalInteractions: this.interactions.length
    };
    
    console.log(`[SFA Recorder] Stopped recording. Captured ${this.interactions.length} interactions`);
    this.removeVisualIndicator();
    
    // Reset for next session
    this.currentSession = null;
    this.interactions = [];
    
    return sessionData;
  }

  recordInteraction(element, actionType, additionalData = {}) {
    if (!this.isRecording) return;

    const timestamp = Date.now();
    const relativeTime = timestamp - this.sessionStartTime;
    
    const interaction = {
      timestamp,
      relativeTime,
      sessionId: this.currentSession.sessionId,
      actionType, // 'click', 'type', 'select', 'focus', 'blur'
      
      // Element identification
      selector: this.generateCssSelector(element),
      tagName: element.tagName.toLowerCase(),
      elementType: element.type || null,
      elementName: element.name || null,
      elementId: element.id || null,
      
      // Rich HTML context - This is the key data for ML training
      htmlContext: this.captureHtmlContext(element),
      domPath: this.generateDomPath(element),
      parentContext: this.captureParentContext(element),
      
      // Field semantics
      label: this.findLabel(element),
      placeholder: element.placeholder || null,
      ariaLabel: element.getAttribute('aria-label') || null,
      
      // User data
      value: this.sanitizeValue(element.value || additionalData.value),
      valueLength: (element.value || '').length,
      
      // Behavioral data
      keystrokes: additionalData.keystrokes || null,
      timeToFill: additionalData.timeToFill || null,
      
      // Form context
      formPosition: this.getElementPositionInForm(element),
      nearbyElements: this.captureNearbyElements(element),
      
      // Field classification (this is what ML will predict)
      predictedFieldType: this.mapToStandardField({
        label: this.findLabel(element),
        name: element.name,
        placeholder: element.placeholder
      }),
      
      ...additionalData
    };

    this.interactions.push(interaction);
    console.log(`[SFA Recorder] Recorded ${actionType} interaction:`, interaction.predictedFieldType);
  }

  // Generate comprehensive HTML context for ML training
  captureHtmlContext(element) {
    const context = {
      // The element itself
      outerHTML: element.outerHTML.substring(0, 1000), // Limit size
      
      // Parent hierarchy (this is the DOM breadcrumb trail!)
      parentChain: [],
      
      // Sibling context
      previousSibling: element.previousElementSibling?.outerHTML?.substring(0, 300) || null,
      nextSibling: element.nextElementSibling?.outerHTML?.substring(0, 300) || null,
      
      // Container analysis
      formGroup: null,
      fieldWrapper: null
    };

    // Build the parent chain (DOM breadcrumb trail)
    let current = element.parentElement;
    let depth = 0;
    while (current && depth < 10) { // Limit depth to prevent huge data
      context.parentChain.push({
        tagName: current.tagName.toLowerCase(),
        className: current.className || null,
        id: current.id || null,
        attributes: this.getRelevantAttributes(current),
        outerHTML: current.outerHTML.substring(0, 500) // Truncate for storage
      });
      
      // Check for common form patterns
      if (current.classList.contains('form-group') || 
          current.classList.contains('field') ||
          current.classList.contains('input-group')) {
        context.formGroup = current.outerHTML.substring(0, 1000);
      }
      
      current = current.parentElement;
      depth++;
    }

    return context;
  }

  // Generate the complete DOM path (like browser dev tools)
  generateDomPath(element) {
    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();
      
      // Add ID if present
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break; // IDs are unique, we can stop here
      }
      
      // Add classes
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).slice(0, 3); // Limit classes
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      // Add nth-child if needed for uniqueness
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children);
        const sameTag = siblings.filter(s => s.nodeName === current.nodeName);
        if (sameTag.length > 1) {
          const index = sameTag.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
      
      // Prevent infinite loops
      if (path.length > 15) break;
    }
    
    return path.join(' > ');
  }

  captureParentContext(element, levels = 3) {
    const parents = [];
    let current = element.parentElement;
    let level = 0;
    
    while (current && level < levels) {
      parents.push({
        tagName: current.tagName.toLowerCase(),
        className: current.className || null,
        innerHTML: current.innerHTML.substring(0, 200), // Truncated
        attributes: this.getRelevantAttributes(current)
      });
      current = current.parentElement;
      level++;
    }
    
    return parents;
  }

  captureNearbyElements(element) {
    const nearby = {
      labels: [],
      inputs: [],
      buttons: []
    };
    
    // Find nearby elements within the same container
    const container = element.closest('form, .form-group, .field, div') || element.parentElement;
    if (!container) return nearby;
    
    // Capture labels
    container.querySelectorAll('label').forEach(label => {
      nearby.labels.push({
        text: label.textContent.trim(),
        htmlFor: label.getAttribute('for'),
        distance: this.calculateDistance(element, label)
      });
    });
    
    // Capture other inputs
    container.querySelectorAll('input, textarea, select').forEach(input => {
      if (input !== element) {
        nearby.inputs.push({
          type: input.type || input.tagName.toLowerCase(),
          name: input.name,
          placeholder: input.placeholder,
          distance: this.calculateDistance(element, input)
        });
      }
    });
    
    // Capture buttons
    container.querySelectorAll('button, [type="submit"]').forEach(button => {
      nearby.buttons.push({
        text: button.textContent.trim(),
        type: button.type,
        distance: this.calculateDistance(element, button)
      });
    });
    
    return nearby;
  }

  getElementPositionInForm(element) {
    const form = element.closest('form') || element.closest('[role="form"]') || document.body;
    const allInputs = form.querySelectorAll('input, textarea, select');
    const position = Array.from(allInputs).indexOf(element);
    
    return {
      position: position + 1,
      total: allInputs.length,
      percentage: ((position + 1) / allInputs.length) * 100
    };
  }

  // Helper methods
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateFormSignature(formElement) {
    const inputs = formElement.querySelectorAll('input, textarea, select');
    return Array.from(inputs).slice(0, 8).map(i => 
      (i.name || i.id || i.type || i.placeholder || '').substring(0, 20)
    ).join('|');
  }

  generateCssSelector(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += '#' + el.id.trim();
        path.unshift(selector);
        break;
      } else {
        let sib = el, nth = 1;
        while (sib = sib.previousElementSibling) {
          if (sib.nodeName.toLowerCase() === selector) nth++;
        }
        if (nth !== 1) selector += ":nth-of-type(" + nth + ")";
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(" > ");
  }

  findLabel(input) {
    let labelText = '';
    const root = input.getRootNode();

    if (input.id && (labelText = root.querySelector(`label[for="${input.id.trim()}"]`)?.textContent));
    else if (input.closest('label')) labelText = input.closest('label').textContent;
    else if ((labelText = input.getAttribute('aria-label')));
    else if (input.getAttribute('aria-labelledby') && (labelText = root.getElementById(input.getAttribute('aria-labelledby'))?.textContent));
    else if (input.previousElementSibling?.tagName === 'LABEL') labelText = input.previousElementSibling.textContent;

    return labelText ? labelText.trim().replace(/\s+/g, ' ') : '';
  }

  mapToStandardField(fieldInfo) {
    const text = (fieldInfo.label + ' ' + fieldInfo.name + ' ' + fieldInfo.placeholder).toLowerCase();
    const mappings = {
      firstName: ['first name', 'firstname', 'fname', 'given name'],
      lastName: ['last name', 'lastname', 'lname', 'surname', 'family name'],
      fullName: ['full name', 'your name', 'name'],
      email: ['email', 'e-mail', 'email address'],
      phone: ['phone', 'telephone', 'mobile', 'contact number'],
      address: ['address', 'street'],
      city: ['city'],
      state: ['state', 'province', 'region'],
      zipCode: ['zip', 'postal code', 'postcode'],
      country: ['country'],
      company: ['company', 'organization', 'employer'],
      jobTitle: ['job title', 'position', 'role', 'title'],
      university: ['university', 'college', 'school', 'institution'],
      degree: ['degree', 'qualification'],
      portfolio: ['portfolio', 'website', 'personal site'],
      linkedin: ['linkedin'],
      experience: ['experience', 'years of experience'],
      skills: ['skills', 'expertise'],
      dateOfBirth: ['date of birth', 'dob', 'birth date'],
      otprType: ['otpr type', 'recruitment type'],
      mobileNo: ['mobile no', 'mobile number', 'phone number'],
      emailId: ['email id', 'email address'],
      captcha: ['captcha', 'verification code']
    };

    for (const [standardField, keywords] of Object.entries(mappings)) {
      if (keywords.some(kw => text.includes(kw))) return standardField;
    }
    return 'unknown';
  }

  getRelevantAttributes(element) {
    const relevantAttrs = ['class', 'id', 'name', 'type', 'role', 'data-*'];
    const attrs = {};
    
    for (const attr of element.attributes) {
      if (relevantAttrs.some(pattern => 
        attr.name === pattern || 
        (pattern.includes('*') && attr.name.startsWith(pattern.replace('*', '')))
      )) {
        attrs[attr.name] = attr.value;
      }
    }
    
    return attrs;
  }

  calculateDistance(el1, el2) {
    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();
    
    const centerX1 = rect1.left + rect1.width / 2;
    const centerY1 = rect1.top + rect1.height / 2;
    const centerX2 = rect2.left + rect2.width / 2;
    const centerY2 = rect2.top + rect2.height / 2;
    
    return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
  }

  sanitizeValue(value) {
    if (!value) return null;
    
    // Don't store sensitive data
    const sensitivePatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email (store length only)
    ];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(value)) {
        return `[REDACTED_LENGTH_${value.length}]`;
      }
    }
    
    // Store actual value for non-sensitive data (for training)
    return value.substring(0, 100); // Limit length
  }

  addVisualIndicator() {
    if (document.getElementById('sfa-recording-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'sfa-recording-indicator';
    indicator.innerHTML = '🔴 Smart Form Assistant is learning from your interactions';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #ff4444;
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    `;
    
    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(indicator);
  }

  removeVisualIndicator() {
    const indicator = document.getElementById('sfa-recording-indicator');
    if (indicator) indicator.remove();
  }
}

class FormAssistant {
  constructor() {
    this.forms = new Map();
    this.userProfile = {};
    this.formTemplates = {};
    this.interactionData = {}; // Store ML training data
    this.isEnabled = true;
    this.saveTimeout = null;
    
    // Initialize the interaction recorder
    this.recorder = new InteractionRecorder();
    
    // Track field interaction timing
    this.fieldTimings = new Map();
    
    // Track if we're in manual learning mode
    this.manualLearningActive = false;
    
    this.init();
  }

  async init() {
    console.log('[SFA] Enhanced Form Assistant initialized with ML data collection');
    await this.loadData();
    if (this.isEnabled) {
      setTimeout(() => {
        this.scanForForms();
        this.setupMutationObserver();
        this.createManualTrigger(); // Create the manual trigger
      }, 1000);
    }
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  async loadData() {
    const result = await chrome.storage.local.get([
      'userProfile', 
      'formTemplates', 
      'interactionData', 
      'isEnabled'
    ]);
    
    this.userProfile = result.userProfile || {};
    this.formTemplates = result.formTemplates || {};
    this.interactionData = result.interactionData || {};
    this.isEnabled = result.isEnabled !== false;
    
    console.log('[SFA] Data loaded:', { 
      profileFields: Object.keys(this.userProfile).length, 
      templates: Object.keys(this.formTemplates).length,
      interactions: Object.keys(this.interactionData).length
    });
  }

  // Enhanced form analysis with ML data collection
  analyzeForm(formElement) {
    const templateKey = this.generateTemplateKey(formElement);
    console.log(`[SFA] Analyzing form: ${templateKey}`);
    
    this.forms.set(formElement, templateKey);

    if (this.formTemplates[templateKey]) {
      console.log(`[SFA] Found existing template. Attempting auto-fill.`);
      this.attemptAutoFillFromTemplate(formElement, this.formTemplates[templateKey]);
    } else {
      console.log(`[SFA] New form detected. Starting learning mode.`);
      this.attemptAutoFillFromProfile(formElement);
      this.setupFormLearning(formElement, templateKey);
    }
  }

  // Enhanced learning setup with detailed interaction recording
  setupFormLearning(formElement, templateKey) {
    // Start recording session only if in manual learning mode
    if (this.manualLearningActive) {
      this.recorder.startRecording(formElement, templateKey);
    }
    
    const inputs = formElement.querySelectorAll('input:not([type="submit"]), textarea, select');
    
    inputs.forEach(input => {
      // Track focus timing
      input.addEventListener('focus', (e) => {
        this.fieldTimings.set(e.target, Date.now());
        if (this.recorder.isRecording) {
          this.recorder.recordInteraction(e.target, 'focus', {
            fieldOrder: Array.from(inputs).indexOf(e.target) + 1
          });
        }
      });

      // Track blur with timing
      input.addEventListener('blur', (e) => {
        const startTime = this.fieldTimings.get(e.target);
        const timeToFill = startTime ? Date.now() - startTime : null;
        
        if (this.recorder.isRecording) {
          this.recorder.recordInteraction(e.target, 'blur', {
            timeToFill,
            fieldCompleted: !!e.target.value
          });
        }
      });

      // Track clicks
      input.addEventListener('click', (e) => {
        if (this.recorder.isRecording) {
          this.recorder.recordInteraction(e.target, 'click');
        }
      });

      // Track typing with keystroke counting
      let keystrokeCount = 0;
      input.addEventListener('keydown', (e) => {
        keystrokeCount++;
      });

      // Track value changes
      input.addEventListener('input', (e) => {
        if (this.recorder.isRecording) {
          this.recorder.recordInteraction(e.target, 'type', {
            keystrokes: keystrokeCount,
            currentLength: e.target.value.length,
            isPartialInput: true
          });
        }
      });

      // Track final value
      input.addEventListener('change', (e) => {
        if (this.recorder.isRecording) {
          this.recorder.recordInteraction(e.target, 'change', {
            keystrokes: keystrokeCount,
            finalValue: this.recorder.sanitizeValue(e.target.value),
            isCompleted: true
          });
        }
        
        // Also update the user profile and template
        this.learnFromField(e.target, formElement);
        
        // Reset keystroke counter
        keystrokeCount = 0;
      });
    });

    // Track form submission
    formElement.addEventListener('submit', (e) => {
      this.handleFormSubmission(formElement, templateKey);
    });

    // Also look for submit buttons
    const submitButtons = formElement.querySelectorAll('[type="submit"], button[type="submit"], .submit, .btn-submit');
    submitButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        // Delay slightly to catch any last-minute field changes
        setTimeout(() => {
          this.handleFormSubmission(formElement, templateKey);
        }, 100);
      });
    });
  }

  // Handle form submission - save all collected data
  handleFormSubmission(formElement, templateKey) {
    console.log('[SFA] Form submission detected. Finalizing learning session.');
    
    const sessionData = this.recorder.stopRecording();
    
    if (sessionData) {
      // Store the interaction data for ML training
      if (!this.interactionData[templateKey]) {
        this.interactionData[templateKey] = [];
      }
      
      this.interactionData[templateKey].push(sessionData);
      
      // Keep only last 5 sessions per form to prevent excessive storage
      if (this.interactionData[templateKey].length > 5) {
        this.interactionData[templateKey] = this.interactionData[templateKey].slice(-5);
      }
      
      console.log(`[SFA] Saved interaction session with ${sessionData.interactions.length} interactions`);
      
      // Show completion message if in manual learning mode
      if (this.manualLearningActive) {
        this.showLearningStatusMessage(`🎯 Form completed! Learned ${sessionData.interactions.length} interactions.`);
        
        // Auto-stop learning mode after form submission
        setTimeout(() => {
          if (this.manualLearningActive) {
            this.toggleManualLearningMode();
          }
        }, 2000);
      }
      
      // Save all data
      this.saveData();
    }
  }

  // Enhanced field learning
  async learnFromField(inputElement, formElement) {
    const label = this.findLabel(inputElement);
    const standardField = this.mapToStandardField({ 
      label, 
      name: inputElement.name, 
      placeholder: inputElement.placeholder 
    });

    if (standardField && standardField !== 'unknown') {
      const templateKey = this.generateTemplateKey(formElement);
      const selector = this.generateCssSelector(inputElement);

      // Update template
      if (!this.formTemplates[templateKey]) {
        this.formTemplates[templateKey] = { 
          fields: {},
          created: Date.now(),
          lastUsed: Date.now()
        };
      }
      this.formTemplates[templateKey].fields[standardField] = selector;
      this.formTemplates[templateKey].lastUsed = Date.now();

      // Update user profile
      if (inputElement.value && inputElement.value.trim()) {
        this.userProfile[standardField] = inputElement.value.trim();
        console.log(`[SFA] Learned: ${standardField} = ${inputElement.value}`);
      }

      // Save with debouncing
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => this.saveData(), 1000);
    }
  }

  // Enhanced data saving including interaction data
  async saveData() {
    await chrome.storage.local.set({
      userProfile: this.userProfile,
      formTemplates: this.formTemplates,
      interactionData: this.interactionData // Save ML training data
    });
    
    console.log("[SFA] Data saved:", {
      profileFields: Object.keys(this.userProfile).length,
      templates: Object.keys(this.formTemplates).length,
      interactionSessions: Object.values(this.interactionData).reduce((sum, sessions) => sum + sessions.length, 0)
    });
    
    // Notify background script for sync
    try {
      chrome.runtime.sendMessage({ action: 'dataUpdated' });
    } catch (e) {
      console.log('[SFA] Background script not available for sync notification');
    }
  }

  // Manual Learning Mode Methods
  createManualTrigger() {
    // Create a floating button for manual learning activation
    const triggerButton = document.createElement('div');
    triggerButton.id = 'sfa-manual-trigger';
    triggerButton.innerHTML = `
      <div class="sfa-trigger-content">
        <span class="sfa-trigger-icon">🎓</span>
        <span class="sfa-trigger-text">Start Learning</span>
      </div>
    `;
    
    triggerButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%);
      border-radius: 50%;
      box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4);
      cursor: pointer;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      user-select: none;
      border: none;
      overflow: hidden;
    `;

    // Add hover and click styles
    const style = document.createElement('style');
    style.textContent = `
      #sfa-manual-trigger:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 25px rgba(255, 107, 107, 0.6);
      }
      
      #sfa-manual-trigger.active {
        background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        animation: sfaPulse 2s infinite;
      }
      
      @keyframes sfaPulse {
        0% { box-shadow: 0 4px 20px rgba(72, 187, 120, 0.4); }
        50% { box-shadow: 0 4px 20px rgba(72, 187, 120, 0.8); }
        100% { box-shadow: 0 4px 20px rgba(72, 187, 120, 0.4); }
      }
      
      .sfa-trigger-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        text-align: center;
        transition: all 0.3s ease;
      }
      
      .sfa-trigger-icon {
        font-size: 20px;
        margin-bottom: -2px;
      }
      
      .sfa-trigger-text {
        font-size: 8px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      #sfa-manual-trigger:hover .sfa-trigger-text {
        opacity: 1;
      }
      
      #sfa-manual-trigger:hover {
        width: 100px;
        border-radius: 30px;
      }
      
      #sfa-manual-trigger:hover .sfa-trigger-content {
        flex-direction: row;
        gap: 6px;
      }
      
      #sfa-manual-trigger:hover .sfa-trigger-icon {
        margin-bottom: 0;
      }
      
      .sfa-learning-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 107, 107, 0.1);
        backdrop-filter: blur(1px);
        z-index: 9999;
        pointer-events: none;
        border: 3px dashed #ff6b6b;
        animation: overlayPulse 3s infinite;
      }
      
      @keyframes overlayPulse {
        0% { opacity: 0.3; }
        50% { opacity: 0.6; }
        100% { opacity: 0.3; }
      }
      
      .sfa-field-highlight {
        position: relative;
        box-shadow: 0 0 0 2px #ff6b6b !important;
        background-color: rgba(255, 107, 107, 0.1) !important;
        transition: all 0.3s ease !important;
      }
      
      .sfa-field-highlight::after {
        content: '👀 Watching';
        position: absolute;
        top: -25px;
        left: 0;
        background: #ff6b6b;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: bold;
        z-index: 10001;
        animation: sfaWatchingBadge 2s infinite;
      }
      
      @keyframes sfaWatchingBadge {
        0% { opacity: 1; transform: translateY(0); }
        50% { opacity: 0.7; transform: translateY(-2px); }
        100% { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);

    // Add click handler
    triggerButton.addEventListener('click', () => {
      this.toggleManualLearningMode();
    });

    // Only show the button if we detect forms on the page
    setTimeout(() => {
      const forms = document.querySelectorAll('form, [role="form"]');
      const formLikeContainers = document.querySelectorAll('div, section');
      let hasFormInputs = false;

      formLikeContainers.forEach(container => {
        const inputs = container.querySelectorAll('input:not([type="hidden"]), textarea, select');
        if (inputs.length >= 2) {
          hasFormInputs = true;
        }
      });

      if (forms.length > 0 || hasFormInputs) {
        document.body.appendChild(triggerButton);
        
        // Show a subtle notification that learning is available
        this.showLearningAvailableNotification();
      }
    }, 2000);
  }

  showLearningAvailableNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>🤖</span>
        <span>Smart Form Assistant detected forms on this page!</span>
        <button id="sfa-notification-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; margin-left: auto;">×</button>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(66, 153, 225, 0.4);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
      animation: slideInFromRight 0.5s ease;
    `;

    const closeStyle = document.createElement('style');
    closeStyle.textContent = `
      @keyframes slideInFromRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes slideOutToRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(closeStyle);

    document.body.appendChild(notification);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutToRight 0.5s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 500);
      }
    }, 5000);

    // Close button handler
    const closeBtn = notification.querySelector('#sfa-notification-close');
    closeBtn.addEventListener('click', () => {
      notification.style.animation = 'slideOutToRight 0.5s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 500);
    });
  }

  toggleManualLearningMode() {
    const triggerButton = document.getElementById('sfa-manual-trigger');
    const forms = document.querySelectorAll('form, [role="form"]');
    
    if (!this.manualLearningActive) {
      // Start manual learning mode
      this.manualLearningActive = true;
      triggerButton.classList.add('active');
      triggerButton.querySelector('.sfa-trigger-icon').textContent = '👁️';
      triggerButton.querySelector('.sfa-trigger-text').textContent = 'Learning...';
      
      // Add visual overlay
      this.addLearningOverlay();
      
      // Highlight all form fields
      this.highlightFormFields();
      
      // Start learning on all detected forms
      let formsActivated = 0;
      forms.forEach(form => {
        if (!form.hasAttribute('data-sfa-analyzed')) {
          const templateKey = this.generateTemplateKey(form);
          this.setupFormLearning(form, templateKey);
          formsActivated++;
        }
      });

      // Also check for form-like containers
      const containers = document.querySelectorAll('div, section');
      containers.forEach(container => {
        if (!container.hasAttribute('data-sfa-analyzed')) {
          const inputs = container.querySelectorAll('input:not([type="hidden"]), textarea, select');
          if (inputs.length >= 2) {
            const templateKey = this.generateTemplateKey(container);
            this.setupFormLearning(container, templateKey);
            formsActivated++;
          }
        }
      });

      // Show success message
      this.showLearningStatusMessage(`🎓 Learning mode activated! Watching ${formsActivated} forms.`);
      
      // Start the interaction recorder
      const firstForm = forms[0] || containers.find(c => c.querySelectorAll('input, textarea, select').length >= 2);
      if (firstForm) {
        const templateKey = this.generateTemplateKey(firstForm);
        this.recorder.startRecording(firstForm, templateKey);
      }
      
    } else {
      // Stop manual learning mode
      this.manualLearningActive = false;
      triggerButton.classList.remove('active');
      triggerButton.querySelector('.sfa-trigger-icon').textContent = '🎓';
      triggerButton.querySelector('.sfa-trigger-text').textContent = 'Start Learning';
      
      // Remove visual indicators
      this.removeLearningOverlay();
      this.removeFieldHighlights();
      
      // Stop recording
      const sessionData = this.recorder.stopRecording();
      if (sessionData) {
        this.showLearningStatusMessage(`✅ Learning complete! Recorded ${sessionData.interactions.length} interactions.`);
      } else {
        this.showLearningStatusMessage('❌ Learning stopped.');
      }
    }
  }

  addLearningOverlay() {
    if (document.getElementById('sfa-learning-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'sfa-learning-overlay';
    overlay.className = 'sfa-learning-overlay';
    document.body.appendChild(overlay);
  }

  removeLearningOverlay() {
    const overlay = document.getElementById('sfa-learning-overlay');
    if (overlay) overlay.remove();
  }

  highlightFormFields() {
    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
    inputs.forEach(input => {
      input.classList.add('sfa-field-highlight');
    });
  }

  removeFieldHighlights() {
    const highlightedFields = document.querySelectorAll('.sfa-field-highlight');
    highlightedFields.forEach(field => {
      field.classList.remove('sfa-field-highlight');
    });
  }

  showLearningStatusMessage(message) {
    // Remove any existing status message
    const existing = document.getElementById('sfa-status-message');
    if (existing) existing.remove();

    const statusMessage = document.createElement('div');
    statusMessage.id = 'sfa-status-message';
    statusMessage.textContent = message;
    
    statusMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(72, 187, 120, 0.4);
      z-index: 10002;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      animation: sfaStatusFadeIn 0.5s ease, sfaStatusFadeOut 0.5s ease 2.5s;
      pointer-events: none;
    `;

    const statusStyle = document.createElement('style');
    statusStyle.textContent = `
      @keyframes sfaStatusFadeIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      
      @keyframes sfaStatusFadeOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    `;
    document.head.appendChild(statusStyle);

    document.body.appendChild(statusMessage);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (statusMessage.parentNode) {
        statusMessage.remove();
      }
    }, 3000);
  }

  // Core Helper Functions
  generateTemplateKey(formElement) {
    const hostname = window.location.hostname;
    const inputs = formElement.querySelectorAll('input, textarea, select');
    const signature = Array.from(inputs).slice(0, 5).map(i => i.name || i.id || i.type).sort().join('|');
    return `${hostname}_${signature}`;
  }

  generateCssSelector(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += '#' + el.id.trim();
        path.unshift(selector);
        break;
      } else {
        let sib = el, nth = 1;
        while (sib = sib.previousElementSibling) {
          if (sib.nodeName.toLowerCase() === selector) nth++;
        }
        if (nth !== 1) selector += ":nth-of-type(" + nth + ")";
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(" > ");
  }

  findLabel(input) {
    let labelText = '';
    const root = input.getRootNode();

    if (input.id && (labelText = root.querySelector(`label[for="${input.id.trim()}"]`)?.textContent));
    else if (input.closest('label')) labelText = input.closest('label').textContent;
    else if ((labelText = input.getAttribute('aria-label')));
    else if (input.getAttribute('aria-labelledby') && (labelText = root.getElementById(input.getAttribute('aria-labelledby'))?.textContent));
    else if (input.previousElementSibling?.tagName === 'LABEL') labelText = input.previousElementSibling.textContent;

    return labelText ? labelText.trim().replace(/\s+/g, ' ') : '';
  }

  mapToStandardField(fieldInfo) {
    const text = (fieldInfo.label + ' ' + fieldInfo.name + ' ' + fieldInfo.placeholder).toLowerCase();
    const mappings = {
      firstName: ['first name', 'firstname', 'fname', 'given name'],
      lastName: ['last name', 'lastname', 'lname', 'surname', 'family name'],
      fullName: ['full name', 'your name', 'name'],
      email: ['email', 'e-mail', 'email address'],
      phone: ['phone', 'telephone', 'mobile', 'contact number'],
      address: ['address', 'street'],
      city: ['city'],
      state: ['state', 'province', 'region'],
      zipCode: ['zip', 'postal code', 'postcode'],
      country: ['country'],
      company: ['company', 'organization', 'employer'],
      jobTitle: ['job title', 'position', 'role', 'title'],
      university: ['university', 'college', 'school', 'institution'],
      degree: ['degree', 'qualification'],
      portfolio: ['portfolio', 'website', 'personal site'],
      linkedin: ['linkedin'],
      experience: ['experience', 'years of experience'],
      skills: ['skills', 'expertise'],
      dateOfBirth: ['date of birth', 'dob', 'birth date'],
      otprType: ['otpr type', 'recruitment type'],
      mobileNo: ['mobile no', 'mobile number', 'phone number'],
      emailId: ['email id', 'email address'],
      captcha: ['captcha', 'verification code']
    };

    for (const [standardField, keywords] of Object.entries(mappings)) {
      if (keywords.some(kw => text.includes(kw))) return standardField;
    }
    return 'unknown';
  }

  scanForForms() {
    const findFormsRecursive = (node) => {
      const formLikeElements = node.querySelectorAll('form, [role="form"], div, section');
      
      formLikeElements.forEach(el => {
        if (el.hasAttribute('data-sfa-analyzed')) return;

        const inputs = el.querySelectorAll('input:not([type="hidden"]), textarea, select');
        if (inputs.length >= 2) {
          if (el.querySelector('[data-sfa-analyzed]')) return;
          el.setAttribute('data-sfa-analyzed', 'true');
          this.analyzeForm(el);
        }
      });
      
      node.querySelectorAll('*').forEach(child => {
        if (child.shadowRoot) findFormsRecursive(child.shadowRoot);
      });
    };
    findFormsRecursive(document.body);
  }

  setupMutationObserver() {
    const observer = new MutationObserver(() => {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = setTimeout(() => this.scanForForms(), 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  attemptAutoFillFromTemplate(formElement, template) {
    if (!template?.fields || Object.keys(this.userProfile).length === 0) return;

    let filledCount = 0;
    for (const standardField in template.fields) {
      const selector = template.fields[standardField];
      const userData = this.userProfile[standardField];
      
      if (selector && userData) {
        try {
          const element = formElement.querySelector(selector);
          if (element && !element.value) {
            this.fillField(element, userData);
            filledCount++;
          }
        } catch (e) { 
          console.error(`[SFA] Invalid selector: ${selector}`, e); 
        }
      }
    }
    if (filledCount > 0) {
      console.log(`[SFA] Auto-filled ${filledCount} fields from template.`);
    }
  }

  attemptAutoFillFromProfile(formElement) {
    if (Object.keys(this.userProfile).length === 0) return;

    let filledCount = 0;
    const inputs = formElement.querySelectorAll('input:not([type="submit"]), textarea, select');
    
    inputs.forEach(input => {
      const label = this.findLabel(input);
      const standardField = this.mapToStandardField({ 
        label, 
        name: input.name, 
        placeholder: input.placeholder 
      });
      const userData = this.userProfile[standardField];

      if (userData && !input.value && standardField !== 'unknown') {
        this.fillField(input, userData);
        filledCount++;
      }
    });
    
    if (filledCount > 0) {
      console.log(`[SFA] Auto-filled ${filledCount} fields using profile data.`);
    }
  }

  fillField(element, value) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.style.backgroundColor = '#e8f5e8';
    setTimeout(() => { element.style.backgroundColor = ''; }, 2000);
  }

  // Enhanced message handling to include manual learning triggers
  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'getStats':
        sendResponse({
          formsDetected: this.forms.size,
          templatesLearned: Object.keys(this.formTemplates).length,
          profileFields: Object.keys(this.userProfile).length,
          interactionSessions: Object.values(this.interactionData).reduce((sum, sessions) => sum + sessions.length, 0),
          learningModeActive: this.manualLearningActive
        });
        break;
        
      case 'toggleExtension':
        this.isEnabled = message.enabled;
        if (this.isEnabled) {
          this.scanForForms();
        } else {
          // Stop any active learning and hide trigger
          if (this.manualLearningActive) {
            this.toggleManualLearningMode();
          }
          const trigger = document.getElementById('sfa-manual-trigger');
          if (trigger) trigger.style.display = 'none';
        }
        sendResponse({ success: true });
        break;
        
      case 'startManualLearning':
        if (!this.manualLearningActive) {
          this.toggleManualLearningMode();
        }
        
        const forms = document.querySelectorAll('form, [role="form"]');
        const containers = document.querySelectorAll('div, section');
        let totalForms = forms.length;
        
        containers.forEach(container => {
          const inputs = container.querySelectorAll('input:not([type="hidden"]), textarea, select');
          if (inputs.length >= 2) totalForms++;
        });
        
        sendResponse({ 
          success: true, 
          formsFound: totalForms,
          learningActive: this.manualLearningActive
        });
        break;
        
      case 'stopManualLearning':
        if (this.manualLearningActive) {
          this.toggleManualLearningMode();
        }
        sendResponse({ 
          success: true, 
          learningActive: this.manualLearningActive 
        });
        break;
    }
  }
}

// Tutorial overlay for first-time users
class LearningTutorial {
  static show() {
    if (localStorage.getItem('sfa-tutorial-shown')) return;
    
    const tutorial = document.createElement('div');
    tutorial.id = 'sfa-tutorial';
    tutorial.innerHTML = `
      <div class="sfa-tutorial-content">
        <div class="sfa-tutorial-header">
          <h3>🎓 Welcome to Smart Form Assistant!</h3>
          <button id="sfa-tutorial-close">×</button>
        </div>
        <div class="sfa-tutorial-body">
          <p><strong>How it works:</strong></p>
          <ol>
            <li>Click the orange "Start Learning" button</li>
            <li>Fill out any form normally</li>
            <li>Our AI watches and learns your patterns</li>
            <li>Next time, we'll auto-fill forms for you!</li>
          </ol>
          <p><em>The more you use it, the smarter it gets! 🧠</em></p>
        </div>
        <div class="sfa-tutorial-footer">
          <button id="sfa-tutorial-got-it">Got it!</button>
        </div>
      </div>
    `;
    
    tutorial.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10003;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const tutorialStyle = document.createElement('style');
    tutorialStyle.textContent = `
      .sfa-tutorial-content {
        background: white;
        border-radius: 12px;
        max-width: 400px;
        margin: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: tutorialSlideIn 0.5s ease;
      }
      
      @keyframes tutorialSlideIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
      }
      
      .sfa-tutorial-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 20px 10px 20px;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .sfa-tutorial-header h3 {
        margin: 0;
        color: #2d3748;
        font-size: 18px;
      }
      
      .sfa-tutorial-header button {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #718096;
      }
      
      .sfa-tutorial-body {
        padding: 20px;
      }
      
      .sfa-tutorial-body p {
        margin: 0 0 15px 0;
        color: #4a5568;
        line-height: 1.5;
      }
      
      .sfa-tutorial-body ol {
        margin: 15px 0;
        padding-left: 20px;
        color: #4a5568;
        line-height: 1.6;
      }
      
      .sfa-tutorial-body li {
        margin-bottom: 8px;
      }
      
      .sfa-tutorial-footer {
        padding: 0 20px 20px 20px;
        text-align: center;
      }
      
      .sfa-tutorial-footer button {
        background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .sfa-tutorial-footer button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(66, 153, 225, 0.4);
      }
    `;
    document.head.appendChild(tutorialStyle);

    document.body.appendChild(tutorial);

    // Event handlers
    const close = () => {
      tutorial.style.animation = 'tutorialSlideOut 0.3s ease';
      setTimeout(() => tutorial.remove(), 300);
      localStorage.setItem('sfa-tutorial-shown', 'true');
    };

    const closeStyle = document.createElement('style');
    closeStyle.textContent = `
      @keyframes tutorialSlideOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.8); }
      }
    `;
    document.head.appendChild(closeStyle);

    tutorial.querySelector('#sfa-tutorial-close').addEventListener('click', close);
    tutorial.querySelector('#sfa-tutorial-got-it').addEventListener('click', close);
    tutorial.addEventListener('click', (e) => {
      if (e.target === tutorial) close();
    });
  }
}

// Initialize the enhanced form assistant
new FormAssistant();

// Show tutorial for new users
setTimeout(() => {
  const forms = document.querySelectorAll('form, [role="form"]');
  const containers = document.querySelectorAll('div, section');
  let hasFormInputs = false;

  containers.forEach(container => {
    const inputs = container.querySelectorAll('input:not([type="hidden"]), textarea, select');
    if (inputs.length >= 2) {
      hasFormInputs = true;
    }
  });

  if ((forms.length > 0 || hasFormInputs) && !localStorage.getItem('sfa-tutorial-shown')) {
    LearningTutorial.show();
  }
}, 3000);
