// Authentication handler for popup
class PopupAuth {
  constructor() {
    this.supabase = null;
    this.isAuthenticated = false;
    
    // CHANGE: Create a promise that resolves when init() is complete
    this.initialized = new Promise(resolve => {
      this.resolveInitialized = resolve;
    });

    this.init();
  }

  async init() {
    // Load Supabase client
    await this.loadSupabaseClient();
    
    // Check authentication status
    await this.checkAuth();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Update UI based on auth status
    this.updateAuthUI();

    // CHANGE: Signal that initialization is finished
    this.resolveInitialized();
  }

  async loadSupabaseClient() {
    return new Promise((resolve) => {
      // Check if already loaded
      if (window.supabase) {
        this.supabase = window.supabase;
        return resolve();
      }
      const script = document.createElement('script');
      script.src = 'supabase-client.js';
      script.onload = () => {
        this.supabase = window.supabase;
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  async checkAuth() {
    if (this.supabase) {
      // This needs to wait for the client's own async init
      await this.supabase.initializeAuth(); 
      this.isAuthenticated = this.supabase.isAuthenticated();
    }
  }

  setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    }

    if (showSignup) {
      showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSignupForm();
      });
    }

    if (showLogin) {
      showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.showLoginForm();
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    this.showAuthLoading(true, 'login');

    try {
      const { data, error } = await this.supabase.signIn(email, password);
      
      if (error || !data.user) {
        this.showAuthError(error?.message || 'Invalid login credentials.', 'login');
      } else {
        this.isAuthenticated = true;
        this.showAuthSuccess('Logged in successfully!', 'login');
        
        // Wait a moment before switching UI
        setTimeout(() => {
          this.updateAuthUI();
          if (window.initializePopup) {
            window.initializePopup();
          }
        }, 500);
      }
    } catch (error) {
      this.showAuthError('Login failed. Please try again.', 'login');
    } finally {
      this.showAuthLoading(false, 'login');
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      this.showAuthError('Passwords do not match', 'signup');
      return;
    }

    this.showAuthLoading(true, 'signup');

    try {
      const { data, error } = await this.supabase.signUp(email, password);
      
      if (error) {
        this.showAuthError(error.message, 'signup');
      } else {
        this.showAuthSuccess('Account created! Please check your email for verification.', 'signup');
        setTimeout(() => this.showLoginForm(), 2000);
      }
    } catch (error) {
      this.showAuthError('Signup failed. Please try again.', 'signup');
    } finally {
      this.showAuthLoading(false, 'signup');
    }
  }

  async handleLogout() {
    try {
      await this.supabase.signOut();
      this.isAuthenticated = false;
      this.updateAuthUI();
    } catch (error) {
        console.error('Logout failed:', error);
    }
  }

  showLoginForm() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('signupSection').style.display = 'none';
  }

  showSignupForm() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('signupSection').style.display = 'block';
  }

  updateAuthUI() {
    const authContainer = document.getElementById('authContainer');
    const mainContainer = document.getElementById('mainContainer');
    const authStatus = document.getElementById('authStatus');
    const userEmailSpan = authStatus ? authStatus.querySelector('.status-text') : null;

    if (this.isAuthenticated) {
      if (authContainer) authContainer.style.display = 'none';
      if (mainContainer) mainContainer.style.display = 'block';
      if (authStatus && userEmailSpan) {
        userEmailSpan.textContent = `Logged in as: ${this.supabase.user?.email || 'User'}`;
        authStatus.style.display = 'flex';
      }
    } else {
      if (authContainer) authContainer.style.display = 'block';
      if (mainContainer) mainContainer.style.display = 'none';
      if (authStatus) authStatus.style.display = 'none';
      this.showLoginForm(); // Default to login form when logged out
    }
  }

  showAuthLoading(show, formType) {
    const form = document.getElementById(`${formType}Form`);
    if(form) form.querySelector('.auth-loading').style.display = show ? 'block' : 'none';
  }

  showAuthError(message, formType) {
    const form = document.getElementById(`${formType}Form`);
    if(form) {
        const el = form.querySelector('.auth-error');
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 5000);
    }
  }

  showAuthSuccess(message, formType) {
    const form = document.getElementById(`${formType}Form`);
     if(form) {
        const el = form.querySelector('.auth-success');
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 3000);
    }
  }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.popupAuth = new PopupAuth();
});
