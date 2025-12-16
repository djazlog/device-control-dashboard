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
            v-for="log in filteredLogs"
            :key="log.id"
            :class="['log-entry', log.type, { 'log-error': parseLogMessage(log)?.isError }]"
          >
            <span class="timestamp">
              {{ formatTime(log.timestamp) }}
            </span>
            <span class="log-content">
              <span v-if="log.type === 'command'" class="command-prefix">$</span>
              <span v-else-if="log.type === 'response'" class="response-prefix">></span>
              <span v-else-if="log.type === 'error'" class="error-prefix">!</span>
              <span v-else-if="log.type === 'ping' || isPingMessage(log)" class="command-prefix">ping</span>
              
              <template v-if="log.type === 'command'">
                {{ log.message || log.command }}
              </template>
              <template v-else-if="log.type === 'ping' || isPingMessage(log)">
                <!-- PING - просто показываем ping, ничего больше -->
              </template>
              <template v-else>
                <template v-if="parseLogMessage(log)">
                  <span class="parsed-log">
                    <!-- Если есть output для успешного ответа, показываем его сразу -->
                    <template v-if="parseLogMessage(log).output">
                      <div class="output-content" v-html="formatOutput(parseLogMessage(log).output)"></div>
                      <span 
                        class="log-header" 
                        @click="toggleLogExpansion(log.id)"
                        :class="{ 'clickable': true }"
                      >
                        <span class="expand-icon">
                          <ChevronRightIcon v-if="!isLogExpanded(log.id)" :size="14" />
                          <ChevronDownIcon v-else :size="14" />
                        </span>
                        <span class="log-status" v-if="false">Show full JSON</span>
                      </span>
                    </template>
                    <template v-else>
                      <span 
                        class="log-header" 
                        @click="toggleLogExpansion(log.id)"
                        :class="{ 'clickable': true }"
                      >
                        <span class="expand-icon">
                          <ChevronRightIcon v-if="!isLogExpanded(log.id)" :size="14" />
                          <ChevronDownIcon v-else :size="14" />
                        </span>
                        <span class="log-status" :class="{ 'status-error': parseLogMessage(log).isError }">
                          <template v-if="parseLogMessage(log).inner">
                            {{ parseLogMessage(log).inner.status || 'success' }}
                            <template v-if="parseLogMessage(log).inner.data?.error">
                              : {{ parseLogMessage(log).inner.data.error }}
                            </template>
                          </template>
                          <template v-else-if="parseLogMessage(log).outer.status">
                            {{ parseLogMessage(log).outer.status }}
                          </template>
                        </span>
                      </span>
                    </template>
                    <div v-if="isLogExpanded(log.id)" class="log-details">
                      <pre class="json-view">{{ formatJsonForDisplay(parseLogMessage(log)) }}</pre>
                    </div>
                  </span>
                </template>
                <template v-else>
                  {{ log.message }}
                </template>
              </template>
            </span>
          </div>
          
          <div v-if="!props.connection?.logs || props.connection.logs.length === 0" class="empty-logs">
            No logs yet. Send a command to get started.
          </div>
        </div>
  
        <div class="terminal-input">
          <div class="input-group">
            <span class="prompt">$</span>
            <input
              ref="commandInputRef"
              v-model="commandInput"
              @keydown.enter="handleEnterKey"
              placeholder="Enter command (e.g., ls -a, get_device_info, service list, etc.)"
              class="command-input"
              :disabled="!props.connection?.isConnected"
            />
            <button 
              @click="sendMessage" 
              class="btn btn-primary"
              :disabled="!commandInput.trim() || !props.connection?.isConnected"
            >
              Send
            </button>
          </div>
  
          <div v-if="!props.connection?.isConnected" class="connection-status">
            <span class="status-text">Connecting to WebSocket...</span>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue';
  import { Trash2Icon, XIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-vue-next';
  
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
  const commandInputRef = ref(null);
  const expandedLogs = ref(new Set());

  // Фильтруем логи, исключая ping сообщения и сообщения об успешной отправке
  const filteredLogs = computed(() => {
    return (props.connection?.logs || []).filter(log => {
      // Исключаем ping сообщения
      if (log.type === 'ping' || isPingMessage(log)) {
        return false;
      }
      
      // Исключаем сообщения об успешной отправке команды
      if (log.message) {
        try {
          const parsed = JSON.parse(log.message);
          if (parsed.type === 'success' && parsed.message === 'command sent successfully') {
            return false;
          }
        } catch (e) {
          // Не JSON, пропускаем
        }
      }
      
      return true;
    });
  });
  
  // Автопрокрутка к новым логам
  watch(() => props.connection?.logs, async () => {
    await nextTick();
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }
  }, { deep: true });
  
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  function parseLogMessage(log) {
    // Если это обычное сообщение, возвращаем как есть
    if (!log.message || typeof log.message !== 'string') {
      return null;
    }

    try {
      // Пытаемся распарсить как JSON
      const parsed = JSON.parse(log.message);
      
      // Если это PING, не парсим дальше
      if (parsed.type === 'PING') {
        return null;
      }
      
      // Проверяем, есть ли поле data, которое само является JSON строкой
      if (parsed.data && typeof parsed.data === 'string') {
        try {
          const innerData = JSON.parse(parsed.data);
          // Извлекаем output из успешных ответов: data.data.data.output
          // Приоритет у error: если есть error, показываем его, иначе показываем output
          let output = null;
          if (innerData.status === 'success') {
            const dataOutput = innerData.data?.data?.output;
            const dataError = innerData.data?.data?.error;
            
            if (dataError && dataError.trim() !== '') {
              // Если есть error, показываем его
              output = dataError;
            } else if (dataOutput && dataOutput.trim() !== '') {
              // Если error нет, но есть output, показываем output
              output = dataOutput;
            }
          }
          
          return {
            outer: parsed,
            inner: innerData,
            isError: innerData.status === 'error',
            output: output,
            rawMessage: log.message
          };
        } catch (e) {
          // Если внутренний data не JSON, возвращаем только внешний
          return {
            outer: parsed,
            inner: null,
            isError: false,
            output: null,
            rawMessage: log.message
          };
        }
      }
      
      // Также проверяем, если data уже объект (не строка)
      if (parsed.data && typeof parsed.data === 'object') {
        // Извлекаем output из успешных ответов: data.data.data.output
        // Приоритет у error: если есть error, показываем его, иначе показываем output
        let output = null;
        if (parsed.data.status === 'success') {
          const dataOutput = parsed.data.data?.data?.output;
          const dataError = parsed.data.data?.data?.error;
          
          if (dataError && dataError.trim() !== '') {
            // Если есть error, показываем его
            output = dataError;
          } else if (dataOutput && dataOutput.trim() !== '') {
            // Если error нет, но есть output, показываем output
            output = dataOutput;
          }
        }
        
        return {
          outer: parsed,
          inner: parsed.data,
          isError: parsed.data.status === 'error',
          output: output,
          rawMessage: log.message
        };
      }
      
      // Если нет вложенного data, возвращаем просто распарсенный объект
      let output = null;
      if (parsed.status === 'success') {
        const dataOutput = parsed.data?.data?.output;
        const dataError = parsed.data?.data?.error;
        
        if (dataError && dataError.trim() !== '') {
          // Если есть error, показываем его
          output = dataError;
        } else if (dataOutput && dataOutput.trim() !== '') {
          // Если error нет, но есть output, показываем output
          output = dataOutput;
        }
      }
      
      return {
        outer: parsed,
        inner: null,
        isError: parsed.status === 'error',
        output: output,
        rawMessage: log.message
      };
    } catch (e) {
      // Не JSON, возвращаем null
      return null;
    }
  }

  function toggleLogExpansion(logId) {
    if (expandedLogs.value.has(logId)) {
      expandedLogs.value.delete(logId);
    } else {
      expandedLogs.value.add(logId);
    }
  }

  function isLogExpanded(logId) {
    return expandedLogs.value.has(logId);
  }

  function formatJsonForDisplay(parsedLog) {
    if (!parsedLog) return '';
    try {
      // Форматируем полный объект с учетом вложенности
      const displayObj = { ...parsedLog.outer };
      if (parsedLog.inner) {
        displayObj.data = parsedLog.inner;
      }
      return JSON.stringify(displayObj, null, 2);
    } catch (e) {
      return parsedLog.rawMessage;
    }
  }

  function formatOutput(output) {
    if (!output) return '';
    // Заменяем \n на <br> и экранируем HTML для безопасности
    return output
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\r\n/g, '<br>')
      .replace(/\r/g, '<br>');
  }

  function isPingMessage(log) {
    if (!log.message || typeof log.message !== 'string') {
      return false;
    }
    try {
      const parsed = JSON.parse(log.message);
      return parsed.type === 'PING';
    } catch (e) {
      return false;
    }
  }
  
  function handleEnterKey(event) {
    event.preventDefault();
    sendMessage();
  }

  function sendMessage() {
    const input = commandInput.value.trim();
    if (!input) return;
    
    if (!props.connection) {
      console.error('Connection object is not available');
      return;
    }
    
    if (typeof props.connection.sendMessage !== 'function') {
      console.error('sendMessage method is not available on connection object', props.connection);
      return;
    }
    
    // Проверяем соединение, но не блокируем отправку - метод sendMessage сам проверит
    if (!props.connection.isConnected) {
      console.warn('WebSocket is not connected yet, but attempting to send anyway');
    }
  
    try {
      // Парсим команду и параметры из введенной строки
      // Формат: "command param1=value1 param2=value2" или "command arg1 arg2" или просто "command"
      const parts = input.split(/\s+/);
      const parameters = {};
      let hasKeyValueParams = false;
      
      // Проверяем, есть ли параметры в формате key=value
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const equalIndex = part.indexOf('=');
        if (equalIndex > 0) {
          hasKeyValueParams = true;
          const key = part.substring(0, equalIndex);
          const value = part.substring(equalIndex + 1);
          parameters[key] = value;
        }
      }
      
      // Если есть параметры в формате key=value, используем старую логику
      // Иначе отправляем всю команду целиком
      let command;
      if (hasKeyValueParams) {
        command = parts[0];
      } else {
        // Отправляем всю строку как команду (включая все аргументы)
        command = input;
      }
      
      // Формируем сообщение в требуемом формате
      const message = {
        type: 'command',
        command: command,
        ...(Object.keys(parameters).length > 0 && { parameters: parameters })
      };
      
      const result = props.connection.sendMessage(message);
      // Очищаем поле ввода только если сообщение было успешно отправлено
      if (result !== false) {
        commandInput.value = '';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }
  
  function clearLogs() {
    props.connection.clearLogs();
  }
  
  // Автофокус на инпут при монтировании
  onMounted(() => {
    nextTick(() => {
      if (commandInputRef.value) {
        commandInputRef.value.focus();
      }
      // Проверяем, что connection имеет все необходимые методы
      if (props.connection) {
        console.log('Connection object:', props.connection);
        console.log('sendMessage method:', typeof props.connection.sendMessage);
      }
    });
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
  
  .log-entry.error,
  .log-entry.log-error {
    color: #ef4444;
  }
  
  .log-entry.info {
    color: #6b7280;
  }

  .parsed-log {
    display: inline-flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .log-header {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
    vertical-align: middle;
  }

  .log-header.clickable:hover {
    opacity: 0.8;
  }

  .expand-icon {
    display: flex;
    align-items: center;
    color: #6b7280;
    transition: transform 0.2s;
  }

  .log-status {
    color: #10b981;
    font-weight: 500;
  }

  .log-status.status-error {
    color: #ef4444;
  }

  .log-details {
    margin-top: 8px;
    margin-left: 22px;
    padding: 8px;
    background: #0f0f0f;
    border-radius: 4px;
    border: 1px solid #333;
  }

  .json-view {
    margin: 0;
    color: #d1d5db;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
  }

  .output-content {
    margin-bottom: 8px;
    padding: 8px;
    background: #0f0f0f;
    border-radius: 4px;
    border: 1px solid #333;
    color: #d1d5db;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
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

  .connection-status {
    margin-top: 8px;
    padding: 8px;
    border-radius: 4px;
    background-color: #1a1a1a;
  }

  .status-text {
    color: #9ca3af;
    font-size: 12px;
  }
  </style>