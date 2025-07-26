// Smart Form Assistant - ML Field Recognition Engine
// This is the BRAIN of our AI system

class MLFieldRecognizer {
  constructor() {
    // Initialize with seed mappings (will evolve dynamically)
    this.fieldMappings = this.getInitialEnglishMappings();
    this.confidenceThreshold = 0.7;
    this.semanticCache = new Map(); // Cache similarity calculations
    this.learningHistory = [];
    
    console.log('[ML] Field Recognizer initialized with', Object.keys(this.fieldMappings).length, 'base field types');
  }

  // Seed mappings - these will grow dynamically
  getInitialEnglishMappings() {
    return {
      // Personal Information
      firstName: [
        { text: 'first name', confidence: 1.0, usageCount: 1000, contexts: ['general'] },
        { text: 'fname', confidence: 0.95, usageCount: 500, contexts: ['technical'] },
        { text: 'given name', confidence: 0.9, usageCount: 200, contexts: ['formal'] },
        { text: 'forename', confidence: 0.85, usageCount: 50, contexts: ['legal'] }
      ],
      
      lastName: [
        { text: 'last name', confidence: 1.0, usageCount: 1000, contexts: ['general'] },
        { text: 'lname', confidence: 0.95, usageCount: 500, contexts: ['technical'] },
        { text: 'surname', confidence: 0.9, usageCount: 300, contexts: ['formal'] },
        { text: 'family name', confidence: 0.85, usageCount: 150, contexts: ['formal'] }
      ],
      
      fullName: [
        { text: 'full name', confidence: 1.0, usageCount: 800, contexts: ['general'] },
        { text: 'complete name', confidence: 0.9, usageCount: 100, contexts: ['formal'] },
        { text: 'your name', confidence: 0.85, usageCount: 200, contexts: ['casual'] },
        { text: 'name', confidence: 0.8, usageCount: 1500, contexts: ['general'] }
      ],
      
      // Contact Information
      email: [
        { text: 'email', confidence: 1.0, usageCount: 2000, contexts: ['general'] },
        { text: 'email address', confidence: 1.0, usageCount: 1500, contexts: ['formal'] },
        { text: 'e-mail', confidence: 0.9, usageCount: 300, contexts: ['formal'] },
        { text: 'electronic mail', confidence: 0.8, usageCount: 50, contexts: ['technical'] }
      ],
      
      phone: [
        { text: 'phone', confidence: 1.0, usageCount: 1200, contexts: ['general'] },
        { text: 'phone number', confidence: 1.0, usageCount: 1000, contexts: ['formal'] },
        { text: 'mobile', confidence: 0.95, usageCount: 800, contexts: ['general'] },
        { text: 'cell', confidence: 0.9, usageCount: 400, contexts: ['casual'] },
        { text: 'telephone', confidence: 0.85, usageCount: 200, contexts: ['formal'] },
        { text: 'contact number', confidence: 0.9, usageCount: 300, contexts: ['formal'] }
      ],
      
      // Family Information
      fatherName: [
        { text: 'father name', confidence: 1.0, usageCount: 400, contexts: ['government', 'education'] },
        { text: 'fathers name', confidence: 1.0, usageCount: 350, contexts: ['government'] },
        { text: 'paternal name', confidence: 0.9, usageCount: 100, contexts: ['formal'] },
        { text: 'dad name', confidence: 0.8, usageCount: 50, contexts: ['casual'] }
      ],
      
      motherName: [
        { text: 'mother name', confidence: 1.0, usageCount: 300, contexts: ['government', 'education'] },
        { text: 'mothers name', confidence: 1.0, usageCount: 250, contexts: ['government'] },
        { text: 'maternal name', confidence: 0.9, usageCount: 80, contexts: ['formal'] },
        { text: 'mom name', confidence: 0.8, usageCount: 30, contexts: ['casual'] }
      ],
      
      // Address Information
      address: [
        { text: 'address', confidence: 1.0, usageCount: 1500, contexts: ['general'] },
        { text: 'street address', confidence: 0.95, usageCount: 500, contexts: ['formal'] },
        { text: 'home address', confidence: 0.9, usageCount: 300, contexts: ['general'] },
        { text: 'residential address', confidence: 0.85, usageCount: 150, contexts: ['formal'] }
      ],
      
      city: [
        { text: 'city', confidence: 1.0, usageCount: 1000, contexts: ['general'] },
        { text: 'town', confidence: 0.9, usageCount: 200, contexts: ['general'] },
        { text: 'municipality', confidence: 0.8, usageCount: 100, contexts: ['formal'] }
      ],
      
      state: [
        { text: 'state', confidence: 1.0, usageCount: 800, contexts: ['general'] },
        { text: 'province', confidence: 0.9, usageCount: 200, contexts: ['international'] },
        { text: 'region', confidence: 0.8, usageCount: 150, contexts: ['general'] }
      ],
      
      zipCode: [
        { text: 'zip code', confidence: 1.0, usageCount: 600, contexts: ['us'] },
        { text: 'postal code', confidence: 0.95, usageCount: 400, contexts: ['international'] },
        { text: 'zip', confidence: 0.9, usageCount: 300, contexts: ['us'] },
        { text: 'postcode', confidence: 0.85, usageCount: 200, contexts: ['uk'] }
      ],
      
      // Date Information
      dateOfBirth: [
        { text: 'date of birth', confidence: 1.0, usageCount: 500, contexts: ['general'] },
        { text: 'birth date', confidence: 0.95, usageCount: 300, contexts: ['formal'] },
        { text: 'dob', confidence: 0.9, usageCount: 200, contexts: ['technical'] },
        { text: 'birthday', confidence: 0.8, usageCount: 100, contexts: ['casual'] }
      ],
      
      // Emergency Contact
      emergencyContactName: [
        { text: 'emergency contact', confidence: 1.0, usageCount: 300, contexts: ['medical', 'employment'] },
        { text: 'emergency contact name', confidence: 1.0, usageCount: 250, contexts: ['formal'] },
        { text: 'emergency person', confidence: 0.9, usageCount: 100, contexts: ['general'] },
        { text: 'contact person', confidence: 0.8, usageCount: 200, contexts: ['general'] }
      ],
      
      emergencyContactPhone: [
        { text: 'emergency contact phone', confidence: 1.0, usageCount: 200, contexts: ['formal'] },
        { text: 'emergency phone', confidence: 0.95, usageCount: 150, contexts: ['general'] },
        { text: 'emergency number', confidence: 0.9, usageCount: 100, contexts: ['general'] }
      ],
      
      // Professional Information
      company: [
        { text: 'company', confidence: 1.0, usageCount: 600, contexts: ['employment'] },
        { text: 'employer', confidence: 0.95, usageCount: 300, contexts: ['formal'] },
        { text: 'organization', confidence: 0.9, usageCount: 200, contexts: ['formal'] },
        { text: 'workplace', confidence: 0.85, usageCount: 100, contexts: ['general'] }
      ],
      
      jobTitle: [
        { text: 'job title', confidence: 1.0, usageCount: 400, contexts: ['employment'] },
        { text: 'position', confidence: 0.9, usageCount: 300, contexts: ['employment'] },
        { text: 'role', confidence: 0.85, usageCount: 200, contexts: ['employment'] },
        { text: 'title', confidence: 0.8, usageCount: 500, contexts: ['general'] }
      ],
      
      // Education
      university: [
        { text: 'university', confidence: 1.0, usageCount: 300, contexts: ['education'] },
        { text: 'college', confidence: 0.95, usageCount: 400, contexts: ['education'] },
        { text: 'school', confidence: 0.8, usageCount: 600, contexts: ['education'] },
        { text: 'institution', confidence: 0.85, usageCount: 150, contexts: ['formal'] }
      ],
      
      degree: [
        { text: 'degree', confidence: 1.0, usageCount: 200, contexts: ['education'] },
        { text: 'qualification', confidence: 0.9, usageCount: 150, contexts: ['formal'] },
        { text: 'education level', confidence: 0.85, usageCount: 100, contexts: ['general'] }
      ]
    };
  }

