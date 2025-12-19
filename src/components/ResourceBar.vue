<template>
  <header class="header">
    <div class="header-top">
      <!-- 左侧：Logo -->
      <div class="header-left">
        <div class="logo">COC</div>
      </div>
      
      <!-- 中间：资源 -->
      <div class="header-center">
        <div class="resource-item">
          <div class="resource-main">
            <span class="resource-label">金币</span>
            <span class="resource-value">{{ formatNumber(store.gold) }} / {{ formatNumber(store.maxGold) }}</span>
          </div>
          <div class="resource-bar">
            <div class="resource-fill gold-fill" :style="{ width: goldPercent + '%' }"></div>
          </div>
          <div class="resource-production">+{{ goldProduction }}/分钟</div>
        </div>
        
        <div class="resource-item">
          <div class="resource-main">
            <span class="resource-label">圣水</span>
            <span class="resource-value">{{ formatNumber(store.elixir) }} / {{ formatNumber(store.maxElixir) }}</span>
          </div>
          <div class="resource-bar">
            <div class="resource-fill elixir-fill" :style="{ width: elixirPercent + '%' }"></div>
          </div>
          <div class="resource-production">+{{ elixirProduction }}/分钟</div>
        </div>
        
        <div class="resource-item" v-if="store.townHallLevel >= 7">
          <div class="resource-main">
            <span class="resource-label">暗黑</span>
            <span class="resource-value">{{ formatNumber(store.darkElixir) }} / {{ formatNumber(store.maxDarkElixir) }}</span>
          </div>
          <div class="resource-bar">
            <div class="resource-fill dark-fill" :style="{ width: darkPercent + '%' }"></div>
          </div>
          <div class="resource-production">+{{ darkProduction }}/分钟</div>
        </div>
      </div>
      
      <!-- 右侧：状态信息 -->
      <div class="header-right">
        <div class="status-group">
          <div class="status-item">
            <span class="status-label">工人</span>
            <span class="status-value">{{ store.freeBuilders }}/{{ store.builders.length }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">军队</span>
            <span class="status-value">{{ store.currentArmy }}/{{ store.armyCapacity }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">宝石</span>
            <span class="status-value gem">{{ store.gems }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">奖杯</span>
            <span class="status-value trophy">{{ store.trophies }}</span>
          </div>
        </div>
        
        <div class="th-badge">
          <span class="th-level">{{ store.townHallLevel }}</span>
          <span class="th-label">本</span>
        </div>
      </div>
    </div>
    
    <!-- 升级/研究/训练进度条区域 -->
    <div class="upgrade-bar" v-if="upgradingBuildings.length > 0 || store.currentResearch || store.trainingQueue.length > 0 || clanCastleUpgrading">
      <div class="upgrade-list">
        <!-- 建筑升级进度 -->
        <div 
          v-for="item in upgradingBuildings" 
          :key="item.id" 
          class="upgrade-item"
        >
          <div class="upgrade-info">
            <span class="upgrade-name">{{ item.name }} Lv{{ item.level }}→{{ item.level + 1 }}</span>
            <span class="upgrade-time">{{ formatTime(getRemainingTime(item)) }}</span>
          </div>
          <div class="upgrade-progress">
            <div class="upgrade-fill" :style="{ width: getUpgradeProgress(item) + '%' }"></div>
          </div>
        </div>
        
        <!-- 部落城堡升级进度 -->
        <div v-if="clanCastleUpgrading" class="upgrade-item">
          <div class="upgrade-info">
            <span class="upgrade-name">部落城堡 {{ store.clanCastle.level === 0 ? '建造中' : `Lv${store.clanCastle.level}→${clanCastleUpgrading.targetLevel}` }}</span>
            <span class="upgrade-time">{{ formatTime(getClanCastleRemaining()) }}</span>
          </div>
          <div class="upgrade-progress">
            <div class="upgrade-fill" :style="{ width: getClanCastleProgress() + '%' }"></div>
          </div>
        </div>
        
        <!-- 研究进度 -->
        <div v-if="store.currentResearch" class="upgrade-item research-item">
          <div class="upgrade-info">
            <span class="upgrade-name research-name">{{ store.currentResearch.name }} Lv{{ store.currentResearch.targetLevel }}</span>
            <span class="upgrade-time">{{ formatTime(getResearchRemaining()) }}</span>
          </div>
          <div class="upgrade-progress">
            <div class="upgrade-fill research-fill" :style="{ width: getResearchProgress() + '%' }"></div>
          </div>
        </div>
        
        <!-- 训练进度 -->
        <div 
          v-for="(item, index) in store.trainingQueue" 
          :key="'train-' + index" 
          class="upgrade-item training-item"
        >
          <div class="upgrade-info">
            <span class="upgrade-name training-name">训练 {{ item.troopName }}</span>
            <span class="upgrade-time">{{ formatTrainingTime(item) }}</span>
          </div>
          <div class="upgrade-progress">
            <div class="upgrade-fill training-fill" :style="{ width: getTrainingProgress(item) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

// 用于触发重新渲染的计数器
const tick = ref(0)
let timer = null

onMounted(() => {
  // 每500ms更新一次，用于刷新升级/训练进度和自动收集资源
  timer = setInterval(() => {
    tick.value++
    store.checkUpgrades()
    store.checkTraining()
    store.collectResources()
    checkResearchComplete()
  }, 500)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const goldPercent = computed(() => (store.gold / store.maxGold) * 100)
const elixirPercent = computed(() => (store.elixir / store.maxElixir) * 100)
const darkPercent = computed(() => store.maxDarkElixir > 0 ? (store.darkElixir / store.maxDarkElixir) * 100 : 0)
const armyPercent = computed(() => (store.currentArmy / store.armyCapacity) * 100)

// 使用 store 中的产量计算属性
const goldProduction = computed(() => store.goldProductionPerMinute)
const elixirProduction = computed(() => store.elixirProductionPerMinute)
const darkProduction = computed(() => store.darkProductionPerMinute)

// 获取所有正在升级的建筑
const upgradingBuildings = computed(() => {
  // 使用tick触发重新计算
  const _ = tick.value
  return store.buildings.filter(b => b.upgrading)
})

// 获取部落城堡升级状态
const clanCastleUpgrading = computed(() => {
  const _ = tick.value
  return store.upgradeQueue.find(q => q.buildingId === 'clancastle')
})

// 获取部落城堡升级剩余时间
function getClanCastleRemaining() {
  const item = clanCastleUpgrading.value
  if (!item) return 0
  return Math.max(0, Math.ceil((item.endTime - Date.now()) / 1000))
}

// 获取部落城堡升级进度
function getClanCastleProgress() {
  const item = clanCastleUpgrading.value
  if (!item) return 0
  const total = item.endTime - item.startTime
  const elapsed = Date.now() - item.startTime
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

// 获取剩余时间（秒）
function getRemainingTime(building) {
  if (!building.upgrading || !building.upgradeEndTime) return 0
  const remaining = Math.max(0, building.upgradeEndTime - Date.now())
  return Math.ceil(remaining / 1000)
}

// 获取升级进度百分比
function getUpgradeProgress(building) {
  if (!building.upgrading || !building.upgradeEndTime) return 0
  const totalTime = store.getUpgradeTime(building.type, building.level) * 1000
  const remaining = building.upgradeEndTime - Date.now()
  const elapsed = totalTime - remaining
  return Math.min(100, Math.max(0, (elapsed / totalTime) * 100))
}

// 获取研究剩余时间
function getResearchRemaining() {
  // 使用tick触发响应式更新
  const _ = tick.value
  if (!store.currentResearch) return 0
  return Math.max(0, Math.ceil((store.currentResearch.endTime - Date.now()) / 1000))
}

// 获取研究进度百分比
function getResearchProgress() {
  // 使用tick触发响应式更新
  const _ = tick.value
  if (!store.currentResearch) return 0
  const total = store.currentResearch.endTime - store.currentResearch.startTime
  const elapsed = Date.now() - store.currentResearch.startTime
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

// 检查研究是否完成
function checkResearchComplete() {
  if (store.currentResearch && Date.now() >= store.currentResearch.endTime) {
    const troop = store.troops.find((t) => t.id === store.currentResearch.troopId)
    if (troop) {
      troop.level = store.currentResearch.targetLevel
    }
    store.currentResearch = null
  }
}

// 获取训练进度百分比
function getTrainingProgress(item) {
  const now = Date.now()
  const total = item.endTime - item.startTime
  const elapsed = now - item.startTime
  return Math.min(100, (elapsed / total) * 100)
}

// 格式化训练剩余时间
function formatTrainingTime(item) {
  const now = Date.now()
  const remaining = Math.max(0, item.endTime - now)
  const seconds = Math.ceil(remaining / 1000)
  return formatTime(seconds)
}

// 格式化时间
function formatTime(seconds) {
  if (seconds <= 0) return '完成'
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}时${mins}分` : `${hours}时`
}

function formatNumber(num) {
  if (num >= 1000000) {
    const val = Math.floor(num / 100000) / 10
    return val + 'M'
  }
  if (num >= 10000) {
    const val = Math.floor(num / 100) / 10
    return val + 'K'
  }
  if (num >= 1000) {
    const val = Math.floor(num / 100) / 10
    return val + 'K'
  }
  return num.toString()
}
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  z-index: 100;
}

.header-top {
  height: 70px;
  display: flex;
  align-items: center;
  padding: 0 24px;
}

/* 左侧Logo - 固定宽度 */
.header-left {
  width: 200px;
  flex-shrink: 0;
}

.logo {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}

/* 中间资源区 */
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 32px;
}

.resource-item {
  min-width: 140px;
}

.resource-main {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.resource-label {
  font-size: 12px;
  color: var(--text-muted);
}

.resource-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.resource-bar {
  height: 4px;
  background: var(--progress-bg);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 2px;
}

.resource-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.gold-fill {
  background: #ffc107;
}

.elixir-fill {
  background: #e91e63;
}

.dark-fill {
  background: #7c4dff;
}

.resource-production {
  font-size: 11px;
  color: var(--text-muted);
}

/* 右侧状态区 - 固定宽度与左侧平衡 */
.header-right {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.status-group {
  display: flex;
  gap: 12px;
  padding: 6px 12px;
  background: var(--hover-bg);
  border-radius: 8px;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 44px;
}

.status-label {
  font-size: 10px;
  color: var(--text-muted);
  margin-bottom: 1px;
}

.status-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-value.gem {
  color: #4caf50;
}

.status-value.trophy {
  color: #ffc107;
}

.th-badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
  background: var(--text-primary);
  color: var(--bg-secondary);
  padding: 8px 16px;
  border-radius: 8px;
}

.th-level {
  font-size: 24px;
  font-weight: 700;
}

.th-label {
  font-size: 14px;
}

/* 升级进度条区域 */
.upgrade-bar {
  background: var(--bg-primary);
  border-top: 1px solid var(--border-light);
  padding: 8px 24px;
}

.upgrade-list {
  display: flex;
  gap: 24px;
  overflow-x: auto;
}

.upgrade-item {
  min-width: 180px;
  flex-shrink: 0;
}

.upgrade-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.upgrade-name {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
}

.upgrade-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.upgrade-progress {
  height: 6px;
  background: var(--progress-bg);
  border-radius: 3px;
  overflow: hidden;
}

.upgrade-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 3px;
  transition: width 0.5s ease;
}

/* 研究进度样式 */
.research-item .upgrade-name {
  color: #2196f3;
}

.research-fill {
  background: linear-gradient(90deg, #2196f3, #64b5f6);
}

/* 训练进度样式 */
.training-item .upgrade-name {
  color: #ff9800;
}

.training-fill {
  background: linear-gradient(90deg, #ff9800, #ffb74d);
}
</style>
