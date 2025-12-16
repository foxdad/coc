<template>
  <div class="panel">
    <h2 class="panel-title">进攻掠夺</h2>
    
    <!-- 当前军队卡片 -->
    <div class="army-card">
      <div class="army-header">
        <span>当前军队</span>
        <span>{{ store.currentArmy }} / {{ store.armyCapacity }}</span>
      </div>
      <div class="army-list" v-if="activeTroops.length > 0">
        <span v-for="troop in activeTroops" :key="troop.id" class="army-tag">
          {{ troop.name }} ×{{ troop.count }}
        </span>
      </div>
      <div class="army-empty" v-else>
        <span>暂无部队</span>
        <button class="btn-link" @click="store.setMenu('troops')">去训练</button>
      </div>
    </div>
    
    <!-- 搜索对手 -->
    <h3 class="section-title">搜索对手</h3>
    <div class="search-card" v-if="!currentTarget">
      <p>消耗金币搜索可攻击的村庄</p>
      <button class="btn" @click="searchTarget" :disabled="store.gold < 100">
        搜索对手 (100 金币)
      </button>
    </div>
    
    <!-- 目标村庄卡片 -->
    <div class="target-card" v-else>
      <div class="target-header">
        <div class="target-info">
          <h4>{{ currentTarget.name }}</h4>
          <span class="target-th">{{ currentTarget.townHall }}本</span>
        </div>
        <button class="btn btn-outline btn-sm" @click="searchTarget">下一个</button>
      </div>
      
      <div class="loot-grid">
        <div class="loot-item">
          <span class="loot-label">金币</span>
          <span class="loot-value">{{ formatNumber(currentTarget.gold) }}</span>
        </div>
        <div class="loot-item">
          <span class="loot-label">圣水</span>
          <span class="loot-value">{{ formatNumber(currentTarget.elixir) }}</span>
        </div>
        <div class="loot-item">
          <span class="loot-label">奖杯</span>
          <span class="loot-value">+{{ currentTarget.trophies }}</span>
        </div>
      </div>
      
      <div class="target-defense">
        <span class="defense-label">防御配置:</span>
        <span v-for="def in currentTarget.defenses" :key="def" class="defense-tag">{{ def }}</span>
      </div>
      
      <!-- 兵力消耗警告 -->
      <div class="attack-warning">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>进攻将消耗所有部队，请确保已准备充足兵力</span>
      </div>
      
      <button 
        class="btn btn-attack"
        :disabled="store.currentArmy === 0"
        @click="startAttack"
      >
        发起进攻
      </button>
    </div>
    
    <!-- 战斗结果弹窗 -->
    <div class="modal-overlay" v-if="battleResult">
      <div class="modal-card">
        <h3 :class="battleResult.victory ? 'text-win' : 'text-lose'">
          {{ battleResult.victory ? '胜利!' : '失败' }}
        </h3>
        <div class="stars">{{ '★'.repeat(battleResult.stars) }}{{ '☆'.repeat(3 - battleResult.stars) }}</div>
        <p class="destruction">摧毁率: {{ battleResult.destruction }}%</p>
        <div class="result-loot">
          <span>获得: </span>
          <span class="loot-gold">+{{ formatNumber(battleResult.goldGained) }} 金币</span>
          <span class="loot-elixir">+{{ formatNumber(battleResult.elixirGained) }} 圣水</span>
        </div>
        <div class="result-trophies" :class="battleResult.trophiesGained >= 0 ? 'trophy-gain' : 'trophy-loss'">
          {{ battleResult.trophiesGained >= 0 ? '+' : '' }}{{ battleResult.trophiesGained }} 奖杯
        </div>
        <button class="btn" @click="battleResult = null">确定</button>
      </div>
    </div>
    
    <!-- 战斗记录 -->
    <h3 class="section-title">战斗记录</h3>
    <div class="history-card" v-if="battleHistory.length > 0">
      <div 
        v-for="(record, index) in battleHistory" 
        :key="index" 
        class="history-item"
      >
        <span class="history-result" :class="record.victory ? 'text-win' : 'text-lose'">
          {{ record.victory ? '胜' : '败' }}
        </span>
        <span class="history-target">{{ record.targetName }}</span>
        <span class="history-stars">{{ '★'.repeat(record.stars) }}</span>
        <span class="history-loot">+{{ formatNumber(record.goldGained) }}</span>
      </div>
    </div>
    <p class="text-muted" v-else>暂无战斗记录</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

