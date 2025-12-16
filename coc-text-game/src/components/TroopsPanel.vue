<template>
  <div class="panel">
    <h2 class="panel-title">训练部队</h2>
    
    <!-- 军队容量卡片 -->
    <div class="capacity-card">
      <div class="capacity-header">
        <span>军队容量</span>
        <span>{{ store.currentArmy }} / {{ store.armyCapacity }}</span>
      </div>
      <div class="capacity-bar">
        <div class="capacity-fill" :style="{ width: (store.currentArmy / store.armyCapacity * 100) + '%' }"></div>
      </div>
    </div>
    
    <!-- 兵种分类 -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeCategory === 'normal' }" @click="activeCategory = 'normal'">
        普通兵种
      </button>
      <button class="tab" :class="{ active: activeCategory === 'dark' }" @click="activeCategory = 'dark'">
        暗黑兵种
      </button>
    </div>
    
    <!-- 兵种卡片列表 -->
    <div class="troops-grid">
      <div 
        v-for="troop in filteredTroops" 
        :key="troop.id" 
        class="troop-card"
        :class="{ locked: !troop.unlocked }"
      >
        <div class="troop-header">
          <div class="troop-icon">{{ troop.name.charAt(0) }}</div>
          <div class="troop-info">
            <h4>{{ troop.name }}</h4>
            <span class="troop-level">Lv.{{ getTroopLevel(troop) }}</span>
          </div>
          <span class="troop-count" v-if="getTroopCount(troop) > 0">×{{ getTroopCount(troop) }}</span>
        </div>
        
        <div class="troop-stats">
          <div class="stat">
            <span class="stat-label">生命</span>
            <span class="stat-value">{{ getTroopHP(troop) }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">伤害</span>
            <span class="stat-value">{{ getTroopDPS(troop) }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">人口</span>
            <span class="stat-value">{{ troop.population }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">时间</span>
            <span class="stat-value">{{ formatTime(store.getTroopTrainTime(troop.name)) }}</span>
          </div>
        </div>
        
        <p class="troop-desc">{{ getTroopDesc(troop.name) }}</p>
        
        <div class="troop-actions" v-if="troop.unlocked">
          <button 
            class="btn btn-train"
            :disabled="!canTrain(troop)"
            @click="trainTroop(troop)"
          >
            训练 {{ getTroopCost(troop) }} {{ troop.category === 'dark' ? '重油' : '圣水' }}
          </button>
          <button class="btn btn-remove" :disabled="getTroopCount(troop) <= 0" @click="removeTroop(troop)">
            −
          </button>
        </div>
        
        <div class="locked-overlay" v-if="!troop.unlocked">
          <span>{{ troop.unlockReq }}</span>
        </div>
      </div>
    </div>
    
    <!-- 当前军队 -->
    <div class="current-army-section" v-if="store.currentArmy > 0">
      <div class="section-header">
        <h3>已有军队</h3>
        <span class="army-summary">{{ activeTroops.length }} 种兵种 · {{ store.currentArmy }} 人口</span>
      </div>
      <div class="army-grid">
        <div v-for="troop in activeTroops" :key="troop.id" class="army-unit">
          <div class="unit-icon">{{ troop.name.charAt(0) }}</div>
          <div class="unit-info">
            <span class="unit-name">{{ troop.name }}</span>
            <span class="unit-level">Lv.{{ troop.level }}</span>
          </div>
          <div class="unit-count">
            <span class="count-number">{{ troop.count }}</span>
            <span class="count-pop">{{ troop.count * troop.population }}人口</span>
          </div>
        </div>
      </div>
      <div class="army-actions">
        <button class="btn btn-clear" @click="clearArmy">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          清空军队
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const activeCategory = ref('normal')

const allTroops = computed(() => {
  const normalTroops = [
    { id: 1, name: '野蛮人', maxLevel: 9, population: 1, unlocked: true, category: 'normal' },
    { id: 2, name: '弓箭手', maxLevel: 9, population: 1, unlocked: true, category: 'normal' },
    { id: 3, name: '巨人', maxLevel: 8, population: 5, unlocked: true, category: 'normal' },
    { id: 4, name: '哥布林', maxLevel: 9, population: 1, unlocked: store.townHallLevel >= 2, unlockReq: '2本解锁', category: 'normal' },
    { id: 5, name: '炸弹人', maxLevel: 8, population: 2, unlocked: store.townHallLevel >= 3, unlockReq: '3本解锁', category: 'normal' },
    { id: 6, name: '气球兵', maxLevel: 7, population: 5, unlocked: store.townHallLevel >= 4, unlockReq: '4本解锁', category: 'normal' },
    { id: 7, name: '法师', maxLevel: 7, population: 4, unlocked: store.townHallLevel >= 5, unlockReq: '5本解锁', category: 'normal' },
    { id: 8, name: '天使', maxLevel: 6, population: 14, unlocked: store.townHallLevel >= 6, unlockReq: '6本解锁', category: 'normal' },
    { id: 9, name: '飞龙', maxLevel: 5, population: 20, unlocked: store.townHallLevel >= 7, unlockReq: '7本解锁', category: 'normal' },
    { id: 10, name: '皮卡超人', maxLevel: 4, population: 30, unlocked: store.townHallLevel >= 8, unlockReq: '8本解锁', category: 'normal' },
  ]
  
  const darkTroops = [
    { id: 101, name: '亡灵', maxLevel: 4, population: 1, unlocked: store.townHallLevel >= 7, unlockReq: '7本解锁', category: 'dark' },
    { id: 102, name: '野猪骑士', maxLevel: 4, population: 4, unlocked: store.townHallLevel >= 7, unlockReq: '7本解锁', category: 'dark' },
    { id: 103, name: '熔岩猎犬', maxLevel: 2, population: 30, unlocked: store.townHallLevel >= 9, unlockReq: '9本解锁', category: 'dark' },
  ]
  
  return [...normalTroops, ...darkTroops]
})

const filteredTroops = computed(() => allTroops.value.filter(t => t.category === activeCategory.value))
const activeTroops = computed(() => store.troops.filter(t => t.count > 0))

function getTroopLevel(troop) {
  const storeTroop = store.troops.find(t => t.id === troop.id)
  return storeTroop?.level || 1
}

function getTroopCount(troop) {
  const storeTroop = store.troops.find(t => t.id === troop.id)
  return storeTroop?.count || 0
}

function getTroopHP(troop) {
  const level = getTroopLevel(troop)
  const baseHP = { '野蛮人': 200, '弓箭手': 80, '巨人': 800, '哥布林': 100, '炸弹人': 120, '气球兵': 400, '法师': 150, '天使': 200, '飞龙': 1500, '皮卡超人': 3000, '亡灵': 120, '野猪骑士': 800, '熔岩猎犬': 3000 }
  return (baseHP[troop.name] || 100) + (level - 1) * 30
}

function getTroopDPS(troop) {
  const level = getTroopLevel(troop)
  const baseDPS = { '野蛮人': 20, '弓箭手': 15, '巨人': 25, '哥布林': 20, '炸弹人': 150, '气球兵': 100, '法师': 50, '天使': 0, '飞龙': 80, '皮卡超人': 150, '亡灵': 40, '野猪骑士': 60, '熔岩猎犬': 20 }
  return (baseDPS[troop.name] || 10) + (level - 1) * 5
}

function getTroopCost(troop) {
  const baseCost = { '野蛮人': 25, '弓箭手': 30, '巨人': 150, '哥布林': 20, '炸弹人': 200, '气球兵': 500, '法师': 350, '天使': 1400, '飞龙': 2000, '皮卡超人': 3500, '亡灵': 25, '野猪骑士': 50, '熔岩猎犬': 300 }
  return baseCost[troop.name] || 100
}

function getTroopDesc(name) {
  const descs = { '野蛮人': '近战单位，生命值高', '弓箭手': '远程单位，可攻击空中', '巨人': '优先攻击防御建筑', '哥布林': '优先攻击资源建筑', '炸弹人': '对城墙造成巨额伤害', '气球兵': '空中单位，优先攻击防御', '法师': '群体伤害法师', '天使': '治疗友军单位', '飞龙': '强力空中单位', '皮卡超人': '超高伤害的地面坦克', '亡灵': '低成本空中单位', '野猪骑士': '跳过城墙攻击防御', '熔岩猎犬': '空中坦克，优先攻击防空' }
  return descs[name] || ''
}

function canTrain(troop) {
  const cost = getTroopCost(troop)
  const resource = troop.category === 'dark' ? store.darkElixir : store.elixir
  // 检查资源和容量（包括训练中的）
  const pendingPopulation = store.trainingPopulation
  return resource >= cost && (store.currentArmy + pendingPopulation + troop.population <= store.armyCapacity)
}

function trainTroop(troop) {
  const cost = getTroopCost(troop)
  const isDark = troop.category === 'dark'
  
  if (isDark) {
    if (store.darkElixir < cost) return
    store.darkElixir -= cost
  } else {
    if (!store.spendElixir(cost)) return
  }
  
  // 添加到训练队列
  store.startTraining(troop.id, troop.name, troop.population)
}

function removeTroop(troop) {
  const storeTroop = store.troops.find(t => t.id === troop.id)
  if (storeTroop && storeTroop.count > 0) {
    storeTroop.count--
  }
}

function clearArmy() {
  store.troops.forEach(t => t.count = 0)
}

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}秒`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`
}
</script>

<style scoped>
.panel-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.capacity-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
}

