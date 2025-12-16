<template>
  <div class="panel">
    <h2 class="panel-title">防御布局</h2>
    
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
</style>