const currentTarget = ref(null)
const battleResult = ref(null)
const battleHistory = ref([])

const activeTroops = computed(() => store.troops.filter(t => t.count > 0))

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
  return num.toString()
}

const targetNames = ['废弃村庄', '新手营地', '资源矿场', '防御要塞', '黄金部落', '暗影城堡', '哥布林峡谷', '野蛮人营地']

// 防御建筑配置：类型、伤害/秒、生命值、是否对空
const defenseConfig = {
  cannon: { name: '加农炮', dps: 15, hp: 500, canAir: false },
  archertower: { name: '箭塔', dps: 12, hp: 400, canAir: true },
  mortar: { name: '迫击炮', dps: 8, hp: 600, canAir: false, splash: true },
  airdefense: { name: '防空火箭', dps: 100, hp: 800, canAir: true, airOnly: true },
  wizardtower: { name: '法师塔', dps: 25, hp: 700, canAir: true, splash: true }
}

// 兵种配置：类型、生命值、伤害/秒、是否空中、角色类型
const troopConfig = {
  '野蛮人': { hp: 200, dps: 20, isAir: false, role: 'dps' },
  '弓箭手': { hp: 80, dps: 15, isAir: false, role: 'dps' },
  '巨人': { hp: 800, dps: 25, isAir: false, role: 'tank' },
  '哥布林': { hp: 100, dps: 20, isAir: false, role: 'dps' },
  '炸弹人': { hp: 120, dps: 150, isAir: false, role: 'breaker' },
  '气球兵': { hp: 400, dps: 100, isAir: true, role: 'dps' },
  '法师': { hp: 150, dps: 50, isAir: false, role: 'dps', splash: true },
  '天使': { hp: 200, dps: 0, isAir: true, role: 'healer', healPerSec: 50 },
  '飞龙': { hp: 1500, dps: 80, isAir: true, role: 'tank' },
  '皮卡超人': { hp: 3000, dps: 150, isAir: false, role: 'tank' },
  '亡灵': { hp: 120, dps: 40, isAir: true, role: 'dps' },
  '野猪骑士': { hp: 800, dps: 60, isAir: false, role: 'dps' },
  '熔岩猎犬': { hp: 3000, dps: 20, isAir: true, role: 'tank' }
}

// 根据大本营等级生成防御配置
function generateDefenses(thLevel) {
  const defenses = []
  // 加农炮：1本1个，每升1本+1，最多9个
  const cannonCount = Math.min(thLevel, 9)
  if (cannonCount > 0) defenses.push({ type: 'cannon', count: cannonCount, level: Math.min(thLevel, 9) })
  
  // 箭塔：2本解锁，每升1本+1，最多8个
  if (thLevel >= 2) {
    const archerCount = Math.min(thLevel - 1, 8)
    defenses.push({ type: 'archertower', count: archerCount, level: Math.min(thLevel, 8) })
  }
  
  // 迫击炮：3本解锁，最多4个
  if (thLevel >= 3) {
    const mortarCount = Math.min(Math.floor((thLevel - 1) / 2), 4)
    defenses.push({ type: 'mortar', count: mortarCount, level: Math.min(thLevel - 2, 5) })
  }
  
  // 防空火箭：4本解锁，最多3个
  if (thLevel >= 4) {
    const airDefCount = Math.min(Math.floor((thLevel - 2) / 2), 3)
    defenses.push({ type: 'airdefense', count: airDefCount, level: Math.min(thLevel - 3, 6) })
  }
  
  // 法师塔：5本解锁，最多4个
  if (thLevel >= 5) {
    const wizardCount = Math.min(Math.floor((thLevel - 3) / 2), 4)
    defenses.push({ type: 'wizardtower', count: wizardCount, level: Math.min(thLevel - 4, 5) })
  }
  
  return defenses
}

