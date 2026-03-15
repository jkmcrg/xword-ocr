const SETTINGS_KEY = 'ocr_settings';

export class SettingsStore {
  async getAll() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([SETTINGS_KEY], (result) => {
        resolve(result[SETTINGS_KEY] || {});
      });
    });
  }

  async get(key) {
    const settings = await this.getAll();
    return settings[key];
  }

  async saveAll(settings) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [SETTINGS_KEY]: settings }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  async save(key, value) {
    const settings = await this.getAll();
    settings[key] = value;
    return this.saveAll(settings);
  }

  async clear() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.remove([SETTINGS_KEY], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  async hasApiKey() {
    const settings = await this.getAll();
    return Boolean(settings.apiKey);
  }
}
