import { SettingsStore } from '../lib/settings-store.js';

class SettingsApp {
  constructor() {
    this.settingsStore = new SettingsStore();
    this.initElements();
    this.initEventListeners();
    this.loadSettings();
  }

  initElements() {
    this.statusBar = document.getElementById('status-bar');
    this.statusMessage = document.getElementById('status-message');
    
    this.providerSelect = document.getElementById('ocr-provider');
    this.apiKeyInput = document.getElementById('api-key');
    this.toggleKeyBtn = document.getElementById('toggle-key');
    this.providerHelp = document.getElementById('provider-help');
    
    this.azureSettings = document.getElementById('azure-settings');
    this.azureEndpoint = document.getElementById('azure-endpoint');
    
    this.awsSettings = document.getElementById('aws-settings');
    this.awsRegion = document.getElementById('aws-region');
    this.awsSecret = document.getElementById('aws-secret');
    
    this.testBtn = document.getElementById('test-btn');
    this.testResult = document.getElementById('test-result');
    this.saveBtn = document.getElementById('save-btn');
  }

  initEventListeners() {
    this.providerSelect.addEventListener('change', () => this.onProviderChange());
    this.toggleKeyBtn.addEventListener('click', () => this.toggleKeyVisibility());
    this.testBtn.addEventListener('click', () => this.testConnection());
    this.saveBtn.addEventListener('click', () => this.saveSettings());
  }

  async loadSettings() {
    try {
      const settings = await this.settingsStore.getAll();
      
      if (settings.ocrProvider) {
        this.providerSelect.value = settings.ocrProvider;
      }
      if (settings.apiKey) {
        this.apiKeyInput.value = settings.apiKey;
      }
      if (settings.azureEndpoint) {
        this.azureEndpoint.value = settings.azureEndpoint;
      }
      if (settings.awsRegion) {
        this.awsRegion.value = settings.awsRegion;
      }
      if (settings.awsSecret) {
        this.awsSecret.value = settings.awsSecret;
      }
      
      this.onProviderChange();
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  onProviderChange() {
    const provider = this.providerSelect.value;
    
    this.azureSettings.classList.add('hidden');
    this.awsSettings.classList.add('hidden');
    
    switch (provider) {
      case 'google':
        this.providerHelp.textContent = 'Get your API key from the Google Cloud Console. Enable the Cloud Vision API.';
        break;
      case 'azure':
        this.providerHelp.textContent = 'Get your API key from the Azure Portal under your Computer Vision resource.';
        this.azureSettings.classList.remove('hidden');
        break;
      case 'aws':
        this.providerHelp.textContent = 'Use your AWS Access Key ID. Make sure Textract is enabled in your region.';
        this.awsSettings.classList.remove('hidden');
        break;
    }
  }

  toggleKeyVisibility() {
    const isPassword = this.apiKeyInput.type === 'password';
    this.apiKeyInput.type = isPassword ? 'text' : 'password';
  }

  async testConnection() {
    const provider = this.providerSelect.value;
    const apiKey = this.apiKeyInput.value.trim();
    
    if (!apiKey) {
      this.showTestResult('Please enter an API key first.', false);
      return;
    }

    this.testBtn.disabled = true;
    this.testBtn.textContent = 'Testing...';
    this.testResult.classList.add('hidden');

    try {
      const settings = this.gatherSettings();
      const response = await chrome.runtime.sendMessage({
        action: 'testOCR',
        settings
      });

      if (response.success) {
        this.showTestResult('Connection successful! API key is valid.', true);
      } else {
        this.showTestResult(`Connection failed: ${response.error}`, false);
      }
    } catch (err) {
      this.showTestResult(`Error: ${err.message}`, false);
    } finally {
      this.testBtn.disabled = false;
      this.testBtn.textContent = 'Test API Connection';
    }
  }

  showTestResult(message, success) {
    this.testResult.textContent = message;
    this.testResult.className = `test-result ${success ? 'success' : 'error'}`;
    this.testResult.classList.remove('hidden');
  }

  gatherSettings() {
    const settings = {
      ocrProvider: this.providerSelect.value,
      apiKey: this.apiKeyInput.value.trim()
    };

    if (settings.ocrProvider === 'azure') {
      settings.azureEndpoint = this.azureEndpoint.value.trim();
    }

    if (settings.ocrProvider === 'aws') {
      settings.awsRegion = this.awsRegion.value;
      settings.awsSecret = this.awsSecret.value.trim();
    }

    return settings;
  }

  async saveSettings() {
    const settings = this.gatherSettings();

    if (!settings.apiKey) {
      this.showStatus('Please enter an API key.', 'error');
      return;
    }

    if (settings.ocrProvider === 'azure' && !settings.azureEndpoint) {
      this.showStatus('Please enter your Azure endpoint.', 'error');
      return;
    }

    try {
      await this.settingsStore.saveAll(settings);
      this.showStatus('Settings saved!', 'success');
    } catch (err) {
      this.showStatus(`Failed to save: ${err.message}`, 'error');
    }
  }

  showStatus(message, type = 'info') {
    this.statusBar.className = `status-bar ${type}`;
    this.statusMessage.textContent = message;
    this.statusBar.classList.remove('hidden');
    
    if (type === 'success') {
      setTimeout(() => this.statusBar.classList.add('hidden'), 2000);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SettingsApp();
});
