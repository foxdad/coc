<template>
  <div class="panel">
    <h2 class="panel-title">哥布林副本</h2>
    
    <!-- 副本状态栏 -->
    <div class="campaign-status">
      <div class="status-item">
        <span class="status-label">今日剩余挑战</span>
        <span class="status-value">{{ remainingAttempts }}/3</span>
      </div>
      <div class="status-item" v-if="cooldownRemaining > 0">
        <span class="status-label">冷却时间</span>
        <span class="status-value cooldown">{{ formatTime(cooldownRemaining) }}</span>
      </div>
    </div>

    <!-- 副本列表 -->
    <div class="campaign-list">
      <div 
        v-for="level in campaignLevels" 
        :key="level.id"
        class="campaign-card"
        :class="{ 
          locked: !isLevelUnlocked(level),
          completed: isLevelCompleted(level),
          current: isCurrentLevel(level)
        }"
      >
        <div class="campaign-header">
          <div class="level-badge">{{ level.thLevel }}本</div>
          <div class="campaign-info">
            <h3>{{ level.name }}</h3>
            <p class="campaign-desc">{{ level.objective }}</p>
          </div>
          <div class="campaign-status-icon">
            <span v-if="isLevelCompleted(level)" class="completed-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </span>
            <span v-else-if="!isLevelUnlocked(level)" class="locked-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
          </div>
        </div>

        <!-- 敌人配置 -->
        <div class="enemy-config" v-if="isLevelUnlocked(level)">
          <div class="config-title">敌人配置</div>
          <div class="enemy-list">{{ level.enemies }}</div>
        </div>

        <!-- 奖励 -->
        <div class="rewards" v-if="isLevelUnlocked(level)">
          <div class="config-title">通关奖励</div>
          <div class="reward-items">
            <span class="reward-item gold">{{ formatNumber(level.rewards.gold) }} 金币</span>
            <span class="reward-item elixir">{{ formatNumber(level.rewards.elixir) }} 圣水</span>
            <span class="reward-item dark" v-if="level.rewards.dark > 0">{{ level.rewards.dark }} 暗黑重油</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="campaign-actions" v-if="isLevelUnlocked(level)">
          <button 
            v-if="!isLevelCompleted(level)"
            class="btn btn-challenge"
            :disabled="!canChallenge"
            @click="startChallenge(level)"
          >
            {{ getChallengeButtonText() }}
          </button>
          <button 
            v-else
            class="btn btn-replay"
            :disabled="!canChallenge"
            @click="startChallenge(level)"
          >
            {{ getChallengeButtonText(true) }}
          </button>
        </div>

        <!-- 未解锁提示 -->
        <div class="unlock-hint" v-if="!isLevelUnlocked(level)">
          <span>升级大本营到 {{ level.thLevel }} 级解锁</span>
        </div>
      </div>
    </div>

    <!-- 战斗弹窗 -->
    <div class="battle-modal" v-if="battleState.active">
      <div class="battle-content">
        <h3>{{ battleState.level?.name }}</h3>
        
        <!-- 战斗进度 -->
        <div class="battle-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: battleProgress + '%' }"></div>
          </div>
          <div class="battle-time">剩余时间: {{ formatTime(battleTimeRemaining) }}</div>
        </div>

        <!-- 战斗日志 -->
        <div class="battle-log">
          <div v-for="(log, idx) in battleLogs" :key="idx" class="log-item" :class="log.type">
            {{ log.text }}
          </div>
        </div>

        <!-- 战斗结果 -->
        <div class="battle-result" v-if="battleState.finished">
          <div class="result-title" :class="battleState.victory ? 'victory' : 'defeat'">
            {{ battleState.victory ? '胜利' : '失败' }}
          </div>
          <div class="result-rewards" v-if="battleState.victory">
            <div class="reward-item">+{{ formatNumber(battleState.level.rewards.gold) }} 金币</div>
            <div class="reward-item">+{{ formatNumber(battleState.level.rewards.elixir) }} 圣水</div>
            <div class="reward-item" v-if="battleState.level.rewards.dark > 0">+{{ battleState.level.rewards.dark }} 暗黑重油</div>
          </div>
          <button class="btn" @click="closeBattle">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

