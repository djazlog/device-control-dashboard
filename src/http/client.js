import axios from 'axios';

class HttpClient {
  constructor(baseUrl) {
    this.api = axios.create({
      baseURL: baseUrl || 'http://localhost:8081',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Добавляем interceptor для автоматической подстановки токена
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Обрабатываем ошибки авторизации
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          // Токен невалиден или истек - очищаем авторизацию
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          // Перенаправляем на страницу логина, если не на ней уже
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  mapDevice(payload) {
    if (!payload) return null;
    return {
      deviceId: payload.device_id,
      platform: payload.platform,
      model: payload.model,
      version: payload.version,
      manufacturer: payload.manufacturer,
      appVersion: payload.app_version,
      ipAddress: payload.ip_address,
      isOnline: payload.is_online,
      lastSeen: payload.last_seen,
      createdAt: payload.created_at,
      connectionId: payload.connection_id
    };
  }

  async getDevices(onlineOnly = false) {
    const { data } = await this.api.get('/devices', {
      params: { onlineOnly }
    });
    const list = Array.isArray(data)
      ? data.map(d => this.mapDevice(d))
      : (Array.isArray(data?.devices) ? data.devices.map(d => this.mapDevice(d)) : []);
    return { devicesList: list };
  }

  async getDeviceInfo(deviceId) {
    const { data } = await this.api.get(`/device/${encodeURIComponent(deviceId)}`);
    return { device: this.mapDevice(data) };
  }

  async sendCommand(deviceId, command, parameters = {}) {
    const { data } = await this.api.post(`/devices/${encodeURIComponent(deviceId)}/command`, {
      command,
      parameters
    });
    // ожидается success/message в логике терминала
    return { success: Boolean(data?.success), message: data?.message ?? '' };
  }

  async broadcastCommand(command, parameters = {}, deviceIds = []) {
    const { data } = await this.api.post('/devices:broadcast', {
      command,
      parameters,
      deviceIds
    });
    return { success: Boolean(data?.success), message: data?.message ?? '' };
  }

  async getDeviceLogs(deviceId, limit = 100) {
    const { data } = await this.api.get(`/device-logs/${encodeURIComponent(deviceId)}`, {
      params: { limit }
    });
    return { logsList: Array.isArray(data) ? data : (data?.logs ?? []) };
  }

  async checkConnection() {
    try {
      await this.getDevices(false);
      return true;
    } catch (e) {
      throw e;
    }
  }

  async login(username, password) {
    const { data } = await this.api.post('/auth/login', {
      username,
      password
    });
    return data;
  }

  async validateToken(token) {
    try {
      const { data } = await this.api.get('/auth/validate', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return data;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      // Игнорируем ошибки при выходе
      console.warn('Logout error:', error);
    }
  }

  // Совместимость с предыдущим API терминала
  createTerminalConnection(deviceId, onMessage, onError, onClose) {
    const connection = {
      deviceId,
      send: (command, params = {}) => this.sendCommand(deviceId, command, params),
      close: () => {
        if (onClose) onClose();
      }
    };
    return connection;
  }
}

const grpcClient = new HttpClient(import.meta.env.VITE_HTTP_API_URL || 'http://localhost:8081');
export default grpcClient;