  // CORE METHOD: Predict field type using ML
  async predictFieldType(element, formContext = {}) {
    try {
      // Extract all available features
      const features = await this.extractFeatures(element, formContext);
      
      // Find best matches using semantic analysis
      const candidates = await this.findFieldCandidates(features);
      
      // Calculate confidence scores
      const predictions = await this.calculateConfidenceScores(candidates, features);
      
      // Return top prediction
      const topPrediction = predictions[0];
      
      console.log(`[ML] Predicted "${features.labelText}" → ${topPrediction?.fieldType} (${topPrediction?.confidence})`);
      
      return {
        fieldType: topPrediction?.fieldType || 'unknown',
        confidence: topPrediction?.confidence || 0,
        alternatives: predictions.slice(1, 4), // Top 3 alternatives
        features: features
      };
      
    } catch (error) {
      console.error('[ML] Prediction error:', error);
      return { fieldType: 'unknown', confidence: 0, alternatives: [] };
    }
  }

  // Extract comprehensive features from form element
  async extractFeatures(element, formContext) {
    return {
      // Text features
      labelText: this.findLabel(element),
      placeholderText: element.placeholder || '',
      nameAttribute: element.name || '',
      idAttribute: element.id || '',
      
      // Element features
      inputType: element.type || element.tagName.toLowerCase(),
      maxLength: element.maxLength || 0,
      required: element.required || false,
      pattern: element.pattern || '',
      
      // Context features
      formTitle: this.extractFormTitle(),
      formDomain: window.location.hostname,
      formPath: window.location.pathname,
      
      // Position features
      fieldPosition: this.getElementPositionInForm(element),
      nearbyLabels: this.getNearbyLabels(element),
      previousFields: this.getPreviousFieldTypes(element),
      
      // Visual features
      isVisible: this.isElementVisible(element),
      hasLabel: this.hasAssociatedLabel(element),
      
      // Enhanced context
      formContext: formContext,
      
      // Normalized for ML
      normalizedLabel: this.normalizeText(this.findLabel(element)),
      normalizedPlaceholder: this.normalizeText(element.placeholder || ''),
      keywords: this.extractKeywords(this.findLabel(element))
    };
  }

