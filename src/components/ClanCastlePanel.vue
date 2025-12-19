<template>
  <div class="panel">
    <h2 class="panel-title">🏰 部落城堡</h2>

    <!-- 未解锁提示 -->
    <div class="locked-card" v-if="store.townHallLevel < 5">
      <div class="lock-icon">🔒</div>
      <p>部落城堡在 5 级大本营解锁</p>
      <p class="sub-text">当前大本营等级: {{ store.townHallLevel }}</p>
    </div>

    <!-- 未建造 -->
    <div class="build-card" v-else-if="store.clanCastle.level === 0 && !isUpgrading">
      <div class="build-icon">🏗️</div>
      <h3>建造部落城堡</h3>
      <p class="desc">部落城堡可以存储援军，在进攻和防守时提供额外战力</p>
      <div class="cost-info">
        <span class="cost-item">💰 {{ formatNumber(store.clanCastleConfig.upgradeCost[1].gold) }} 金币</span>
        <span class="cost-item">⏱️ {{ formatTime(store.clanCastleConfig.upgradeCost[1].time) }}</span>
      </div>
      <button class="btn btn-build" @click="buildCastle" :disabled="!canBuild">
        {{ canBuild ? '建造' : (store.freeBuilders === 0 ? '无空闲工人' : '金币不足') }}
      </button>
    </div>

    <!-- 正在升级 -->
    <div class="upgrading-card" v-else-if="isUpgrading">
      <div class="upgrade-icon">⚒️</div>
      <h3>{{ store.clanCastle.level === 0 ? '建造中' : '升级中' }}</h3>
      <p>部落城堡 → {{ upgradeTarget }}级</p>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: upgradeProgress + '%' }"></div>
      </div>
      <p class="time-remaining">剩余时间: {{ formatTime(remainingTime) }}</p>
    </div>

    <!-- 已建造 -->
    <template v-else>
      <!-- 城堡信息卡片 -->
      <div class="castle-info-card">
        <div class="castle-header">
          <div class="castle-level">
            <span class="level-badge">Lv.{{ store.clanCastle.level }}</span>
            <span class="castle-name">部落城堡</span>
          </div>
          <div class="castle-stats">
            <span class="stat-item">❤️ {{ currentConfig.hp }}</span>
            <span class="stat-item">👥 {{ store.clanCastleCurrentPopulation }}/{{ store.clanCastleCapacity }}</span>
          </div>
        </div>

        <!-- 升级按钮 -->
        <div class="upgrade-section" v-if="canUpgrade">
          <div class="upgrade-info">
            <span>升级到 {{ store.clanCastle.level + 1 }} 级</span>
            <span class="upgrade-cost">💰 {{ formatNumber(nextUpgradeCost.gold) }}</span>
          </div>
          <button class="btn btn-upgrade" @click="upgradeCastle" :disabled="!canAffordUpgrade">
            {{ canAffordUpgrade ? '升级' : '资源不足' }}
          </button>
        </div>
        <div class="max-level-badge" v-else>
          ✨ 已满级
        </div>
      </div>

      <!-- 援军列表 -->
      <div class="troops-section">
        <div class="section-header">
          <h3>🎖️ 援军</h3>
          <span class="capacity-info">{{ store.clanCastleCurrentPopulation }}/{{ store.clanCastleCapacity }}</span>
        </div>

        <div class="troops-list" v-if="store.clanCastle.troops.length > 0">
          <div class="troop-item" v-for="troop in store.clanCastle.troops" :key="troop.name + troop.level">
            <span class="troop-icon">{{ getTroopIcon(troop.name) }}</span>
            <div class="troop-info">
              <span class="troop-name">{{ troop.name }}</span>
              <span class="troop-level">Lv.{{ troop.level }}</span>
            </div>
            <span class="troop-count">×{{ troop.count }}</span>
            <button class="btn-remove" @click="removeTroop(troop)" title="移除援军">✕</button>
          </div>
        </div>
        <div class="empty-troops" v-else>
          <p>暂无援军</p>
          <p class="sub-text">请求援军来填充城堡</p>
        </div>
      </div>

      <!-- 请求援军 -->
      <div class="request-section">
        <div class="section-header">
          <h3>📨 请求援军</h3>
          <span class="cooldown-info" v-if="requestCooldown > 0">冷却: {{ requestCooldown }}秒</span>
        </div>

        <div class="request-form">
          <select v-model="selectedTroop" class="troop-select">
            <option value="">选择兵种</option>
            <option v-for="troop in availableTroops" :key="troop.id" :value="troop.name">
              {{ troop.name }} ({{ troop.population }}人口)
            </option>
          </select>
          <input type="number" v-model.number="requestCount" min="1" :max="maxRequestCount" class="count-input" placeholder="数量" />
          <button class="btn btn-request" @click="requestTroops" :disabled="!canRequest">
            请求
          </button>
        </div>
        <p class="request-hint" v-if="selectedTroop">
          将请求 {{ requestCount }} 个{{ selectedTroop }}，占用 {{ requestPopulation }} 人口
        </p>
      </div>

      <!-- 功能说明 -->
      <div class="info-section">
        <h3>📋 功能说明</h3>
        <ul class="info-list">
          <li>援军容量: {{ store.clanCastleCapacity }} 人口</li>
          <li>资源保护: {{ currentConfig.protection.gold }} 金币/圣水</li>
          <li v-if="currentConfig.spellSlot > 0">法术槽位: {{ currentConfig.spellSlot }} 个</li>
          <li>请求冷却: 25秒</li>
        </ul>
      </div>
    </template>

    <!-- 消息提示 -->
    <div class="message" :class="messageType" v-if="message">{{ message }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

const selectedTroop = ref('')
const requestCount = ref(1)
const message = ref('')
const messageType = ref('success')
const requestCooldown = ref(0)
const tick = ref(0)

let cooldownTimer = null
let progressTimer = null

// 当前等级配置
const currentConfig = computed(() => {
  return store.clanCastleConfig.levels[store.clanCastle.level] || store.clanCastleConfig.levels[1]
})

// 是否可以建造
const canBuild = computed(() => {
  // 检查是否已在升级队列中
  const alreadyUpgrading = store.upgradeQueue.some(q => q.buildingId === 'clancastle')
  if (alreadyUpgrading) return false
  return store.gold >= store.clanCastleConfig.upgradeCost[1].gold && store.freeBuilders > 0
})

// 是否正在升级
const isUpgrading = computed(() => {
  return store.upgradeQueue.some(q => q.buildingId === 'clancastle')
})

// 升级目标等级
const upgradeTarget = computed(() => {
  const item = store.upgradeQueue.find(q => q.buildingId === 'clancastle')
  return item?.targetLevel || 1
})

// 升级进度
const upgradeProgress = computed(() => {
  // 使用tick触发响应式更新
  const _ = tick.value
  const item = store.upgradeQueue.find(q => q.buildingId === 'clancastle')
  if (!item) return 0
  const total = item.endTime - item.startTime
  const elapsed = Date.now() - item.startTime
  return Math.min(100, (elapsed / total) * 100)
})

// 剩余时间
const remainingTime = computed(() => {
  // 使用tick触发响应式更新
  const _ = tick.value
  const item = store.upgradeQueue.find(q => q.buildingId === 'clancastle')
  if (!item) return 0
  return Math.max(0, Math.ceil((item.endTime - Date.now()) / 1000))
})

// 是否可以升级
const canUpgrade = computed(() => {
  // 正在升级中不显示升级按钮
  if (isUpgrading.value) return false
  if (store.clanCastle.level >= store.clanCastleConfig.maxLevel) return false
  const nextLevel = store.clanCastle.level + 1
  const requiredTH = store.clanCastleConfig.unlockTHByLevel[nextLevel]
  return store.townHallLevel >= requiredTH
})

// 下一级升级消耗
const nextUpgradeCost = computed(() => {
  const nextLevel = store.clanCastle.level + 1
  return store.clanCastleConfig.upgradeCost[nextLevel] || { gold: 0, time: 0 }
})

// 是否能负担升级
const canAffordUpgrade = computed(() => {
  // 正在升级中不能再次升级
  if (isUpgrading.value) return false
  return store.gold >= nextUpgradeCost.value.gold && store.freeBuilders > 0
})

// 可请求的兵种
const availableTroops = computed(() => {
  return store.troops.filter(t => t.unlocked)
})

// 请求的人口
const requestPopulation = computed(() => {
  const troop = store.troops.find(t => t.name === selectedTroop.value)
  return troop ? troop.population * requestCount.value : 0
})

// 最大可请求数量
const maxRequestCount = computed(() => {
  const troop = store.troops.find(t => t.name === selectedTroop.value)
  if (!troop) return 1
  const remaining = store.clanCastleCapacity - store.clanCastleCurrentPopulation
  return Math.floor(remaining / troop.population) || 1
})

// 是否可以请求
const canRequest = computed(() => {
  return selectedTroop.value && 
         requestCount.value > 0 && 
         requestPopulation.value <= (store.clanCastleCapacity - store.clanCastleCurrentPopulation) &&
         requestCooldown.value === 0
})

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
  return num.toString()
}

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`
}

function getTroopIcon(name) {
  const icons = {
    '野蛮人': '⚔️', '弓箭手': '🏹', '巨人': '👊', '哥布林': '💰',
    '炸弹人': '💣', '气球兵': '🎈', '法师': '🔮', '天使': '👼',
    '飞龙': '🐉', '皮卡超人': '🤖', '亡灵': '👻', '野猪骑士': '🐗'
  }
  return icons[name] || '👤'
}

function showMessage(text, type = 'success') {
  message.value = text
  messageType.value = type
  setTimeout(() => { message.value = '' }, 3000)
}

function buildCastle() {
  const result = store.upgradeClanCastle()
  showMessage(result.message, result.success ? 'success' : 'error')
}

function upgradeCastle() {
  const result = store.upgradeClanCastle()
  showMessage(result.message, result.success ? 'success' : 'error')
}

function requestTroops() {
  const result = store.requestTroops(selectedTroop.value, requestCount.value)
  showMessage(result.message, result.success ? 'success' : 'error')
  if (result.success) {
    updateCooldown()
  }
}

function removeTroop(troop) {
  const result = store.removeClanCastleTroop(troop.name, troop.level, 1)
  showMessage(result.message, result.success ? 'success' : 'error')
}

function updateCooldown() {
  if (store.clanCastle.lastRequestTime) {
    const elapsed = Date.now() - store.clanCastle.lastRequestTime
    const remaining = store.clanCastle.requestCooldown - elapsed
    requestCooldown.value = remaining > 0 ? Math.ceil(remaining / 1000) : 0
  } else {
    requestCooldown.value = 0
  }
}

onMounted(() => {
  updateCooldown()
  cooldownTimer = setInterval(updateCooldown, 1000)
  // 每500ms更新一次进度条
  progressTimer = setInterval(() => {
    tick.value++
    // 检查升级是否完成
    store.checkUpgrades()
  }, 500)
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
  if (progressTimer) clearInterval(progressTimer)
})
</script>


<style scoped>
.panel { padding: 20px; }
.panel-title { font-size: 22px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }

.locked-card, .build-card, .upgrading-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
}

.lock-icon, .build-icon, .upgrade-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.locked-card p, .build-card p { color: var(--text-secondary); margin: 8px 0; }
.sub-text { font-size: 13px; opacity: 0.7; }
.desc { margin-bottom: 20px; }

.cost-info {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.cost-item {
  padding: 8px 16px;
  background: var(--hover-bg);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-build, .btn-upgrade {
  background: #4CAF50;
  color: white;
}

.btn-build:hover:not(:disabled), .btn-upgrade:hover:not(:disabled) {
  background: #43A047;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin: 16px 0;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s;
}

.time-remaining {
  color: var(--text-secondary);
  font-size: 14px;
}

.castle-info-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.castle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.castle-level {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

.castle-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.castle-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  font-size: 14px;
  color: var(--text-secondary);
}

.upgrade-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.upgrade-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upgrade-cost {
  font-size: 13px;
  color: #ffc107;
}

.max-level-badge {
  text-align: center;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  font-weight: 500;
}

.troops-section, .request-section, .info-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.capacity-info, .cooldown-info {
  font-size: 13px;
  color: var(--text-secondary);
}

.cooldown-info {
  color: #ff9800;
}

.troops-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.troop-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--hover-bg);
  border-radius: 8px;
}

.troop-icon {
  font-size: 20px;
}

.troop-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.troop-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.troop-level {
  font-size: 12px;
  color: var(--text-secondary);
}

.troop-count {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-remove {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}

.btn-remove:hover {
  background: #f44336;
  color: white;
}

.empty-troops {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

.request-form {
  display: flex;
  gap: 8px;
}

.troop-select {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
}

.count-input {
  width: 80px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
  text-align: center;
}

.btn-request {
  background: #2196F3;
  color: white;
  padding: 10px 20px;
}

.btn-request:hover:not(:disabled) {
  background: #1976D2;
}

.request-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-list li {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light);
  font-size: 14px;
  color: var(--text-secondary);
}

.info-list li:last-child {
  border-bottom: none;
}

.message {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.message.success {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.message.error {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}
</style>
