<template>
  <div class="panel">
    <h2 class="panel-title">防御布局</h2>
    
    <!-- 恢复精力确认弹窗 -->
    <div class="modal-overlay" v-if="confirmDialog.show">
      <div class="modal-card confirm-dialog">
        <h3>确认恢复精力</h3>
        <p class="confirm-text">{{ confirmDialog.message }}</p>
        <p class="confirm-cost">消耗: <span class="gem-cost">{{ confirmDialog.cost }} 宝石</span></p>
        <div class="confirm-buttons">
          <button class="btn btn-cancel" @click="cancelRestore">取消</button>
          <button class="btn btn-confirm" @click="executeRestore">确认</button>
        </div>
      </div>
    </div>
    
    <!-- NPC入侵结果弹窗 -->
    <div class="modal-overlay" v-if="store.npcInvasion.result">
      <div class="modal-card">
        <h3 :class="store.npcInvasion.result.defended ? 'text-win' : 'text-lose'">
          {{ store.npcInvasion.result.defended ? '防御成功!' : '村庄被掠夺!' }}
        </h3>
        <div class="invasion-attacker">
          入侵者: {{ store.npcInvasion.result.attackerName }} ({{ store.npcInvasion.result.attackerTH }}本)
        </div>
        <div class="invasion-defense">
          防御率: {{ store.npcInvasion.result.defenseRate }}%
        </div>
        <div class="invasion-loss" v-if="!store.npcInvasion.result.defended">
          <p>损失资源:</p>
          <span class="loss-gold">-{{ formatNumber(store.npcInvasion.result.goldLost) }} 金币</span>
          <span class="loss-elixir">-{{ formatNumber(store.npcInvasion.result.elixirLost) }} 圣水</span>
          <span class="loss-dark" v-if="store.npcInvasion.result.darkLost > 0">
            -{{ store.npcInvasion.result.darkLost }} 暗黑
          </span>
        </div>
        <div class="invasion-tip" v-if="!store.npcInvasion.result.defended">
          提示: 保持建筑工人精力充沛可减少被入侵几率
        </div>
        <button class="btn" @click="store.clearInvasionResult()">确定</button>
      </div>
    </div>
    
    <!-- 建筑工人精力卡片 -->
    <div class="fatigue-card">
      <div class="fatigue-header">
        <h3>建筑工人精力</h3>
        <span class="fatigue-value" :class="fatigueClass">平均 {{ store.builderFatigue }}%</span>
      </div>
      
      <!-- 每个工人的精力条 -->
      <div class="builders-fatigue-list">
        <div 
          v-for="builder in store.builders" 
          :key="builder.id" 
          class="builder-fatigue-item"
        >
          <div class="builder-info">
            <span class="builder-name">工人 {{ builder.id }}</span>
            <span class="builder-status" :class="{ busy: builder.busy }">
              {{ builder.busy ? builder.task : '空闲' }}
            </span>
          </div>
          <div class="builder-fatigue-bar">
            <div 
              class="builder-fatigue-fill" 
              :style="{ width: (builder.fatigue ?? 100) + '%' }"
              :class="getBuilderFatigueClass(builder.fatigue ?? 100)"
            ></div>
          </div>
          <span class="builder-fatigue-value" :class="getBuilderFatigueClass(builder.fatigue ?? 100)">
            {{ builder.fatigue ?? 100 }}%
          </span>
          <button 
            class="btn-mini" 
            @click="showRestoreConfirm(builder.id, builder.fatigue ?? 100)"
            :disabled="(builder.fatigue ?? 100) >= 100"
          >
            +50
          </button>
        </div>
      </div>
      
      <div class="fatigue-info">
        <span v-if="store.builderFatigue <= 30" class="fatigue-warning">
          精力严重不足! NPC入侵概率很高
        </span>
        <span v-else-if="store.builderFatigue <= 50" class="fatigue-caution">
          精力不足，可能会有NPC来入侵村庄
        </span>
        <span v-else-if="store.builderFatigue <= 70" class="fatigue-normal">
          精力一般，建议让工人休息
        </span>
        <span v-else class="fatigue-good">
          精力充沛
        </span>
      </div>
      <button 
        class="btn btn-restore" 
        @click="showRestoreAllConfirm"
        :disabled="allBuildersFullFatigue"
      >
        全部恢复 ({{ store.builders.length * 5 }} 宝石)
      </button>
    </div>
    
    <!-- 入侵历史 -->
    <div class="invasion-history" v-if="store.npcInvasion.invasionHistory.length > 0">
      <h3 class="section-title">入侵记录</h3>
      <div class="history-list">
        <div 
          v-for="(record, index) in store.npcInvasion.invasionHistory.slice(0, 5)" 
          :key="index"
          class="history-item"
          :class="{ defended: record.defended }"
        >
          <span class="history-result">{{ record.defended ? '防御成功' : '被掠夺' }}</span>
          <span class="history-attacker">{{ record.attackerName }}</span>
          <span class="history-loss" v-if="!record.defended">
            -{{ formatNumber(record.goldLost + record.elixirLost) }}
          </span>
          <span class="history-time">{{ formatTime(record.time) }}</span>
        </div>
      </div>
    </div>
    
    <!-- 防御总览卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">总防御力</div>
        <div class="stat-value">{{ totalDefensePower }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">防御建筑</div>
        <div class="stat-value">{{ defenseCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">城墙数量</div>
        <div class="stat-value">{{ wallCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">陷阱数量</div>
        <div class="stat-value">{{ trapCount }}</div>
      </div>
    </div>
    
    <!-- 防御建筑卡片 -->
    <h3 class="section-title">防御建筑</h3>
    <div class="defense-grid">
      <div 
        v-for="def in defenseBuildings" 
        :key="def.id" 
        class="defense-card"
        :class="{ locked: !def.unlocked }"
      >
        <div class="defense-header">
          <div class="defense-icon">{{ def.name.charAt(0) }}</div>
          <div class="defense-info">
            <h4>{{ def.name }}</h4>
            <span class="defense-level" v-if="def.unlocked">Lv.{{ def.level }}</span>
          </div>
          <span class="defense-count" v-if="def.count > 1">×{{ def.count }}</span>
        </div>
        
        <div class="defense-stats" v-if="def.unlocked">
          <div class="stat-row">
            <span>伤害</span>
            <span>{{ def.damage }}/次</span>
          </div>
          <div class="stat-row">
            <span>射程</span>
            <span>{{ def.range }}格</span>
          </div>
          <div class="stat-row">
            <span>生命值</span>
            <span>{{ def.hp }}</span>
          </div>
        </div>
        
        <div class="defense-type" v-if="def.unlocked">
          <span class="type-tag">{{ def.targetLabel }}</span>
        </div>
        
        <div class="locked-overlay" v-if="!def.unlocked">
          <span>{{ def.unlockReq }}</span>
        </div>
      </div>
    </div>
    
    <!-- 陷阱卡片 -->
    <h3 class="section-title">陷阱</h3>
    <div class="traps-grid">
      <div 
        v-for="trap in traps" 
        :key="trap.id" 
        class="trap-card"
        :class="{ locked: !trap.unlocked }"
      >
        <div class="trap-icon">{{ trap.name.charAt(0) }}</div>
        <div class="trap-name">{{ trap.name }}</div>
        <div class="trap-count" v-if="trap.unlocked">×{{ trap.count }}</div>
        <div class="trap-lock" v-else>{{ trap.unlockReq }}</div>
      </div>
    </div>
    
    <!-- 城墙卡片 -->
    <h3 class="section-title">城墙</h3>
    <div class="wall-card">
      <div class="wall-info">
        <div class="wall-icon">墙</div>
        <div class="wall-details">
          <h4>城墙 等级 {{ wallLevel }}</h4>
          <p>数量: {{ wallCount }} | 生命值: {{ wallHP }}/段</p>
        </div>
      </div>
      <button 
        class="btn"
        :disabled="wallLevel >= 9 || store.gold < wallUpgradeCost"
        @click="upgradeWalls"
      >
        升级 {{ formatNumber(wallUpgradeCost) }} 金币
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const restoreMessage = ref('')

// 确认弹窗状态
const confirmDialog = ref({
  show: false,
  builderId: null,  // null表示全部恢复
  cost: 0,
  message: ''
})

const fatigueClass = computed(() => {
  if (store.builderFatigue <= 30) return 'danger'
  if (store.builderFatigue <= 60) return 'warning'
  return 'good'
})

const allBuildersFullFatigue = computed(() => {
  return store.builders.every(b => (b.fatigue ?? 100) >= 100)
})

function getBuilderFatigueClass(fatigue) {
  if (fatigue <= 30) return 'danger'
  if (fatigue <= 60) return 'warning'
  return 'good'
}

// 显示单个工人恢复确认
function showRestoreConfirm(builderId, currentFatigue) {
  const cost = 5 // 50点精力消耗5宝石
  confirmDialog.value = {
    show: true,
    builderId: builderId,
    cost: cost,
    message: `为工人 ${builderId} 恢复 50 点精力（当前 ${currentFatigue}%）`
  }
}

// 显示全部恢复确认
function showRestoreAllConfirm() {
  const cost = store.builders.length * 5
  confirmDialog.value = {
    show: true,
    builderId: null,
    cost: cost,
    message: `为所有 ${store.builders.length} 个工人恢复 50 点精力`
  }
}

// 取消恢复
function cancelRestore() {
  confirmDialog.value.show = false
}

// 执行恢复
function executeRestore() {
  const { builderId, cost } = confirmDialog.value
  
  if (store.gems < cost) {
    restoreMessage.value = '宝石不足'
    confirmDialog.value.show = false
    setTimeout(() => { restoreMessage.value = '' }, 2000)
    return
  }
  
  const result = store.restoreBuilderFatigue(builderId, 50)
  restoreMessage.value = result.message
  confirmDialog.value.show = false
  setTimeout(() => { restoreMessage.value = '' }, 2000)
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const defenseBuildings = computed(() => [
  { id: 1, name: '加农炮', level: 1, count: 1, damage: 25, range: 7, hp: 200, targetLabel: '对地', unlocked: true },
  { id: 2, name: '箭塔', level: 1, count: store.townHallLevel >= 2 ? 1 : 0, damage: 15, range: 8, hp: 300, targetLabel: '对空/地', unlocked: store.townHallLevel >= 2, unlockReq: '2本解锁' },
  { id: 3, name: '迫击炮', level: 1, count: store.townHallLevel >= 3 ? 1 : 0, damage: 80, range: 11, hp: 400, targetLabel: '范围对地', unlocked: store.townHallLevel >= 3, unlockReq: '3本解锁' },
  { id: 4, name: '防空火箭', level: 1, count: store.townHallLevel >= 4 ? 1 : 0, damage: 120, range: 10, hp: 500, targetLabel: '仅对空', unlocked: store.townHallLevel >= 4, unlockReq: '4本解锁' },
  { id: 5, name: '法师塔', level: 1, count: store.townHallLevel >= 5 ? 1 : 0, damage: 40, range: 7, hp: 600, targetLabel: '范围对空/地', unlocked: store.townHallLevel >= 5, unlockReq: '5本解锁' },
  { id: 6, name: '特斯拉电塔', level: 1, count: store.townHallLevel >= 7 ? 1 : 0, damage: 60, range: 6, hp: 500, targetLabel: '隐藏对空/地', unlocked: store.townHallLevel >= 7, unlockReq: '7本解锁' },
  { id: 7, name: 'X连弩', level: 1, count: store.townHallLevel >= 9 ? 2 : 0, damage: 80, range: 14, hp: 1500, targetLabel: '可切换模式', unlocked: store.townHallLevel >= 9, unlockReq: '9本解锁' },
])

const traps = computed(() => [
  { id: 1, name: '小型炸弹', count: 2, unlocked: store.townHallLevel >= 3, unlockReq: '3本解锁' },
  { id: 2, name: '弹簧陷阱', count: 1, unlocked: store.townHallLevel >= 4, unlockReq: '4本解锁' },
  { id: 3, name: '空气炸弹', count: 1, unlocked: store.townHallLevel >= 5, unlockReq: '5本解锁' },
  { id: 4, name: '巨型炸弹', count: 1, unlocked: store.townHallLevel >= 6, unlockReq: '6本解锁' },
  { id: 5, name: '搜空地雷', count: 1, unlocked: store.townHallLevel >= 7, unlockReq: '7本解锁' },
  { id: 6, name: '骷髅陷阱', count: 1, unlocked: store.townHallLevel >= 8, unlockReq: '8本解锁' },
])

const wallLevel = ref(1)
const wallCount = computed(() => [0, 5, 10, 20, 30, 40, 50, 60, 70][store.townHallLevel - 1] || 0)
const wallHP = computed(() => 300 + (wallLevel.value - 1) * 200)
const wallUpgradeCost = computed(() => wallLevel.value * 5000)

const defenseCount = computed(() => defenseBuildings.value.filter(d => d.unlocked).reduce((sum, d) => sum + d.count, 0))
const totalDefensePower = computed(() => defenseBuildings.value.filter(d => d.unlocked).reduce((sum, d) => sum + d.damage * d.count, 0))
const trapCount = computed(() => traps.value.filter(t => t.unlocked).reduce((sum, t) => sum + t.count, 0))

function formatNumber(num) {
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
  return num.toString()
}

function upgradeWalls() {
  if (store.spendGold(wallUpgradeCost.value)) {
    wallLevel.value++
  }
}
</script>

<style scoped>
.panel-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin: 24px 0 16px;
  color: var(--text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 8px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.defense-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.defense-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  position: relative;
  transition: all 0.2s;
}

.defense-card:hover:not(.locked) {
  box-shadow: 0 4px 12px var(--shadow);
}

.defense-card.locked {
  opacity: 0.6;
}

.defense-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.defense-icon {
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

.defense-info h4 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 2px;
  color: var(--text-primary);
}

.defense-level {
  font-size: 12px;
  color: var(--text-secondary);
}

.defense-count {
  margin-left: auto;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.defense-stats {
  margin-bottom: 12px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
}

.stat-row span:first-child {
  color: var(--text-secondary);
}

.defense-type {
  margin-top: 8px;
}

.type-tag {
  display: inline-block;
  padding: 4px 12px;
  background: var(--hover-bg);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-secondary);
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

.traps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.trap-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  position: relative;
}

.trap-card.locked {
  opacity: 0.5;
}

.trap-icon {
  width: 40px;
  height: 40px;
  background: var(--hover-bg);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  margin: 0 auto 8px;
  color: var(--text-primary);
}

.trap-name {
  font-size: 14px;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.trap-count {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.trap-lock {
  font-size: 12px;
  color: var(--text-muted);
}

.wall-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wall-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.wall-icon {
  width: 56px;
  height: 56px;
  background: var(--hover-bg);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.wall-details h4 {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.wall-details p {
  font-size: 14px;
  color: var(--text-secondary);
}

.btn {
  padding: 10px 24px;
  background: var(--text-primary);
  color: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  transition: background 0.2s;
}

.btn:hover:not(:disabled) {
  opacity: 0.85;
}

/* 疲劳值卡片 */
.fatigue-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.fatigue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.fatigue-header h3 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
}

.fatigue-value {
  font-size: 20px;
  font-weight: 600;
}

.fatigue-value.good { color: #4caf50; }
.fatigue-value.warning { color: #ff9800; }
.fatigue-value.danger { color: #f44336; }

.fatigue-bar {
  height: 12px;
  background: var(--hover-bg);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.fatigue-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s, background 0.3s;
}

.fatigue-fill.good { background: #4caf50; }
.fatigue-fill.warning { background: #ff9800; }
.fatigue-fill.danger { background: #f44336; }

/* 工人列表 */
.builders-fatigue-list {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.builder-fatigue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--hover-bg);
  border-radius: 8px;
}

.builder-info {
  min-width: 100px;
}

.builder-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  display: block;
}

.builder-status {
  font-size: 11px;
  color: var(--text-secondary);
}

.builder-status.busy {
  color: #ff9800;
}

.builder-fatigue-bar {
  flex: 1;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.builder-fatigue-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.builder-fatigue-fill.good { background: #4caf50; }
.builder-fatigue-fill.warning { background: #ff9800; }
.builder-fatigue-fill.danger { background: #f44336; }

.builder-fatigue-value {
  font-size: 12px;
  font-weight: 500;
  min-width: 36px;
  text-align: right;
}

.builder-fatigue-value.good { color: #4caf50; }
.builder-fatigue-value.warning { color: #ff9800; }
.builder-fatigue-value.danger { color: #f44336; }

.btn-mini {
  padding: 4px 8px;
  font-size: 11px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
}

.btn-mini:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--bg-card);
}

.btn-mini:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.fatigue-info {
  font-size: 13px;
  margin-bottom: 12px;
}

.fatigue-warning { color: #f44336; }
.fatigue-caution { color: #ff9800; }
.fatigue-normal { color: var(--text-secondary); }
.fatigue-good { color: #4caf50; }

.btn-restore {
  width: 100%;
  padding: 10px;
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-restore:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--bg-card);
}

/* 入侵历史 */
.invasion-history {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
}

.history-list {
  margin-top: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
}

.history-item:last-child {
  border-bottom: none;
}

.history-result {
  font-weight: 500;
  min-width: 70px;
  color: #f44336;
}

.history-item.defended .history-result {
  color: #4caf50;
}

.history-attacker {
  flex: 1;
  color: var(--text-primary);
}

.history-loss {
  color: #f44336;
}

.history-time {
  color: var(--text-secondary);
  font-size: 12px;
}

/* 入侵弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 32px 40px;
  text-align: center;
  min-width: 320px;
  max-width: 400px;
}

.modal-card h3 {
  font-size: 24px;
  margin-bottom: 16px;
}

.text-win { color: #4caf50; }
.text-lose { color: #f44336; }

.invasion-attacker {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.invasion-defense {
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.invasion-loss {
  background: rgba(244, 67, 54, 0.1);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.invasion-loss p {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.loss-gold, .loss-elixir, .loss-dark {
  display: inline-block;
  margin: 0 8px;
  font-weight: 500;
  color: #f44336;
}

.invasion-tip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  padding: 8px;
  background: var(--hover-bg);
  border-radius: 6px;
}

.modal-card .btn {
  margin-top: 8px;
  min-width: 120px;
}

/* 确认弹窗 */
.confirm-dialog {
  max-width: 360px;
}

.confirm-dialog h3 {
  color: var(--text-primary);
  margin-bottom: 16px;
}

.confirm-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.confirm-cost {
  font-size: 15px;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.gem-cost {
  color: #9c27b0;
  font-weight: 600;
}

.confirm-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-cancel {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover {
  background: var(--hover-bg);
}

.btn-confirm {
  background: #4caf50;
  color: #fff;
  border: none;
}

.btn-confirm:hover {
  background: #43a047;
}
</style>