  // Find potential field type candidates
  async findFieldCandidates(features) {
    const candidates = [];
    const searchText = features.normalizedLabel || features.normalizedPlaceholder;
    
    if (!searchText) return candidates;
    
    // Search through all field mappings
    for (const [fieldType, patterns] of Object.entries(this.fieldMappings)) {
      for (const pattern of patterns) {
        const similarity = await this.calculateTextSimilarity(searchText, pattern.text);
        
        if (similarity > 0.3) { // Minimum threshold
          candidates.push({
            fieldType,
            pattern,
            similarity,
            baseConfidence: pattern.confidence,
            usageCount: pattern.usageCount,
            contextMatch: this.checkContextMatch(features, pattern.contexts)
          });
        }
      }
    }
    
    return candidates.sort((a, b) => b.similarity - a.similarity);
  }

  // Calculate final confidence scores
  async calculateConfidenceScores(candidates, features) {
    const predictions = [];
    
    for (const candidate of candidates) {
      let confidence = candidate.similarity * candidate.baseConfidence;
      
      // Boost confidence based on usage count
      const usageBoost = Math.min(candidate.usageCount / 1000, 0.2);
      confidence += usageBoost;
      
      // Boost confidence for context match
      if (candidate.contextMatch) {
        confidence += 0.15;
      }
      
      // Boost confidence for exact matches
      if (candidate.similarity > 0.95) {
        confidence += 0.1;
      }
      
      // Boost confidence for input type match
      const typeBoost = this.calculateTypeBoost(candidate.fieldType, features.inputType);
      confidence += typeBoost;
      
      // Cap at 1.0
      confidence = Math.min(confidence, 1.0);
      
      predictions.push({
        fieldType: candidate.fieldType,
        confidence: confidence,
        pattern: candidate.pattern.text,
        similarity: candidate.similarity,
        reasoning: this.generateReasoning(candidate, features)
      });
    }
    
    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  // Calculate semantic similarity between texts
  async calculateTextSimilarity(text1, text2) {
    const cacheKey = `${text1}|${text2}`;
    if (this.semanticCache.has(cacheKey)) {
      return this.semanticCache.get(cacheKey);
    }
    
    // Normalize texts
    const norm1 = this.normalizeText(text1);
    const norm2 = this.normalizeText(text2);
    
    // Exact match
    if (norm1 === norm2) {
      this.semanticCache.set(cacheKey, 1.0);
      return 1.0;
    }
    
    // Word-based similarity
    const words1 = this.extractKeywords(norm1);
    const words2 = this.extractKeywords(norm2);
    
    if (words1.length === 0 || words2.length === 0) {
      this.semanticCache.set(cacheKey, 0);
      return 0;
    }
    
    // Calculate Jaccard similarity
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    const similarity = intersection.length / union.length;
    
    // Bonus for partial matches
    let partialBonus = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          partialBonus += 0.1;
        }
      }
    }
    
    const finalSimilarity = Math.min(similarity + partialBonus, 1.0);
    this.semanticCache.set(cacheKey, finalSimilarity);
    
    return finalSimilarity;
  }

  // LEARNING METHOD: Update mappings with new patterns
  async learnNewPattern(labelText, fieldType, context = {}, userConfirmed = true) {
    const normalizedLabel = this.normalizeText(labelText);
    
    // Check if pattern already exists
    const existingPattern = this.findExistingPattern(normalizedLabel, fieldType);
    
    if (existingPattern) {
      // Update existing pattern
      existingPattern.usageCount++;
      existingPattern.confidence = Math.min(existingPattern.confidence + 0.01, 1.0);
      console.log(`[ML] Updated existing pattern: "${labelText}" → ${fieldType}`);
    } else {
      // Add new pattern
      if (!this.fieldMappings[fieldType]) {
        this.fieldMappings[fieldType] = [];
      }
      
      const newPattern = {
        text: normalizedLabel,
        confidence: userConfirmed ? 0.9 : 0.7,
        usageCount: 1,
        contexts: [context.formType || 'general'],
        learnedFrom: context.domain || window.location.hostname,
        createdAt: Date.now()
      };
      
      this.fieldMappings[fieldType].push(newPattern);
      
      console.log(`[ML] 🧠 LEARNED NEW PATTERN: "${labelText}" → ${fieldType}`);
      
      // Add to learning history
      this.learningHistory.push({
        pattern: labelText,
        fieldType,
        confidence: newPattern.confidence,
        timestamp: Date.now(),
        context
      });
    }
    
    // Trigger save to storage
    await this.saveMappingsToStorage();
  }

  // VALIDATION METHOD: Compare predictions vs actual user input
  async validatePrediction(prediction, actualFieldType, userValue) {
    const isCorrect = prediction.fieldType === actualFieldType;
    
    const validation = {
      predicted: prediction.fieldType,
      actual: actualFieldType,
      confidence: prediction.confidence,
      correct: isCorrect,
      userValue: userValue ? userValue.substring(0, 10) + '...' : '', // Truncated for privacy
      timestamp: Date.now()
    };
    
    if (isCorrect) {
      console.log(`[ML] ✅ CORRECT: ${prediction.fieldType} (confidence: ${prediction.confidence})`);
      
      // Boost confidence of correct pattern
      const pattern = this.findPattern(prediction.pattern, prediction.fieldType);
      if (pattern) {
        pattern.confidence = Math.min(pattern.confidence + 0.02, 1.0);
        pattern.usageCount++;
      }
    } else {
      console.log(`[ML] ❌ INCORRECT: predicted ${prediction.fieldType}, actual ${actualFieldType}`);
      
      // Learn from mistake
      if (actualFieldType !== 'unknown') {
        await this.learnNewPattern(prediction.features?.labelText, actualFieldType, {}, true);
      }
    }
    
    return validation;
  }

  // Helper methods
  normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractKeywords(text) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'your', 'enter', 'please'];
    return this.normalizeText(text)
      .split(' ')
      .filter(word => word.length > 1 && !stopWords.includes(word));
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

  checkContextMatch(features, patternContexts) {
    const formType = this.detectFormType(features);
    return patternContexts.includes(formType) || patternContexts.includes('general');
  }

  detectFormType(features) {
    const domain = features.formDomain.toLowerCase();
    const title = features.formTitle.toLowerCase();
    const path = features.formPath.toLowerCase();
    
    if (domain.includes('gov') || title.includes('government')) return 'government';
    if (domain.includes('job') || domain.includes('career') || title.includes('application')) return 'employment';
    if (domain.includes('school') || domain.includes('edu') || title.includes('admission')) return 'education';
    if (domain.includes('bank') || title.includes('account') || title.includes('loan')) return 'financial';
    if (title.includes('medical') || title.includes('health')) return 'medical';
    
    return 'general';
  }

  findExistingPattern(normalizedLabel, fieldType) {
    const patterns = this.fieldMappings[fieldType] || [];
    return patterns.find(pattern => pattern.text === normalizedLabel);
  }

  findPattern(patternText, fieldType) {
    const patterns = this.fieldMappings[fieldType] || [];
    return patterns.find(pattern => pattern.text === patternText);
  }

  async saveMappingsToStorage() {
    try {
      await chrome.storage.local.set({
        dynamicFieldMappings: this.fieldMappings,
        learningHistory: this.learningHistory
      });
      console.log('[ML] Saved', Object.keys(this.fieldMappings).length, 'field types with', 
                  Object.values(this.fieldMappings).reduce((sum, patterns) => sum + patterns.length, 0), 'total patterns');
    } catch (error) {
      console.error('[ML] Error saving mappings:', error);
    }
  }

  async loadMappingsFromStorage() {
    try {
      const { dynamicFieldMappings, learningHistory } = await chrome.storage.local.get([
        'dynamicFieldMappings',
        'learningHistory'
      ]);
      
      if (dynamicFieldMappings) {
        // Merge with existing mappings
        for (const [fieldType, patterns] of Object.entries(dynamicFieldMappings)) {
          if (this.fieldMappings[fieldType]) {
            this.fieldMappings[fieldType] = [...this.fieldMappings[fieldType], ...patterns];
          } else {
            this.fieldMappings[fieldType] = patterns;
          }
        }
      }
      
      if (learningHistory) {
        this.learningHistory = learningHistory;
      }
      
      console.log('[ML] Loaded dynamic mappings from storage');
    } catch (error) {
      console.error('[ML] Error loading mappings:', error);
    }
  }

  // Additional helper methods for form analysis
  extractFormTitle() {
    return document.title || 
           document.querySelector('h1')?.textContent || 
           document.querySelector('.form-title')?.textContent || 
           '';
  }

  getElementPositionInForm(element) {
    const form = element.closest('form') || document.body;
    const allInputs = form.querySelectorAll('input, textarea, select');
    const position = Array.from(allInputs).indexOf(element);
    return {
      position: position + 1,
      total: allInputs.length,
      percentage: ((position + 1) / allInputs.length) * 100
    };
  }

  getNearbyLabels(element) {
    const container = element.closest('form, .form-group, .field, div') || element.parentElement;
    if (!container) return [];
    
    return Array.from(container.querySelectorAll('label'))
      .map(label => this.normalizeText(label.textContent))
      .filter(text => text.length > 0);
  }

  getPreviousFieldTypes(element) {
    // This would track previously identified field types in the form
    // For now, return empty array
    return [];
  }

  isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
  }

  hasAssociatedLabel(element) {
    return this.findLabel(element).length > 0;
  }

  calculateTypeBoost(fieldType, inputType) {
    const typeBoosts = {
      'email': inputType === 'email' ? 0.2 : 0,
      'phone': ['tel', 'phone'].includes(inputType) ? 0.2 : 0,
      'dateOfBirth': inputType === 'date' ? 0.2 : 0,
      'zipCode': inputType === 'number' ? 0.1 : 0
    };
    
    return typeBoosts[fieldType] || 0;
  }

  generateReasoning(candidate, features) {
    const reasons = [];
    
    if (candidate.similarity > 0.9) reasons.push('exact text match');
    else if (candidate.similarity > 0.7) reasons.push('high text similarity');
    
    if (candidate.contextMatch) reasons.push('context match');
    if (candidate.usageCount > 500) reasons.push('commonly used pattern');
    
    return reasons.join(', ') || 'pattern similarity';
  }

  // Get statistics for debugging/monitoring
  getStatistics() {
    const totalPatterns = Object.values(this.fieldMappings)
      .reduce((sum, patterns) => sum + patterns.length, 0);
    
    const fieldTypeCount = Object.keys(this.fieldMappings).length;
    const learningHistoryCount = this.learningHistory.length;
    
    return {
      totalPatterns,
      fieldTypeCount,
      learningHistoryCount,
      cacheSize: this.semanticCache.size
    };
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MLFieldRecognizer;
} else if (typeof window !== 'undefined') {
  window.MLFieldRecognizer = MLFieldRecognizer;
}