function searchTarget() {
  if (!store.spendGold(100)) return
  
  const thLevel = Math.max(1, store.townHallLevel + Math.floor(Math.random() * 3) - 1)
  const defenses = generateDefenses(thLevel)
  
  currentTarget.value = {
    name: targetNames[Math.floor(Math.random() * targetNames.length)],
    townHall: thLevel,
    townHallHP: 450 + thLevel * 400,
    gold: thLevel * 8000 + Math.floor(Math.random() * 15000),
    elixir: thLevel * 6000 + Math.floor(Math.random() * 12000),
    trophies: Math.floor(Math.random() * 20) + 5 + thLevel * 2,
    defenses: defenses,
    defenseDisplay: defenses.map(d => `${defenseConfig[d.type].name}×${d.count}`).filter(d => d)
  }
}

// 模拟战斗
function startAttack() {
  if (store.currentArmy === 0) return
  
  const target = currentTarget.value
  
  // 计算军队总属性
  let totalArmyHP = 0
  let totalArmyDPS = 0
  let airTroopHP = 0
  let groundTroopHP = 0
  let healPerSec = 0
  let hasTank = false
  
  store.troops.forEach(t => {
    if (t.count <= 0) return
    const config = troopConfig[t.name]
    if (!config) return
    
    const levelBonus = 1 + (t.level - 1) * 0.1 // 每级+10%属性
    const hp = config.hp * levelBonus * t.count
    const dps = config.dps * levelBonus * t.count
    
    totalArmyHP += hp
    totalArmyDPS += dps
    
    if (config.isAir) {
      airTroopHP += hp
    } else {
      groundTroopHP += hp
    }
    
    if (config.role === 'tank') hasTank = true
    if (config.role === 'healer') healPerSec += config.healPerSec * t.count
  })
  
  // 计算防御总属性
  let totalDefenseDPS = 0
  let antiAirDPS = 0
  let totalDefenseHP = 0
  
  target.defenses.forEach(d => {
    const config = defenseConfig[d.type]
    if (!config) return
    
    const levelBonus = 1 + (d.level - 1) * 0.15 // 每级+15%属性
    const dps = config.dps * levelBonus * d.count
    const hp = config.hp * levelBonus * d.count
    
    totalDefenseHP += hp
    
    if (config.airOnly) {
      antiAirDPS += dps
    } else if (config.canAir) {
      totalDefenseDPS += dps * 0.5 // 可对空的分配一半给空中
      antiAirDPS += dps * 0.5
    } else {
      totalDefenseDPS += dps
    }
  })
  
  // 大本营生命值
  totalDefenseHP += target.townHallHP
  
  // 模拟战斗（简化版回合制）
  const battleDuration = 180 // 3分钟战斗时间
  let armyHP = totalArmyHP
  let defenseHP = totalDefenseHP
  
  // 计算有效DPS（考虑空中/地面）
  const airRatio = airTroopHP / (totalArmyHP || 1)
  const effectiveDefenseDPS = totalDefenseDPS * (1 - airRatio) + antiAirDPS * airRatio
  
  // 坦克加成：有坦克时减少受到的伤害
  const tankBonus = hasTank ? 0.7 : 1.0
  
  // 治疗效果
  const effectiveHeal = healPerSec * battleDuration * 0.5 // 治疗效率50%
  
  // 模拟战斗
  for (let t = 0; t < battleDuration && armyHP > 0 && defenseHP > 0; t++) {
    // 军队攻击防御
    defenseHP -= totalArmyDPS
    
    // 防御攻击军队
    armyHP -= effectiveDefenseDPS * tankBonus
    
    // 治疗恢复
    armyHP = Math.min(totalArmyHP, armyHP + healPerSec * 0.5)
  }
  
  // 计算摧毁率
  const defenseDestroyed = Math.max(0, totalDefenseHP - defenseHP)
  let destruction = Math.floor((defenseDestroyed / totalDefenseHP) * 100)
  
  // 如果军队全灭但防御没清完，摧毁率打折
  if (armyHP <= 0 && defenseHP > 0) {
    destruction = Math.min(destruction, 49)
  }
  
  // 随机波动 ±10%
  destruction = Math.min(100, Math.max(0, destruction + Math.floor(Math.random() * 21) - 10))
  
  // 计算星级
  const stars = destruction >= 100 ? 3 : destruction >= 50 ? 2 : destruction >= 30 ? 1 : 0
  const victory = stars >= 1
  
  // 计算奖励
  const goldGained = Math.floor(target.gold * (destruction / 100))
  const elixirGained = Math.floor(target.elixir * (destruction / 100))
  const trophiesGained = victory ? target.trophies : -Math.floor(target.trophies / 2)
  
  // 应用奖励
  store.addGold(goldGained)
  store.addElixir(elixirGained)
  store.trophies = Math.max(0, store.trophies + trophiesGained)
  store.troops.forEach(t => t.count = 0)
  
  battleResult.value = { victory, stars, destruction, goldGained, elixirGained, trophiesGained }
  
  battleHistory.value.unshift({ victory, stars, targetName: target.name, goldGained, trophiesGained })
  if (battleHistory.value.length > 5) battleHistory.value.pop()
  
  currentTarget.value = null
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

.army-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 8px;
}

