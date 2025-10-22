<template>
    <div class="device-terminal">
      <div class="terminal-header">
        <h3>Terminal: {{ device.deviceId }}</h3>
        <div class="terminal-actions">
          <button @click="clearLogs" class="btn btn-secondary">
            <Trash2Icon :size="14" />
            Clear
          </button>
          <button @click="$emit('close')" class="btn btn-secondary">
            <XIcon :size="14" />
            Close
          </button>
        </div>
      </div>
  
      <div class="terminal-body">
        <div ref="logsContainer" class="terminal-logs">
          <div
            v-for="log in connection.logs"
            :key="log.id"
            :class="['log-entry', log.type]"
          >
            <span class="timestamp">
              {{ formatTime(log.timestamp) }}
            </span>
            <span class="log-content">
              <span v-if="log.type === 'command'" class="command-prefix">$</span>
              <span v-else-if="log.type === 'response'" class="response-prefix">></span>
              <span v-else-if="log.type === 'error'" class="error-prefix">!</span>
              
              <template v-if="log.type === 'command'">
                {{ log.command }} 
                <span v-if="log.parameters && Object.keys(log.parameters).length">
                  {{ formatParameters(log.parameters) }}
                </span>
              </template>
              <template v-else>
                {{ log.message }}
              </template>
            </span>
          </div>
          
          <div v-if="connection.logs.length === 0" class="empty-logs">
            No logs yet. Send a command to get started.
          </div>
        </div>
  
        <div class="terminal-input">
          <div class="input-group">
            <span class="prompt">$</span>
            <input
              v-model="commandInput"
              @keyup.enter="sendCommand"
              placeholder="Enter command (launch_app, reboot_device, get_device_info, etc.)"
              class="command-input"
              :disabled="!device.isOnline"
            />
            <button 
              @click="sendCommand" 
              class="btn btn-primary"
              :disabled="!commandInput.trim() || !device.isOnline"
            >
              Send
            </button>
          </div>
  
          <div class="quick-commands">
            <span class="quick-commands-label">Quick commands:</span>
            <div class="quick-buttons">
              <button
                v-for="cmd in quickCommands"
                :key="cmd.command"
                @click="executeQuickCommand(cmd)"
                class="btn btn-sm btn-outline"
                :disabled="!device.isOnline"
              >
                {{ cmd.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
  import { Trash2Icon, XIcon } from 'lucide-vue-next';
  
  const props = defineProps({
    device: {
      type: Object,
      required: true
    },
    connection: {
      type: Object,
      required: true
    }
  });
  
  const emit = defineEmits(['close']);
  
  const commandInput = ref('');
  const logsContainer = ref(null);
  
  const quickCommands = [
    { command: 'get_device_info', label: 'Device Info', parameters: {} },
    { command: 'ping', label: 'Ping', parameters: {} },
    { command: 'get_logs', label: 'Get Logs', parameters: {} },
    { command: 'launch_app', label: 'Launch Settings', parameters: { package: 'com.android.settings' } },
  ];
  
  // Автопрокрутка к новым логам
  watch(() => props.connection.logs.length, async () => {
    await nextTick();
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }
  });
  
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }
  
  function formatParameters(parameters) {
    return Object.entries(parameters)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
  }
  
  async function sendCommand() {
    if (!commandInput.value.trim() || !props.device.isOnline) return;
  
    const input = commandInput.value.trim();
    let command = input;
    let parameters = {};
  
    // Парсинг параметров из строки (например: "launch_app package=com.example url=http://test")
    const parts = input.split(' ');
    if (parts.length > 0) {
      command = parts[0];
      parameters = {};
      
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const [key, value] = part.split('=');
        if (key && value !== undefined) {
          parameters[key] = value;
        }
      }
    }
  
    try {
      await props.connection.sendCommand(command, parameters);
      commandInput.value = '';
    } catch (error) {
      console.error('Failed to send command:', error);
    }
  }
  
  function executeQuickCommand(cmd) {
    commandInput.value = `${cmd.command} ${Object.entries(cmd.parameters)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ')}`.trim();
    sendCommand();
  }
  
  function clearLogs() {
    props.connection.clearLogs();
  }
  
  // Автофокус на инпут при монтировании
  onMounted(() => {
    const input = document.querySelector('.command-input');
    if (input) input.focus();
  });
  
  // Закрытие соединения при размонтировании
  onUnmounted(() => {
    props.connection.close();
  });
  </script>
  
  <style scoped>
  .device-terminal {
    background: #1a1a1a;
    border-radius: 8px;
    color: #fff;
    display: flex;
    flex-direction: column;
    height: 600px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 14px;
  }
  
  .terminal-header {
    padding: 16px 20px;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #2d2d2d;
  }
  
  .terminal-header h3 {
    margin: 0;
    color: #fff;
    font-size: 16px;
  }
  
  .terminal-actions {
    display: flex;
    gap: 8px;
  }
  
  .terminal-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .terminal-logs {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    background: #1a1a1a;
  }
  
  .log-entry {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
    line-height: 1.4;
  }
  
  .timestamp {
    color: #6b7280;
    font-size: 12px;
    flex-shrink: 0;
    min-width: 80px;
  }
  
  .log-content {
    flex: 1;
  }
  
  .command-prefix {
    color: #10b981;
    font-weight: bold;
    margin-right: 8px;
  }
  
  .response-prefix {
    color: #3b82f6;
    font-weight: bold;
    margin-right: 8px;
  }
  
  .error-prefix {
    color: #ef4444;
    font-weight: bold;
    margin-right: 8px;
  }
  
  .log-entry.command {
    color: #10b981;
  }
  
  .log-entry.response {
    color: #d1d5db;
  }
  
  .log-entry.error {
    color: #ef4444;
  }
  
  .log-entry.info {
    color: #6b7280;
  }
  
  .empty-logs {
    color: #6b7280;
    text-align: center;
    padding: 40px;
    font-style: italic;
  }
  
  .terminal-input {
    padding: 16px;
    border-top: 1px solid #333;
    background: #2d2d2d;
  }
  
  .input-group {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .prompt {
    color: #10b981;
    font-weight: bold;
  }
  
  .command-input {
    flex: 1;
    background: #1a1a1a;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 8px 12px;
    color: #fff;
    font-family: inherit;
    font-size: 14px;
  }
  
  .command-input:focus {
    outline: none;
    border-color: #3b82f6;
  }
  
  .command-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .quick-commands {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .quick-commands-label {
    color: #9ca3af;
    font-size: 12px;
    flex-shrink: 0;
  }
  
  .quick-buttons {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
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
    font-family: inherit;
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
  
  .btn-secondary {
    background-color: #4b5563;
    color: #d1d5db;
    border: 1px solid #6b7280;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: #6b7280;
  }
  
  .btn-outline {
    background-color: transparent;
    color: #d1d5db;
    border: 1px solid #6b7280;
  }
  
  .btn-outline:hover:not(:disabled) {
    background-color: #6b7280;
    color: #fff;
  }
  </style>