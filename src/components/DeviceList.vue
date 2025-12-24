<template>
    <div class="device-list">
      <div class="device-list-header">
        <h2>Connected Devices</h2>
        <div class="controls">
          <input 
            type="text" 
            :value="searchQuery"
            @input="$emit('update-search', $event.target.value)"
            placeholder="Поиск по MAC-адресу..."
            class="search-input"
          />
          <button 
            @click="$emit('refresh')" 
            :disabled="loading"
            class="btn btn-secondary"
          >
            <RefreshCwIcon :size="16" class="icon" />
            Refresh
          </button>
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              :checked="onlineOnly" 
              @change="$emit('toggle-online', $event.target.checked)"
            />
            Show Online Only
          </label>
        </div>
      </div>
  
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        Loading devices...
      </div>
  
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
  
      <div v-else-if="filteredDevices.length === 0" class="empty">
        No devices found
      </div>
  
      <div v-else class="devices-grid">
        <div
          v-for="device in filteredDevices"
          :key="device.deviceId"
          :class="['device-card', { online: device.isOnline, selected: isSelected(device) }]"
          @click="$emit('select', device)"
        >
          <div class="device-header">
            <div class="device-status">
              <div :class="['status-dot', device.isOnline ? 'online' : 'offline']"></div>
              {{ device.isOnline ? 'Online' : 'Offline' }}
            </div>
            <div class="device-actions">
              <button 
                @click.stop="$emit('shell', device)"
                class="btn btn-sm btn-success"
                :disabled="!device.isOnline"
                title="Launch MShell"
              >
                <CommandIcon :size="14" />
                Shell
              </button>
              <button 
                @click.stop="$emit('terminal', device)"
                class="btn btn-sm btn-primary"
                :disabled="!device.isOnline"
              >
                <TerminalIcon :size="14" />
                Terminal
              </button>
            </div>
          </div>
  
          <div class="device-info">
            <h3 class="device-id">{{ device.deviceId }}</h3>
            <div class="device-details">
              <div class="detail">
                <strong>Platform:</strong> {{ device.platform }}
              </div>
              <div class="detail">
                <strong>Model:</strong> {{ device.model }}
              </div>
              <div class="detail">
                <strong>Version:</strong> {{ device.version }}
              </div>
              <div v-if="device.ipAddress" class="detail">
                <strong>IP:</strong> {{ device.ipAddress }}
              </div>
              <div class="detail">
                <strong>Last Seen:</strong> {{ formatDate(device.lastSeen) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue';
  import { RefreshCwIcon, TerminalIcon, CommandIcon } from 'lucide-vue-next';
  
  const props = defineProps({
    devices: {
      type: Array,
      default: () => []
    },
    selectedDevice: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    onlineOnly: {
      type: Boolean,
      default: false
    },
    searchQuery: {
      type: String,
      default: ''
    }
  });
  
  const emit = defineEmits(['select', 'shell', 'terminal', 'refresh', 'toggle-online', 'update-search']);
  
  const filteredDevices = computed(() => {
    let filtered = props.devices;
    
    // Filter by online status
    if (props.onlineOnly) {
      filtered = filtered.filter(device => device.isOnline);
    }
    
    // Filter by search query (MAC address)
    if (props.searchQuery && props.searchQuery.trim()) {
      const query = props.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(device => 
        device.deviceId.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  });
  
  function isSelected(device) {
    return props.selectedDevice && props.selectedDevice.deviceId === device.deviceId;
  }
  
  function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    // timestamp теперь ISO-строка от HTTP API
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString();
  }
  </script>
  
  <style scoped>
  .device-list {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .device-list-header {
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .device-list-header h2 {
    margin: 0;
    color: #1f2937;
    font-size: 1.5rem;
  }
  
  .controls {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .search-input {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    min-width: 250px;
    transition: border-color 0.2s;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .search-input::placeholder {
    color: #9ca3af;
  }  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #6b7280;
  }
  
  .loading, .error, .empty {
    padding: 40px;
    text-align: center;
    color: #6b7280;
  }
  
  .error {
    color: #ef4444;
  }
  
  .spinner {
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
    margin: 0 auto 10px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .devices-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    padding: 20px;
  }
  
  .device-card {
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    background: white;
  }
  
  .device-card:hover {
    border-color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .device-card.selected {
    border-color: #3b82f6;
    background-color: #f0f9ff;
  }
  
  .device-card.online {
    border-left: 4px solid #10b981;
  }
  
  .device-card.offline {
    border-left: 4px solid #6b7280;
  }
  
  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .device-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
  }
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  
  .status-dot.online {
    background-color: #10b981;
  }
  
  .status-dot.offline {
    background-color: #6b7280;
  }
  
  .device-actions {
    display: flex;
    gap: 8px;
  }
  
  .device-id {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    word-break: break-all;
  }
  
  .device-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .detail {
    font-size: 14px;
    color: #6b7280;
  }
  
  .detail strong {
    color: #374151;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-sm {
    padding: 6px 10px;
    font-size: 12px;
  }
  
  .btn-primary {
    background-color: #3b82f6;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .btn-success {
    background-color: #10b981;
    color: white;
  }

  .btn-success:hover:not(:disabled) {
    background-color: #059669;
  }
  
  .btn-secondary {
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: #e5e7eb;
  }
  
  .icon {
    flex-shrink: 0;
  }
  </style>