// 定时器
let timer = null
const tick = ref(0)

onMounted(() => {
  timer = setInterval(() => {
    tick.value++
    if (battleState.value.active && !battleState.value.finished) {
      updateBattle()
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// 副本关卡配置
const campaignLevels = [
  {
    id: 1, thLevel: 1, name: '哥布林营地',
    enemies: '1级哥布林×10（无防御建筑）',
    objective: '全歼敌人',
    rewards: { gold: 500, elixir: 500, dark: 0 },
    difficulty: 1
  },
  {
    id: 2, thLevel: 2, name: '哥布林前哨',
    enemies: '2级哥布林×15、1级箭塔×1',
    objective: '摧毁箭塔 + 全歼敌人',
    rewards: { gold: 1500, elixir: 1500, dark: 0 },
    difficulty: 2
  },
  {
    id: 3, thLevel: 3, name: '哥布林矿场',
    enemies: '3级哥布林×20、1级加农炮×1、城墙×8、小型炸弹×2',
    objective: '摧毁大本营 + 全歼敌人',
    rewards: { gold: 4000, elixir: 4000, dark: 0 },
    difficulty: 3
  },
  {
    id: 4, thLevel: 4, name: '哥布林仓库',
    enemies: '3级哥布林×25、哥布林投手×5、防空火箭×1、迫击炮×1',
    objective: '摧毁所有防御 + 全歼敌人',
    rewards: { gold: 15000, elixir: 15000, dark: 0 },
    difficulty: 4
  },
  {
    id: 5, thLevel: 5, name: '哥布林工坊',
    enemies: '4级哥布林×30、哥布林法师×3、法师塔×1、弹簧陷阱×2',
    objective: '摧毁法师塔 + 大本营',
    rewards: { gold: 40000, elixir: 40000, dark: 0 },
    difficulty: 5
  },
  {
    id: 6, thLevel: 6, name: '哥布林要塞',
    enemies: '5级哥布林×35、哥布林飞桶×2、空气炮×1、巨型炸弹×1',
    objective: '全歼敌人 + 摧毁飞桶发射点',
    rewards: { gold: 100000, elixir: 100000, dark: 0 },
    difficulty: 6
  },
  {
    id: 7, thLevel: 7, name: '哥布林暗黑营地',
    enemies: '6级哥布林×40、暗黑哥布林×10、特斯拉电塔×1、搜空地雷×1',
    objective: '摧毁暗黑重油罐×2 + 大本营',
    rewards: { gold: 200000, elixir: 200000, dark: 800 },
    difficulty: 7
  },
  {
    id: 8, thLevel: 8, name: '哥布林堡垒',
    enemies: '7级哥布林×45、哥布林战车×2、炸弹塔×1、骷髅陷阱×1',
    objective: '摧毁战车 + 大本营',
    rewards: { gold: 350000, elixir: 350000, dark: 1500 },
    difficulty: 8
  },
  {
    id: 9, thLevel: 9, name: '哥布林王国',
    enemies: '8级哥布林×50、哥布林国王×1、X连弩×1、冰冻陷阱×1',
    objective: '击败哥布林国王 + 摧毁大本营',
    rewards: { gold: 600000, elixir: 600000, dark: 3000 },
    difficulty: 9
  }
]

// 副本进度数据
const campaignProgress = computed(() => store.campaignProgress || {
  completedLevels: [],
  dailyAttempts: 0,
  lastAttemptDate: null,
  cooldownEndTime: null
})

// 今日剩余挑战次数
const remainingAttempts = computed(() => {
  tick.value // 触发响应
  const today = new Date().toDateString()
  if (campaignProgress.value.lastAttemptDate !== today) {
    return 3
  }
  return Math.max(0, 3 - (campaignProgress.value.dailyAttempts || 0))
})

// 冷却剩余时间（秒）
const cooldownRemaining = computed(() => {
  tick.value // 触发响应
  if (!campaignProgress.value.cooldownEndTime) return 0
  const remaining = campaignProgress.value.cooldownEndTime - Date.now()
  return Math.max(0, Math.ceil(remaining / 1000))
})

// 是否有部队
const hasTroops = computed(() => {
  return store.troops.some(t => t.count > 0)
})

// 是否可以挑战
const canChallenge = computed(() => {
  return remainingAttempts.value > 0 && cooldownRemaining.value <= 0 && hasTroops.value
})

// 检查关卡是否解锁
function isLevelUnlocked(level) {
  return store.townHallLevel >= level.thLevel
}

// 检查关卡是否已通关
function isLevelCompleted(level) {
  return campaignProgress.value.completedLevels?.includes(level.id)
}

// 检查是否是当前关卡
function isCurrentLevel(level) {
  if (!isLevelUnlocked(level)) return false
  if (isLevelCompleted(level)) return false
  // 前一关已通关或是第一关
  const prevLevel = campaignLevels.find(l => l.id === level.id - 1)
  if (!prevLevel) return true
  return isLevelCompleted(prevLevel)
}

// 根据难度获取战斗时长（秒）
function getBattleDuration(difficulty) {
  // 1本: 10秒, 2本: 15秒, 3本: 20秒, 4本: 30秒, 5本: 45秒, 6本: 60秒, 7本: 90秒, 8本: 120秒, 9本: 180秒
  const durations = { 1: 10, 2: 15, 3: 20, 4: 30, 5: 45, 6: 60, 7: 90, 8: 120, 9: 180 }
  return durations[difficulty] || 30
}

// 获取玩家拥有的兵种（数量>0）
function getOwnedTroops() {
  return store.troops.filter(t => t.count > 0)
}

// 根据玩家兵种生成战斗事件
function generateBattleEvents(level) {
  const ownedTroops = getOwnedTroops()
  const events = []
  
  // 通用事件
  events.push('哥布林反击，造成少量伤害')
  events.push('防御塔被摧毁')
  events.push('敌方援军出现')
  events.push('我方部队推进中')
  
  // 根据拥有的兵种添加事件
  ownedTroops.forEach(troop => {
    switch(troop.name) {
      case '野蛮人':
        events.push(`野蛮人冲锋，消灭了${Math.floor(Math.random() * 3) + 2}个哥布林`)
        events.push('野蛮人承受了敌方攻击')
        break
      case '弓箭手':
        events.push(`弓箭手远程攻击，击杀${Math.floor(Math.random() * 2) + 1}个敌人`)
        events.push('弓箭手集火攻击防御塔')
        break
      case '巨人':
        events.push('巨人吸引了防御塔火力')
        events.push('巨人正在攻击城墙')
        break
      case '哥布林':
        events.push('哥布林快速掠夺资源建筑')
        events.push('哥布林绕后偷袭')
        break
      case '炸弹人':
        events.push('炸弹人成功炸开城墙')
        events.push('炸弹人冲向防御建筑')
        break
      case '气球兵':
        events.push('气球兵从空中投下炸弹')
        events.push('气球兵摧毁了防御塔')
        break
      case '法师':
        events.push('法师释放火球，造成范围伤害')
        events.push('法师清理了一群哥布林')
        break
      case '天使':
        events.push('天使治疗了受伤的部队')
        events.push('天使持续恢复部队生命')
        break
      case '飞龙':
        events.push('飞龙喷射火焰，烧毁建筑')
        events.push('飞龙从空中俯冲攻击')
        break
      case '皮卡超人':
        events.push('皮卡超人重击，一刀秒杀敌人')
        events.push('皮卡超人冲入敌阵')
        break
      case '亡灵':
        events.push('亡灵群起攻击')
        events.push('亡灵绕过城墙进攻')
        break
      case '野猪骑士':
        events.push('野猪骑士跳过城墙直取防御塔')
        events.push('野猪骑士快速移动中')
        break
      case '女武神':
        events.push('女武神旋风斩击，清理敌群')
        events.push('女武神冲入敌阵大杀四方')
        break
      case '戈仑石人':
        events.push('戈仑石人吸收大量伤害')
        events.push('戈仑石人爆炸分裂')
        break
      case '熔岩猎犬':
        events.push('熔岩猎犬吸引防空火力')
        events.push('熔岩猎犬爆炸释放小熔岩')
        break
    }
  })
  
  // 如果没有兵种，添加默认事件
  if (ownedTroops.length === 0) {
    events.push('部队数量不足，进攻乏力')
    events.push('需要更多部队才能有效进攻')
  }
  
  return events
}

// 战斗状态
const battleState = ref({
  active: false,
  finished: false,
  victory: false,
  level: null,
  startTime: null,
  duration: 30,
  battleEvents: []
})

const battleLogs = ref([])
const battleProgress = ref(0)
let lastEventTime = 0

// 战斗剩余时间
const battleTimeRemaining = computed(() => {
  tick.value
  if (!battleState.value.active || !battleState.value.startTime) return 0
  const elapsed = Math.floor((Date.now() - battleState.value.startTime) / 1000)
  return Math.max(0, battleState.value.duration - elapsed)
})

// 开始挑战
function startChallenge(level) {
  if (!canChallenge.value) return
  
  const duration = getBattleDuration(level.difficulty)
  const battleEvents = generateBattleEvents(level)
  
  battleState.value = {
    active: true,
    finished: false,
    victory: false,
    level: level,
    startTime: Date.now(),
    duration: duration,
    battleEvents: battleEvents
  }
  battleLogs.value = []
  battleProgress.value = 0
  lastEventTime = 0
  
  // 添加开始日志
  addBattleLog('info', `开始挑战【${level.name}】`)
  addBattleLog('info', `目标: ${level.objective}`)
  
  // 显示出战部队
  const ownedTroops = getOwnedTroops()
  if (ownedTroops.length > 0) {
    const troopList = ownedTroops.map(t => `${t.name}×${t.count}`).join('、')
    addBattleLog('info', `出战部队: ${troopList}`)
  } else {
    addBattleLog('info', '警告: 没有可用部队！')
  }
}

// 更新战斗
function updateBattle() {
  if (!battleState.value.active || battleState.value.finished) return
  
  const elapsed = Math.floor((Date.now() - battleState.value.startTime) / 1000)
  const level = battleState.value.level
  const duration = battleState.value.duration
  
  // 模拟战斗进度
  battleProgress.value = Math.min(100, (elapsed / duration) * 100)
  
  // 根据战斗时长动态调整事件间隔
  const eventInterval = Math.max(2, Math.floor(duration / 6))
  
  // 随机战斗事件
  if (elapsed > lastEventTime && elapsed % eventInterval === 0 && elapsed < duration) {
    const events = battleState.value.battleEvents
    if (events.length > 0) {
      const randomEvent = events[Math.floor(Math.random() * events.length)]
      addBattleLog('battle', randomEvent)
      lastEventTime = elapsed
    }
  }
  
  // 战斗结束判定
  if (elapsed >= duration * 0.8) {
    // 根据难度和军队计算胜率
    const ownedTroops = getOwnedTroops()
    const totalTroopPower = ownedTroops.reduce((sum, t) => sum + t.count * t.population * 10, 0)
    const armyPower = totalTroopPower + store.townHallLevel * 50
    const requiredPower = level.difficulty * 80
    
    // 没有部队时胜率很低
    let winChance = ownedTroops.length === 0 ? 0.1 : Math.min(0.95, armyPower / requiredPower)
    
    const victory = Math.random() < winChance
    finishBattle(victory)
  }
}

// 添加战斗日志
function addBattleLog(type, text) {
  battleLogs.value.push({ type, text, time: Date.now() })
  // 保持最多20条日志
  if (battleLogs.value.length > 20) {
    battleLogs.value.shift()
  }
}

// 结束战斗
function finishBattle(victory) {
  battleState.value.finished = true
  battleState.value.victory = victory
  battleProgress.value = 100
  
  if (victory) {
    addBattleLog('victory', '战斗胜利！')
    const level = battleState.value.level
    
    // 发放奖励
    store.addGold(level.rewards.gold)
    store.addElixir(level.rewards.elixir)
    if (level.rewards.dark > 0 && store.townHallLevel >= 7) {
      store.darkElixir = Math.min(store.darkElixir + level.rewards.dark, store.maxDarkElixir)
    }
    
    // 标记通关
    store.completeCampaignLevel(level.id)
  } else {
    addBattleLog('defeat', '战斗失败，部队全灭')
  }
  
  // 更新挑战次数和冷却（只有胜利才消耗次数）
  if (victory) {
    store.useCampaignAttempt()
  }
}

// 关闭战斗弹窗
function closeBattle() {
  battleState.value.active = false
  battleState.value.finished = false
  battleLogs.value = []
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return Math.floor(num / 1000) + 'K'
  return num.toString()
}

function formatTime(seconds) {
  if (seconds <= 0) return '0秒'
  if (seconds < 60) return `${seconds}秒`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`
}

// 获取挑战按钮文字
function getChallengeButtonText(isReplay = false) {
  if (!hasTroops.value) return '没有部队'
  if (cooldownRemaining.value > 0) return '冷却中'
  if (remainingAttempts.value <= 0) return '今日次数已用完'
  return isReplay ? '重新挑战' : '开始挑战'
}
</script>

<style scoped>
.panel-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--text-primary);
}

.campaign-status {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.status-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-value.cooldown {
  color: #e74c3c;
}

.campaign-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.campaign-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s;
}

.campaign-card.current {
  border-color: #f39c12;
  box-shadow: 0 0 0 2px rgba(243, 156, 18, 0.2);
}

.campaign-card.completed {
  opacity: 0.8;
}

.campaign-card.locked {
  opacity: 0.5;
}

.campaign-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.level-badge {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.campaign-card.completed .level-badge {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
}

.campaign-card.locked .level-badge {
  background: #95a5a6;
}

.campaign-info {
  flex: 1;
}

.campaign-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.campaign-desc {
  font-size: 14px;
  color: var(--text-secondary);
}

.campaign-status-icon {
  color: var(--text-secondary);
}

.completed-icon {
  color: #27ae60;
}

.locked-icon {
  color: #95a5a6;
}

.enemy-config, .rewards {
  margin-bottom: 16px;
}

.config-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.enemy-list {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
}

.reward-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.reward-item {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.reward-item.gold {
  background: rgba(241, 196, 15, 0.15);
  color: #f39c12;
}

.reward-item.elixir {
  background: rgba(155, 89, 182, 0.15);
  color: #9b59b6;
}

.reward-item.dark {
  background: rgba(52, 73, 94, 0.15);
  color: #34495e;
}

.campaign-actions {
  margin-top: 16px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-challenge {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: #fff;
}

.btn-challenge:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
}

.btn-replay {
  background: var(--text-primary);
  color: var(--bg-secondary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.unlock-hint {
  margin-top: 16px;
  padding: 12px;
  background: var(--hover-bg);
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 战斗弹窗 */
.battle-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.battle-content {
  background: var(--bg-card);
  border-radius: 20px;
  padding: 32px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.battle-content h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
  text-align: center;
}

.battle-progress {
  margin-bottom: 20px;
}

.progress-bar {
  height: 8px;
  background: var(--progress-bg);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f39c12, #e67e22);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.battle-time {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
}

.battle-log {
  background: var(--hover-bg);
  border-radius: 12px;
  padding: 16px;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.log-item {
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
}

.log-item:last-child {
  border-bottom: none;
}

.log-item.info {
  color: var(--text-secondary);
}

.log-item.battle {
  color: var(--text-primary);
}

.log-item.victory {
  color: #27ae60;
  font-weight: 600;
}

.log-item.defeat {
  color: #e74c3c;
  font-weight: 600;
}

.battle-result {
  text-align: center;
}

.result-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 16px;
}

.result-title.victory {
  color: #27ae60;
}

.result-title.defeat {
  color: #e74c3c;
}

.result-rewards {
  margin-bottom: 20px;
}

.result-rewards .reward-item {
  display: block;
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.battle-result .btn {
  width: 100%;
  background: var(--text-primary);
  color: var(--bg-secondary);
}
</style>
