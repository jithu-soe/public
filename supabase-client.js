// Supabase client for browser extension
class SupabaseClient {
  constructor() {
    this.url = 'https://oymwahrxuvcvlthlfykn.supabase.co';
    this.anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bXdhaHJ4dXZjdmx0aGxmeWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzM3MDUsImV4cCI6MjA2ODYwOTcwNX0.LZ5o5WU9ThfNLsCoGDKHHPsQ2fR8l9xVCj9yKTOS5Gw';
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': this.anonKey
    };
    this.session = null;
    this.user = null;
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      // Try to get existing session from storage
      const result = await chrome.storage.local.get(['supabase_session']);
      if (result.supabase_session) {
        this.session = result.supabase_session;
        this.user = this.session.user;
        
        // Check if session is still valid
        const isValid = await this.validateSession();
        if (!isValid) {
          await this.signOut();
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  async validateSession() {
    if (!this.session?.access_token) return false;
    
    try {
      const response = await fetch(`${this.url}/auth/v1/user`, {
        headers: {
          ...this.headers,
          'Authorization': `Bearer ${this.session.access_token}`
        }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async signUp(email, password) {
    try {
      const response = await fetch(`${this.url}/auth/v1/signup`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          email,
          password,
          options: {
            emailRedirectTo: chrome.runtime.getURL('popup.html')
          }
        })
      });

      const data = await response.json();
      
      if (response.ok && data.session) {
        this.session = data.session;
        this.user = data.user;
        await chrome.storage.local.set({ supabase_session: this.session });
      }

      return { data, error: data.error || null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  async signIn(email, password) {
    try {
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();
      
      if (response.ok && data.access_token) {
        this.session = data;
        this.user = data.user;
        await chrome.storage.local.set({ supabase_session: this.session });
      }

      return { data, error: data.error || null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  async signOut() {
    try {
      if (this.session?.access_token) {
        await fetch(`${this.url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            ...this.headers,
            'Authorization': `Bearer ${this.session.access_token}`
          }
        });
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      this.session = null;
      this.user = null;
      await chrome.storage.local.remove(['supabase_session']);
    }
  }

  isAuthenticated() {
    return !!(this.session?.access_token && this.user);
  }

  getAuthHeaders() {
    if (!this.session?.access_token) {
      throw new Error('Not authenticated');
    }
    
    return {
      ...this.headers,
      'Authorization': `Bearer ${this.session.access_token}`
    };
  }

  async from(table) {
    return new SupabaseTable(this, table);
  }
}

class SupabaseTable {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.url = `${client.url}/rest/v1/${table}`;
    this.filters = [];
    this.selectFields = '*';
    this.orderFields = [];
    this.limitCount = null;
  }

  select(fields = '*') {
    this.selectFields = fields;
    return this;
  }

  eq(column, value) {
    this.filters.push(`${column}=eq.${encodeURIComponent(value)}`);
    return this;
  }

  order(column, options = {}) {
    const direction = options.ascending === false ? 'desc' : 'asc';
    this.orderFields.push(`${column}.${direction}`);
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  async insert(data) {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          ...this.client.getAuthHeaders(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(Array.isArray(data) ? data : [data])
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { data: null, error: result };
      }

      return { data: Array.isArray(data) ? result : result[0], error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  async update(data) {
    try {
      let url = this.url;
      if (this.filters.length > 0) {
        url += '?' + this.filters.join('&');
      }

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...this.client.getAuthHeaders(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { data: null, error: result };
      }

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  async upsert(data, options = {}) {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          ...this.client.getAuthHeaders(),
          'Prefer': 'return=representation,resolution=merge-duplicates'
        },
        body: JSON.stringify(Array.isArray(data) ? data : [data])
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { data: null, error: result };
      }

      return { data: Array.isArray(data) ? result : result[0], error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  async delete() {
    try {
      let url = this.url;
      if (this.filters.length > 0) {
        url += '?' + this.filters.join('&');
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.client.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error };
      }

      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  async execute() {
    try {
      let url = this.url + `?select=${this.selectFields}`;
      
      if (this.filters.length > 0) {
        url += '&' + this.filters.join('&');
      }
      
      if (this.orderFields.length > 0) {
        url += '&order=' + this.orderFields.join(',');
      }
      
      if (this.limitCount) {
        url += `&limit=${this.limitCount}`;
      }

      const response = await fetch(url, {
        headers: this.client.getAuthHeaders()
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { data: null, error: result };
      }

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  // Convenience method for single record
  async single() {
    const result = await this.limit(1).execute();
    if (result.error) return result;
    
    return {
      data: result.data && result.data.length > 0 ? result.data[0] : null,
      error: null
    };
  }
}

// Create global instance - THIS IS THE CORRECTED PART
// This IIFE (Immediately Invoked Function Expression) determines the correct global scope.
// It's 'self' in a Service Worker (which has importScripts) and 'window' in a browser page/popup.
(function() {
    const globalScope = (typeof self !== 'undefined' && self.importScripts) ? self : window;
    globalScope.supabase = new SupabaseClient();
})();