.capacity-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--text-primary);
}

.capacity-bar {
  height: 10px;
  background: var(--progress-bg);
  border-radius: 5px;
  overflow: hidden;
}

.capacity-fill {
  height: 100%;
  background: var(--text-primary);
  border-radius: 5px;
  transition: width 0.3s;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tab {
  padding: 8px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.tab:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.tab.active {
  background: var(--text-primary);
  border-color: var(--text-primary);
  color: var(--bg-secondary);
}

.troops-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.troop-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  position: relative;
  transition: all 0.2s;
}

.troop-card:hover:not(.locked) {
  box-shadow: 0 4px 12px var(--shadow);
}

.troop-card.locked {
  opacity: 0.6;
}

.troop-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.troop-icon {
  width: 44px;
  height: 44px;
  background: var(--hover-bg);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.troop-info h4 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 2px;
  color: var(--text-primary);
}

.troop-level {
  font-size: 12px;
  color: var(--text-secondary);
}

.troop-count {
  margin-left: auto;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.troop-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.stat-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.troop-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.troop-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-train {
  flex: 1;
  background: var(--text-primary);
  color: var(--bg-secondary);
  border: none;
}

.btn-train:hover:not(:disabled) {
  opacity: 0.85;
}

.btn-train:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-remove {
  width: 40px;
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  font-size: 18px;
}

.btn-remove:hover:not(:disabled) {
  border-color: var(--text-primary);
}

.btn-outline {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--text-primary);
}

.btn-outline:hover {
  background: var(--text-primary);
  color: var(--bg-secondary);
}

.locked-overlay {
  position: absolute;
  inset: 0;
  background: var(--bg-card);
  opacity: 0.9;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 已有军队区域 */
.current-army-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.section-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.army-summary {
  font-size: 14px;
  color: var(--text-secondary);
  background: var(--hover-bg);
  padding: 6px 14px;
  border-radius: 20px;
}

.army-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.army-unit {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  transition: all 0.2s;
}

.army-unit:hover {
  border-color: var(--border-color);
  box-shadow: 0 2px 8px var(--shadow);
}

.unit-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--hover-bg) 0%, var(--bg-card) 100%);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  flex-shrink: 0;
}

.unit-info {
  flex: 1;
  min-width: 0;
}

.unit-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unit-level {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.unit-count {
  text-align: right;
  flex-shrink: 0;
}

.count-number {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.count-pop {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.army-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

.btn-clear {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-clear:hover {
  color: #e53935;
  border-color: #e53935;
  background: rgba(229, 57, 53, 0.05);
}

.btn-clear svg {
  opacity: 0.7;
}
</style>
