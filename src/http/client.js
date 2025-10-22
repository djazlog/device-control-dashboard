import axios from 'axios';

class HttpClient {
  constructor(baseUrl) {
    this.api = axios.create({
      baseURL: baseUrl || 'http://localhost:8081',
      headers: {
        'Content-Type': 'application/json'
      }
    });
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