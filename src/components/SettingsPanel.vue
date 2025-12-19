<template>
  <div class="panel">
    <h2 class="panel-title">设置</h2>
    
    <!-- 游戏设置 -->
    <div class="settings-section">
      <div class="section-header">
        <h3 class="section-title">游戏设置</h3>
        <p class="section-desc">调整游戏参数</p>
      </div>
      
      <div class="settings-item">
        <div class="item-info">
          <div class="item-title">主题模式</div>
          <div class="item-desc">切换日间/夜间显示模式</div>
        </div>
        <div class="theme-toggle" @click="store.toggleTheme()">
          <span class="theme-label">{{ store.themeMode === 'light' ? '日间' : '夜间' }}</span>
          <div class="toggle-switch" :class="{ active: store.themeMode === 'dark' }">
            <div class="toggle-thumb"></div>
          </div>
        </div>
      </div>
      
      <div class="settings-item">
        <div class="item-info">
          <div class="item-title">资源产出倍率</div>
          <div class="item-desc">调整金币、圣水、暗黑重油的产出速度（1-10倍）</div>
        </div>
        <div class="multiplier-control">
          <button class="multiplier-btn" @click="decreaseMultiplier" :disabled="store.resourceMultiplier <= 1">−</button>
          <span class="multiplier-value">{{ store.resourceMultiplier }}x</span>
          <button class="multiplier-btn" @click="increaseMultiplier" :disabled="store.resourceMultiplier >= 10">+</button>
        </div>
      </div>
    </div>
    
    <!-- 数据管理 -->
    <div class="settings-section">
      <div class="section-header">
        <h3 class="section-title">数据管理</h3>
        <p class="section-desc">导出、导入或清除游戏数据</p>
      </div>
      
      <!-- 导出数据 -->
      <div class="settings-item">
        <div class="item-info">
          <div class="item-title">导出数据</div>
          <div class="item-desc">将游戏进度导出为加密存档文件</div>
        </div>
        <button class="action-btn" @click="handleExport">
          <span class="btn-icon">↓</span>
          导出
        </button>
      </div>
      
      <!-- 导入数据 -->
      <div class="settings-item">
        <div class="item-info">
          <div class="item-title">导入数据</div>
          <div class="item-desc">从加密存档文件恢复游戏进度</div>
        </div>
        <button class="action-btn" @click="triggerImport">
          <span class="btn-icon">↑</span>
          导入
        </button>
        <input 
          type="file" 
          ref="fileInput" 
          accept=".json" 
          style="display: none" 
          @change="handleImport"
        />
      </div>
      
      <!-- 清除数据 -->
      <div class="settings-item danger">
        <div class="item-info">
          <div class="item-title danger-text">清除数据</div>
          <div class="item-desc">删除所有游戏数据并重置游戏</div>
        </div>
        <button class="action-btn danger-btn" @click="handleClear">
          <span class="btn-icon">🗑</span>
          清除
        </button>
      </div>
    </div>
    
    <!-- 帮助 -->
    <div class="settings-section">
      <div class="section-header">
        <h3 class="section-title">帮助</h3>
        <p class="section-desc">新手引导与游戏帮助</p>
      </div>
      
      <div class="settings-item">
        <div class="item-info">
          <div class="item-title">新手引导</div>
          <div class="item-desc">重新查看游戏玩法介绍</div>
        </div>
        <button class="action-btn" @click="showTutorial">
          <span class="btn-icon">📖</span>
          查看引导
        </button>
      </div>
    </div>
    
    <!-- 关于 -->
    <div class="settings-section">
      <div class="section-header">
        <h3 class="section-title">关于</h3>
        <p class="section-desc">项目信息与交流群</p>
      </div>
      
      <div class="settings-item">
        <div class="item-info">
          <div class="item-title">开源地址</div>
          <div class="item-desc">查看项目源代码，欢迎 Star ⭐</div>
        </div>
        <a href="https://github.com/foxdad/coc" target="_blank" class="link-btn">
          <span class="btn-icon">📦</span>
          GitHub
        </a>
      </div>
      
      <div class="settings-item">
        <div class="item-info">
          <div class="item-title">QQ交流群</div>
          <div class="item-desc">加入群聊，反馈问题或交流游戏心得</div>
        </div>
        <a href="https://qm.qq.com/cgi-bin/qm/qr?k=YOUR_KEY&jump_from=webapi&authKey=YOUR_AUTH" 
           target="_blank" 
           class="link-btn qq-btn"
           @click.prevent="joinQQGroup">
          <span class="btn-icon">💬</span>
          650772312
        </a>
      </div>
    </div>
    
    <!-- 提示消息 -->
    <div v-if="message" class="message" :class="{ error: isError, success: !isError }">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const fileInput = ref(null)
const message = ref('')
const isError = ref(false)

function showMessage(text, error = false) {
  message.value = text
  isError.value = error
  setTimeout(() => { message.value = '' }, 3000)
}

// 当前版本号
const SAVE_VERSION = '1.0.0'

// 生成随机密钥（16-32位随机字符串）
function generateRandomKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  const length = 16 + Math.floor(Math.random() * 17) // 16-32位
  let key = ''
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

// 加密函数：使用动态密钥进行XOR加密
function encrypt(data, key) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data)
  // Base64编码
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)))
  // 使用密钥进行XOR加密
  let encrypted = ''
  for (let i = 0; i < base64.length; i++) {
    const charCode = base64.charCodeAt(i)
    const keyChar = key.charCodeAt(i % key.length)
    encrypted += String.fromCharCode(charCode ^ keyChar)
  }
  // 再次Base64编码使其可读
  return btoa(encrypted)
}

