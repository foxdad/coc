<template>
  <div class="panel">
    <!-- 未解锁弹窗 -->
    <div class="locked-modal" v-if="!isUnlocked">
      <div class="locked-content">
        <div class="locked-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 class="locked-title">功能已锁定</h2>
        <p class="locked-desc">需要升级大本营解锁英雄</p>
        
        <div class="locked-requirement">
          <div class="req-label">解锁条件:</div>
          <div class="req-building">
            <span class="req-name">大本营</span>
            <span class="req-level-badge">Lv 7</span>
          </div>
          <div class="req-current">当前等级: Lv {{ store.townHallLevel }}</div>
        </div>
        
        <button class="btn-goto" @click="goToBuildings">
          <span class="btn-goto-icon">建</span>
          前往建筑页面
        </button>
      </div>
    </div>

    <!-- 正常内容 -->
    <template v-else>
      <h2 class="panel-title">英雄</h2>
      
      <!-- 英雄卡片列表 -->
      <div class="heroes-grid">
        <div 
          v-for="hero in availableHeroes" 
          :key="hero.id" 
          class="hero-card"
          :class="{ locked: !isHeroUnlocked(hero) }"
        >
          <div class="hero-header">
            <div class="hero-icon">{{ hero.name.charAt(0) }}</div>
            <div class="hero-info">
              <h3>{{ hero.name }}</h3>
              <span class="hero-level" v-if="isHeroUnlocked(hero) && hero.level > 0">
                Lv.{{ hero.level }} / {{ getHeroMaxLevel(hero) }}
              </span>
              <span class="hero-level" v-else-if="isHeroUnlocked(hero)">
                未召唤
              </span>
            </div>
          </div>
          
          <template v-if="isHeroUnlocked(hero)">
            <!-- 未召唤状态 -->
            <div v-if="hero.level === 0" class="hero-summon">
              <p class="summon-desc">消耗暗黑重油召唤英雄</p>
              <div class="summon-cost">
                <span>{{ formatNumber(getSummonCost(hero)) }} 暗黑重油</span>
              </div>
              <button 
                class="btn btn-summon"
                :disabled="store.darkElixir < getSummonCost(hero)"
                @click="summonHero(hero)"
              >
                召唤
              </button>
            </div>
            
            <!-- 已召唤状态 -->
            <template v-else>
              <div class="hero-stats">
                <div class="stat-row">
                  <span>生命值</span>
                  <span>{{ getHeroHP(hero) }}</span>
                </div>
                <div class="stat-row">
                  <span>伤害</span>
                  <span>{{ getHeroDamage(hero) }}/次</span>
                </div>
              </div>
              
              <!-- 升级中 -->
              <div v-if="hero.upgrading" class="hero-upgrading">
                <div class="upgrade-info">
                  <span>升级中 → Lv.{{ hero.level + 1 }}</span>
                  <span>{{ formatTime(getHeroRemainingTime(hero)) }}</span>
                </div>
                <div class="upgrade-bar">
                  <div class="upgrade-fill" :style="{ width: getHeroUpgradeProgress(hero) + '%' }"></div>
                </div>
              </div>
              
              <!-- 可升级 -->
              <div v-else-if="hero.level < getHeroMaxLevel(hero)" class="hero-upgrade">
                <div class="upgrade-cost">
                  <span>升级到 Lv.{{ hero.level + 1 }}</span>
                  <span>{{ formatNumber(getUpgradeCost(hero)) }} 暗黑重油</span>
                  <span class="upgrade-time">{{ formatTime(getUpgradeTime(hero)) }}</span>
                </div>
                <button 
                  class="btn"
                  :disabled="store.darkElixir < getUpgradeCost(hero) || store.freeBuilders <= 0"
                  @click="upgradeHero(hero)"
                >
                  {{ store.freeBuilders <= 0 ? '无空闲工人' : '升级' }}
                </button>
              </div>
              
              <!-- 已满级 -->
              <div v-else class="hero-maxed">
                已达到当前大本营最高等级
              </div>
            </template>
          </template>
          
          <!-- 未解锁 -->
          <div v-else class="hero-locked-overlay">
            <span>{{ hero.unlockTH }}本解锁</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

