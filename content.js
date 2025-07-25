// Smart Form Assistant - Enhanced Content Script with ML Data Collection
// This version captures detailed interaction data for machine learning training

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
      outerHTML: element.outerHTML,
      
      // Parent hierarchy (this is the DOM breadcrumb trail!)
      parentChain: [],
      
      // Sibling context
      previousSibling: element.previousElementSibling?.outerHTML || null,
      nextSibling: element.nextElementSibling?.outerHTML || null,
      
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
      skills: ['skills', 'expertise']
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
    this.interactionData = {}; // New: Store ML training data
    this.isEnabled = true;
    this.saveTimeout = null;
    
    // Initialize the interaction recorder
    this.recorder = new InteractionRecorder();
    
    // Track field interaction timing
    this.fieldTimings = new Map();
    
    this.init();
  }

  async init() {
    console.log('[SFA] Enhanced Form Assistant initialized with ML data collection');
    await this.loadData();
    if (this.isEnabled) {
      setTimeout(() => {
        this.scanForForms();
        this.setupMutationObserver();
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
    // Start recording session
    this.recorder.startRecording(formElement, templateKey);
    
    const inputs = formElement.querySelectorAll('input:not([type="submit"]), textarea, select');
    
    inputs.forEach(input => {
      // Track focus timing
      input.addEventListener('focus', (e) => {
        this.fieldTimings.set(e.target, Date.now());
        this.recorder.recordInteraction(e.target, 'focus', {
          fieldOrder: Array.from(inputs).indexOf(e.target) + 1
        });
      });

      // Track blur with timing
      input.addEventListener('blur', (e) => {
        const startTime = this.fieldTimings.get(e.target);
        const timeToFill = startTime ? Date.now() - startTime : null;
        
        this.recorder.recordInteraction(e.target, 'blur', {
          timeToFill,
          fieldCompleted: !!e.target.value
        });
      });

      // Track clicks
      input.addEventListener('click', (e) => {
        this.recorder.recordInteraction(e.target, 'click');
      });

      // Track typing with keystroke counting
      let keystrokeCount = 0;
      input.addEventListener('keydown', (e) => {
        keystrokeCount++;
      });

      // Track value changes
      input.addEventListener('input', (e) => {
        this.recorder.recordInteraction(e.target, 'type', {
          keystrokes: keystrokeCount,
          currentLength: e.target.value.length,
          isPartialInput: true
        });
      });

      // Track final value
      input.addEventListener('change', (e) => {
        this.recorder.recordInteraction(e.target, 'change', {
          keystrokes: keystrokeCount,
          finalValue: this.recorder.sanitizeValue(e.target.value),
          isCompleted: true
        });
        
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
    
    // Stop recording and get the session data
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
      interactionData: this.interactionData // New: Save ML training data
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

  // Rest of the methods remain the same...
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
      skills: ['skills', 'expertise']
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

  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'getStats':
        sendResponse({
          formsDetected: this.forms.size,
          templatesLearned: Object.keys(this.formTemplates).length,
          profileFields: Object.keys(this.userProfile).length,
          interactionSessions: Object.values(this.interactionData).reduce((sum, sessions) => sum + sessions.length, 0)
        });
        break;
        
      case 'toggleExtension':
        this.isEnabled = message.enabled;
        if (this.isEnabled) {
          this.scanForForms();
        } else {
          // Stop any active recording
          if (this.recorder.isRecording) {
            this.recorder.stopRecording();
          }
        }
        sendResponse({ success: true });
        break;
        
      case 'exportMLData':
        // Export interaction data for ML training
        sendResponse({
          success: true,
          data: {
            interactionData: this.interactionData,
            formTemplates: this.formTemplates,
            exportDate: new Date().toISOString(),
            totalSessions: Object.values(this.interactionData).reduce((sum, sessions) => sum + sessions.length, 0)
          }
        });
        break;
        
      case 'startManualLearning':
        // Manually trigger learning mode on current forms
        const forms = document.querySelectorAll('form, [role="form"]');
        forms.forEach(form => {
          if (!form.hasAttribute('data-sfa-analyzed')) {
            const templateKey = this.generateTemplateKey(form);
            this.setupFormLearning(form, templateKey);
          }
        });
        sendResponse({ success: true, formsFound: forms.length });
        break;
    }
  }
}

// Initialize the enhanced form assistant
new FormAssistant();