// 解密函数：使用sign中的密钥解密
function decrypt(encryptedData, sign) {
  try {
    // 从sign解码出密钥
    const key = decodeURIComponent(escape(atob(sign)))
    // 第一次Base64解码
    const decoded = atob(encryptedData)
    // 使用密钥进行XOR解密
    let decrypted = ''
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i)
      const keyChar = key.charCodeAt(i % key.length)
      decrypted += String.fromCharCode(charCode ^ keyChar)
    }
    // 第二次Base64解码并转回JSON
    const jsonStr = decodeURIComponent(escape(atob(decrypted)))
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error('解密失败:', e)
    return null
  }
}

// 资源倍率控制
function increaseMultiplier() {
  if (store.resourceMultiplier < 10) {
    store.resourceMultiplier++
  }
}

function decreaseMultiplier() {
  if (store.resourceMultiplier > 1) {
    store.resourceMultiplier--
  }
}

// 导出存档（加密）
function handleExport() {
  const saveStr = localStorage.getItem('coc-text-game-save')
  if (!saveStr) {
    store.saveGame()
  }
  
  const rawData = localStorage.getItem('coc-text-game-save')
  if (!rawData) {
    showMessage('没有数据可导出', true)
    return
  }
  
  // 生成随机密钥
  const randomKey = generateRandomKey()
  // 将密钥转为Base64作为sign
  const sign = btoa(unescape(encodeURIComponent(randomKey)))
  // 使用随机密钥加密数据
  const encryptedData = encrypt(rawData, randomKey)
  
  // 构建导出对象
  const exportObj = {
    version: SAVE_VERSION,
    sign: sign,
    data: encryptedData
  }
  
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `coc-save-${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  showMessage('导出成功!')
}

// 导入存档
function triggerImport() {
  fileInput.value?.click()
}

function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result
      // 解析JSON
      const importObj = JSON.parse(content)
      
      // 验证格式
      if (!importObj.version || !importObj.sign || !importObj.data) {
        throw new Error('无效的存档格式')
      }
      
      // 使用sign解密data
      const gameData = decrypt(importObj.data, importObj.sign)
      
      if (!gameData || !gameData.townHallLevel || !gameData.buildings) {
        throw new Error('存档数据损坏')
      }
      
      if (confirm('确定要导入存档吗？当前进度将被覆盖。')) {
        localStorage.setItem('coc-text-game-save', JSON.stringify(gameData))
        store.loadGame()
        showMessage('导入成功!')
      }
    } catch (err) {
      showMessage('导入失败: 无效或损坏的存档文件', true)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

// 清除数据
function handleClear() {
  if (confirm('确定要清除所有游戏数据吗？此操作不可恢复！')) {
    if (confirm('再次确认：这将删除你的所有游戏进度！')) {
      store.deleteSave()
      location.reload()
    }
  }
}

// 加入QQ群
function joinQQGroup() {
  window.open('https://qm.qq.com/cgi-bin/qm/qr?k=650772312&jump_from=webapi', '_blank')
}

// 显示新手引导
function showTutorial() {
  store.tutorialCompleted = false
  store.tutorialStep = 1
  // 通过自定义事件触发引导
  window.dispatchEvent(new CustomEvent('start-tutorial'))
  showMessage('引导已开启，请查看页面提示')
}
</script>

<style scoped>
.panel-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--text-primary);
}

.settings-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}

.section-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.section-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
}

.settings-item:last-child {
  border-bottom: none;
}

.settings-item.danger {
  border: 1px solid var(--danger-border);
  border-radius: 8px;
  margin: 16px;
  background: var(--danger-bg);
}

.item-info {
  flex: 1;
}

.item-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.item-title.danger-text {
  color: #d32f2f;
}

.item-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 主题切换开关 */
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.theme-label {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 36px;
}

.toggle-switch {
  width: 48px;
  height: 26px;
  background: var(--border-color);
  border-radius: 13px;
  position: relative;
  transition: background 0.3s;
}

.toggle-switch.active {
  background: #333;
}

.toggle-thumb {
  width: 22px;
  height: 22px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.toggle-switch.active .toggle-thumb {
  transform: translateX(22px);
}

/* 倍率控制 */
.multiplier-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.multiplier-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  border-radius: 6px;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.multiplier-btn:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--bg-card);
  border-color: var(--text-primary);
}

.multiplier-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.multiplier-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 40px;
  text-align: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--text-primary);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--text-primary);
  color: var(--bg-card);
}

.action-btn.danger-btn {
  background: #d32f2f;
  color: #fff;
  border-color: #d32f2f;
}

.action-btn.danger-btn:hover {
  background: #b71c1c;
  border-color: #b71c1c;
}

.btn-icon {
  font-size: 14px;
}

.message {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.message.success {
  background: var(--success-bg);
  color: var(--success-text);
}

.message.error {
  background: var(--error-bg);
  color: var(--error-text);
}

/* 链接按钮 */
.link-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--text-primary);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.link-btn:hover {
  background: var(--text-primary);
  color: var(--bg-card);
}

.link-btn.qq-btn {
  background: #12B7F5;
  color: #fff;
  border-color: #12B7F5;
}

.link-btn.qq-btn:hover {
  background: #0d9fd8;
  border-color: #0d9fd8;
}
</style>
