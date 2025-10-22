<template>
  <div class="device-details">
    <div class="device-details-header">
      <h3>Device Details</h3>
      <button 
        @click="$emit('close')" 
        class="close-btn"
        aria-label="Close details"
      >
        ×
      </button>
    </div>

    <div v-if="device" class="device-details-content">
      <div class="detail-section">
        <h4>Basic Information</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Device ID</label>
            <span class="device-id">{{ device.deviceId }}</span>
          </div>
          <div class="detail-item">
            <label>Status</label>
            <span :class="['status-badge', device.isOnline ? 'online' : 'offline']">
              {{ device.isOnline ? 'Online' : 'Offline' }}
            </span>
          </div>
          <div class="detail-item">
            <label>Platform</label>
            <span>{{ device.platform }}</span>
          </div>
          <div class="detail-item">
            <label>Model</label>
            <span>{{ device.model }}</span>
          </div>
          <div class="detail-item">
            <label>Version</label>
            <span>{{ device.version }}</span>
          </div>
          <div v-if="device.ipAddress" class="detail-item">
            <label>IP Address</label>
            <span>{{ device.ipAddress }}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>Timestamps</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <label>Last Seen</label>
            <span>{{ formatDate(device.lastSeen) }}</span>
          </div>
          <div v-if="device.firstSeen" class="detail-item">
            <label>First Seen</label>
            <span>{{ formatDate(device.firstSeen) }}</span>
          </div>
        </div>
      </div>

      <div v-if="device.metadata && Object.keys(device.metadata).length > 0" class="detail-section">
        <h4>Additional Information</h4>
        <div class="metadata">
          <div 
            v-for="(value, key) in device.metadata" 
            :key="key" 
            class="metadata-item"
          >
            <label>{{ formatKey(key) }}</label>
            <span>{{ value }}</span>
          </div>
        </div>
      </div>

      <div class="detail-actions">
        <button 
          @click="$emit('terminal', device)"
          :disabled="!device.isOnline"
          class="btn btn-primary"
        >
          <TerminalIcon :size="16" />
          Open Terminal
        </button>
        <button 
          @click="$emit('refresh', device)"
          class="btn btn-secondary"
        >
          <RefreshCwIcon :size="16" />
          Refresh
        </button>
      </div>
    </div>

    <div v-else class="no-device">
      <p>No device selected</p>
    </div>
  </div>
</template>

<script setup>
import { TerminalIcon, RefreshCwIcon } from 'lucide-vue-next';

const props = defineProps({
  device: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'terminal', 'refresh']);

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleString();
}

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
</script>

<style scoped>
.device-details {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: fit-content;
  max-height: 80vh;
  overflow-y: auto;
}

.device-details-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.device-details-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.device-details-content {
  padding: 20px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-of-type {
  margin-bottom: 0;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 1rem;
  font-weight: 600;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-item span {
  font-size: 14px;
  color: #1f2937;
  word-break: break-all;
}

.device-id {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  background-color: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.online {
  background-color: #dcfce7;
  color: #166534;
}

.status-badge.offline {
  background-color: #fee2e2;
  color: #991b1b;
}

.metadata {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metadata-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background-color: #f9fafb;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.metadata-item label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metadata-item span {
  font-size: 14px;
  color: #1f2937;
  word-break: break-all;
}

.detail-actions {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.no-device {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

/* Scrollbar styling */
.device-details::-webkit-scrollbar {
  width: 6px;
}

.device-details::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.device-details::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.device-details::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