// 定时器
const tick = ref(0)
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    tick.value++
    checkHeroUpgrades()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// 是否解锁英雄功能（7本）
const isUnlocked = computed(() => store.townHallLevel >= 7)

// 可用英雄列表
const availableHeroes = computed(() => store.heroes)

// 检查英雄是否解锁
function isHeroUnlocked(hero) {
  return store.townHallLevel >= hero.unlockTH
}

// 获取英雄当前最高可升级等级
function getHeroMaxLevel(hero) {
  if (hero.name === '野蛮人之王') {
    // 7本1级，8本可升至10级，9本可升至20级
    if (store.townHallLevel >= 9) return 20
    if (store.townHallLevel >= 8) return 10
    return 1
  }
  if (hero.name === '弓箭女皇') {
    // 9本解锁，可升至10级
    return 10
  }
  return hero.maxLevel
}

// 召唤费用
function getSummonCost(hero) {
  if (hero.name === '野蛮人之王') return 10000
  if (hero.name === '弓箭女皇') return 20000
  return 10000
}

// 召唤英雄
function summonHero(hero) {
  const cost = getSummonCost(hero)
  if (store.darkElixir >= cost) {
    store.darkElixir -= cost
    hero.level = 1
    hero.hp = getHeroHP(hero)
    hero.damage = getHeroDamage(hero)
  }
}

// 获取英雄生命值
function getHeroHP(hero) {
  const baseHP = hero.name === '野蛮人之王' ? 1000 : 800
  const hpPerLevel = hero.name === '野蛮人之王' ? 100 : 70
  return baseHP + (hero.level - 1) * hpPerLevel
}

// 获取英雄伤害
function getHeroDamage(hero) {
  const baseDamage = hero.name === '野蛮人之王' ? 50 : 60
  const damagePerLevel = hero.name === '野蛮人之王' ? 5 : 6
  return baseDamage + (hero.level - 1) * damagePerLevel
}

// 升级费用（暗黑重油）
function getUpgradeCost(hero) {
  // 每级递增
  const baseCost = hero.name === '野蛮人之王' ? 10000 : 20000
  const increment = hero.name === '野蛮人之王' ? 500 : 1000
  return baseCost + hero.level * increment
}

// 升级时间（秒）
function getUpgradeTime(hero) {
  // 每级递增5分钟（野蛮人之王）或7.5分钟（弓箭女皇）
  const baseTime = hero.name === '野蛮人之王' ? 300 : 450
  return baseTime * hero.level
}

// 升级英雄
function upgradeHero(hero) {
  const cost = getUpgradeCost(hero)
  if (store.darkElixir >= cost && store.freeBuilders > 0) {
    store.darkElixir -= cost
    
    // 占用建筑工人
    const freeBuilder = store.builders.find(b => !b.busy)
    if (freeBuilder) {
      const upgradeTime = getUpgradeTime(hero)
      const endTime = Date.now() + upgradeTime * 1000
      
      freeBuilder.busy = true
      freeBuilder.task = `升级${hero.name}`
      freeBuilder.endTime = endTime
      
      hero.upgrading = true
      hero.upgradeEndTime = endTime
      
      store.heroUpgradeQueue.push({
        heroId: hero.id,
        heroName: hero.name,
        startTime: Date.now(),
        endTime: endTime,
        targetLevel: hero.level + 1
      })
    }
  }
}

// 获取英雄升级剩余时间
function getHeroRemainingTime(hero) {
  tick.value // 触发响应
  if (!hero.upgrading || !hero.upgradeEndTime) return 0
  return Math.max(0, Math.ceil((hero.upgradeEndTime - Date.now()) / 1000))
}

// 获取英雄升级进度
function getHeroUpgradeProgress(hero) {
  if (!hero.upgrading || !hero.upgradeEndTime) return 0
  const queueItem = store.heroUpgradeQueue.find(q => q.heroId === hero.id)
  if (!queueItem) return 0
  const total = queueItem.endTime - queueItem.startTime
  const elapsed = Date.now() - queueItem.startTime
  return Math.min(100, (elapsed / total) * 100)
}