.army-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-primary);
}

.army-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.army-tag {
  padding: 6px 14px;
  background: var(--hover-bg);
  border-radius: 20px;
  font-size: 14px;
  color: var(--text-primary);
}

.army-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
}

.btn-link {
  background: none;
  border: none;
  color: var(--text-primary);
  text-decoration: underline;
  font-size: 14px;
  cursor: pointer;
}

.search-card {
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
}

.search-card p {
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.target-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
}

.target-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.target-info h4 {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.target-th {
  font-size: 13px;
  color: var(--text-secondary);
}

.loot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.loot-item {
  background: var(--hover-bg);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.loot-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.loot-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.target-defense {
  margin-bottom: 20px;
}

.defense-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-right: 8px;
}

.defense-tag {
  display: inline-block;
  padding: 4px 10px;
  background: var(--hover-bg);
  border-radius: 12px;
  font-size: 13px;
  margin-right: 6px;
  color: var(--text-primary);
}

.btn {
  padding: 12px 24px;
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

.btn-outline {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  border-color: var(--text-primary);
}

.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}

.btn-attack {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 500;
}

.attack-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #f57c00;
}

[data-theme="dark"] .attack-warning {
  background: rgba(255, 152, 0, 0.1);
  border-color: rgba(255, 152, 0, 0.3);
  color: #ffb74d;
}

.attack-warning svg {
  flex-shrink: 0;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
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
}

.modal-card h3 {
  font-size: 28px;
  margin-bottom: 12px;
}

.text-win {
  color: var(--text-primary);
}

.text-lose {
  color: var(--text-muted);
}

.stars {
  font-size: 36px;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.destruction {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.result-loot {
  margin-bottom: 12px;
  color: var(--text-primary);
}

.loot-gold {
  margin-right: 12px;
}

.result-trophies {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
}

.trophy-gain {
  color: #ffc107;
}

.trophy-loss {
  color: #f44336;
}

.history-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-light);
}

.history-item:last-child {
  border-bottom: none;
}

.history-result {
  font-weight: 600;
  width: 24px;
}

.history-target {
  flex: 1;
  color: var(--text-primary);
}

.history-stars {
  color: var(--text-primary);
}

.history-loot {
  color: var(--text-secondary);
  font-size: 14px;
}

.text-muted {
  color: var(--text-secondary);
}
</style>