// 检查英雄升级完成
function checkHeroUpgrades() {
  const now = Date.now()
  store.heroes.forEach(hero => {
    if (hero.upgrading && hero.upgradeEndTime && hero.upgradeEndTime <= now) {
      // 完成升级
      hero.level++
      hero.hp = getHeroHP(hero)
      hero.damage = getHeroDamage(hero)
      hero.upgrading = false
      hero.upgradeEndTime = null
      
      // 释放建筑工人
      const taskName = `升级${hero.name}`
      const busyBuilder = store.builders.find(b => b.busy && b.task === taskName)
      if (busyBuilder) {
        busyBuilder.busy = false
        busyBuilder.task = null
        busyBuilder.endTime = null
      }
      
      // 从队列移除
      const idx = store.heroUpgradeQueue.findIndex(q => q.heroId === hero.id)
      if (idx !== -1) {
        store.heroUpgradeQueue.splice(idx, 1)
      }
    }
  })
}

function goToBuildings() {
  store.setMenu('buildings')
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return Math.floor(num / 1000) + 'K'
  return num.toString()
}

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
</script>

<style scoped>
.panel-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--text-primary);
}

.heroes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.hero-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  position: relative;
}

.hero-card.locked {
  opacity: 0.6;
}

.hero-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.hero-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #ffd54f, #ffb300);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}

.hero-info h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.hero-level {
  font-size: 14px;
  color: var(--text-secondary);
}

.hero-stats {
  background: var(--hover-bg);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-row span:first-child {
  color: var(--text-secondary);
}

.hero-summon {
  text-align: center;
  padding: 20px 0;
}

.summon-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.summon-cost {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.btn-summon {
  padding: 12px 32px;
  background: linear-gradient(135deg, #ffd54f, #ffb300);
  color: #333;
  font-weight: 600;
}

.hero-upgrade {
  background: var(--hover-bg);
  border-radius: 12px;
  padding: 16px;
}

.upgrade-cost {
  margin-bottom: 12px;
}

.upgrade-cost span {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.upgrade-cost span:first-child {
  font-weight: 500;
  color: var(--text-primary);
}

.upgrade-time {
  font-size: 13px;
  color: var(--text-muted);
}

.hero-upgrading {
  background: var(--hover-bg);
  border-radius: 12px;
  padding: 16px;
}

.upgrade-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.upgrade-bar {
  height: 8px;
  background: var(--progress-bg);
  border-radius: 4px;
  overflow: hidden;
}

.upgrade-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd54f, #ffb300);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.hero-maxed {
  text-align: center;
  padding: 16px;
  background: var(--success-bg);
  border-radius: 12px;
  font-size: 14px;
  color: var(--success-text);
}

.hero-locked-overlay {
  position: absolute;
  inset: 0;
  background: var(--bg-card);
  opacity: 0.9;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  font-size: 16px;
  color: var(--text-secondary);
}

.btn {
  width: 100%;
  padding: 12px 20px;
  background: var(--text-primary);
  color: var(--bg-secondary);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:hover:not(:disabled) {
  opacity: 0.85;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 锁定弹窗样式 */
.locked-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.locked-content {
  background: var(--bg-card);
  border-radius: 20px;
  padding: 40px 48px;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 4px 20px var(--shadow);
}

.locked-icon {
  width: 80px;
  height: 80px;
  background: var(--hover-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: var(--text-secondary);
}

.locked-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.locked-desc {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.locked-requirement {
  background: var(--hover-bg);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.req-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.req-building {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.req-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.req-level-badge {
  background: var(--text-primary);
  color: var(--bg-secondary);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.req-current {
  font-size: 14px;
  color: var(--text-muted);
}

.btn-goto {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 24px;
  background: var(--text-primary);
  color: var(--bg-secondary);
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-goto:hover {
  opacity: 0.85;
}

.btn-goto-icon {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
</style>
