<template>
  <div class="panel">
    <h2 class="panel-title">村庄总览</h2>

    <!-- 首席日记 -->
    <div class="diary-card">
      <div class="diary-header">
        <span class="diary-icon">📜</span>
        <span class="diary-title">首席日记</span>
        <span class="diary-time">{{ diaryTime }}</span>
      </div>
      <div class="diary-content">
        <p>{{ currentDiary }}</p>
      </div>
      <button class="diary-refresh" @click="refreshDiary" title="换一条">🔄</button>
    </div>

    <!-- 大本营主卡片 -->
    <div class="main-card">
      <div class="main-card-header">
        <div class="th-badge">
          <span class="th-level">{{ store.townHallLevel }}</span>
          <span class="th-label">本</span>
        </div>
        <div class="th-info">
          <h3>大本营</h3>
          <div class="th-stats">
            <span class="th-stat">生命值 {{ townHallHP }}</span>
            <span class="th-stat-divider">|</span>
            <span class="th-stat">建筑工人 {{ store.freeBuilders }}/{{ store.builders.length }}</span>
          </div>
        </div>
      </div>

      <!-- 大本营升级信息 -->
      <div class="th-upgrade-section" v-if="store.townHallLevel < 9">
        <div class="upgrade-header">
          <span class="upgrade-label">升级到 {{ store.townHallLevel + 1 }} 本</span>
          <span class="upgrade-time">{{ formatUpgradeTime(getUpgradeTime()) }}</span>
        </div>
        <div class="upgrade-cost-row">
          <div class="cost-item" :class="{ enough: store.gold >= upgradeCost }">
            <span class="cost-label">需要金币</span>
            <span class="cost-value">{{ formatNumber(upgradeCost) }}</span>
          </div>
          <button
            class="btn btn-upgrade"
            :disabled="store.gold < upgradeCost || store.freeBuilders <= 0"
            @click="upgradeTownHall"
          >
            {{ store.freeBuilders <= 0 ? '无空闲工人' : '升级' }}
          </button>
        </div>
      </div>
      <div class="th-maxed" v-else>已达到最高等级</div>
    </div>

    <!-- 资源产出统计 -->
    <div class="section">
      <h3 class="section-title">资源产出</h3>
      <div class="production-grid">
        <div class="production-card">
          <div class="production-icon gold-icon">金</div>
          <div class="production-info">
            <div class="production-label">金币产量</div>
            <div class="production-value">+{{ store.goldProductionPerMinute }}/分钟</div>
          </div>
          <div class="production-buildings">{{ goldMineCount }} 座金矿</div>
        </div>
        <div class="production-card">
          <div class="production-icon elixir-icon">圣</div>
          <div class="production-info">
            <div class="production-label">圣水产量</div>
            <div class="production-value">+{{ store.elixirProductionPerMinute }}/分钟</div>
          </div>
          <div class="production-buildings">{{ elixirCollectorCount }} 座收集器</div>
        </div>
        <div class="production-card" v-if="store.townHallLevel >= 7">
          <div class="production-icon dark-icon">暗</div>
          <div class="production-info">
            <div class="production-label">暗黑产量</div>
            <div class="production-value">+{{ store.darkProductionPerMinute }}/分钟</div>
          </div>
          <div class="production-buildings">{{ darkDrillCount }} 座钻井</div>
        </div>
      </div>
    </div>

    <!-- 村庄统计 -->
    <div class="section">
      <h3 class="section-title">村庄统计</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">{{ totalBuildings }}</div>
          <div class="stat-label">建筑总数</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ defenseBuildings }}</div>
          <div class="stat-label">防御建筑</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ resourceBuildings }}</div>
          <div class="stat-label">资源建筑</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ store.armyCapacity }}</div>
          <div class="stat-label">军队容量</div>
        </div>
      </div>
    </div>

    <!-- 村庄树木 -->
    <div class="section">
      <h3 class="section-title">
        <span>村庄树木</span>
        <span class="tree-count">{{ store.trees.length }}/10</span>
      </h3>
      <div class="trees-area" v-if="store.trees.length > 0">
        <div v-for="tree in store.trees" :key="tree.id" class="tree-item">
          <div class="tree-icon">{{ getTreeIcon(tree.type) }}</div>
          <div class="tree-info">
            <span class="tree-name">{{ tree.type }}</span>
          </div>
          <button 
            class="btn-remove-tree" 
            @click="handleRemoveTree(tree.id)"
            :disabled="store.elixir < 100"
          >
            挖掉 (100圣水)
          </button>
        </div>
      </div>
      <div class="trees-empty" v-else>
        <p>村庄里暂时没有树木</p>
        <p class="trees-hint">树木会随时间自动生长，挖掉有几率获得宝石</p>
      </div>
      
      <!-- 挖树结果提示 -->
      <div class="tree-result" v-if="treeResult" :class="treeResult.gemsGained > 0 ? 'success' : 'normal'">
        {{ treeResult.message }}
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="section">
      <h3 class="section-title">快捷操作</h3>
      <div class="quick-actions">
        <button class="quick-btn" @click="store.setMenu('buildings')">
          <span class="quick-icon">建</span>
          <span class="quick-text">建筑管理</span>
        </button>
        <button class="quick-btn" @click="store.setMenu('troops')">
          <span class="quick-icon">兵</span>
          <span class="quick-text">训练部队</span>
        </button>
        <button class="quick-btn" @click="store.setMenu('attack')">
          <span class="quick-icon">攻</span>
          <span class="quick-text">发起进攻</span>
        </button>
        <button class="quick-btn" @click="store.setMenu('defense')">
          <span class="quick-icon">防</span>
          <span class="quick-text">防御布局</span>
        </button>
      </div>
    </div>

    <!-- 下一级解锁内容 -->
    <div class="section" v-if="nextUnlocks.length > 0">
      <h3 class="section-title">
        <span>{{ store.townHallLevel + 1 }} 本解锁内容</span>
      </h3>
      <div class="unlock-list">
        <div class="unlock-item" v-for="item in nextUnlocks" :key="item.name">
          <span class="unlock-icon">{{ item.icon }}</span>
          <span class="unlock-name">{{ item.name }}</span>
          <span class="unlock-type">{{ item.type }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

// 树木结果提示
const treeResult = ref(null)
let treeResultTimer = null
let treeGrowthTimer = null
let diaryTimer = null

// 首席日记
const currentDiary = ref('')
const diaryTime = ref('')

// 日记模板库
const diaryTemplates = {
  // 通用日记
  general: [
    '阳光明媚的一天，村民们都在辛勤劳作。',
    '今天天气不错，适合升级建筑。',
    '远处传来野蛮人的训练声，村庄一片祥和。',
    '夜幕降临，防御塔上的火把照亮了整个村庄。',
    '清晨的露水打湿了草地，新的一天开始了。',
    '微风吹过，金矿旁的旗帜轻轻飘扬。',
  ],
  // 建筑工人相关
  builder: [
    '建筑工人老王今天格外卖力，一边干活一边哼着小曲。',
    '工人小李在金矿旁偷偷喝了口圣水，被我逮个正着。',
    '建筑工人们正在讨论下一个升级哪个建筑。',
    '老王说他年轻时一天能盖三座箭塔，现在只能盖两座了。',
    '工人们抱怨最近加班太多，我决定给他们加点宝石奖励。',
  ],
  // 资源相关
  resource: [
    '金矿产量不错，储金罐快满了，得赶紧花掉。',
    '圣水收集器嗡嗡作响，紫色的液体源源不断流入。',
    '今天收成不错，金币和圣水都增加了不少。',
    '资源充足，是时候考虑升级大本营了。',
  ],
  // 军队相关
  troops: [
    '野蛮人们在训练场挥舞着大刀，气势汹汹。',
    '弓箭手们正在练习射击，箭无虚发。',
    '巨人在角落里打盹，鼾声如雷。',
    '哥布林偷偷溜进了储金罐，被我一脚踢了出来。',
    '法师在研究新的火球术，差点把实验室烧了。',
  ],
  // 防御相关
  defense: [
    '加农炮刚刚保养完毕，炮管锃亮。',
    '箭塔上的弓箭手警惕地注视着远方。',
    '城墙又加固了一层，固若金汤。',
    '迫击炮手说他能打中一公里外的苍蝇，我表示怀疑。',
  ],
  // 特殊状态
  lowResource: [
    '资源告急！得赶紧去掠夺一波了。',
    '储金罐空空如也，野蛮人们都饿瘦了。',
    '圣水不够用了，连训练野蛮人都成问题。',
  ],
  richResource: [
    '资源多得用不完，真是幸福的烦恼。',
    '金币堆成了小山，得找个地方花掉。',
    '圣水都快溢出来了，赶紧训练点部队。',
  ],
  noArmy: [
    '兵营空空如也，该训练点部队了。',
    '没有军队怎么去打仗？赶紧训练！',
  ],
  fullArmy: [
    '军队整装待发，是时候出征了！',
    '部队已满员，敌人们颤抖吧！',
  ],
  upgrading: [
    '叮叮当当的声音不绝于耳，建筑工人们正在忙碌。',
    '升级进行中，再等等就能变得更强了。',
  ],
  builderTired: [
    '建筑工人们看起来很疲惫，需要休息一下。',
    '老王打了个哈欠，说他需要喝杯咖啡。',
  ],
}

// 生成日记
function generateDiary() {
  const templates = []
  
  // 根据状态选择合适的日记
  const goldPercent = store.gold / store.maxGold
  const elixirPercent = store.elixir / store.maxElixir
  
  // 资源状态
  if (goldPercent < 0.2 || elixirPercent < 0.2) {
    templates.push(...diaryTemplates.lowResource)
  } else if (goldPercent > 0.8 && elixirPercent > 0.8) {
    templates.push(...diaryTemplates.richResource)
  } else {
    templates.push(...diaryTemplates.resource)
  }
  
  // 军队状态
  if (store.currentArmy === 0) {
    templates.push(...diaryTemplates.noArmy)
  } else if (store.currentArmy >= store.armyCapacity * 0.9) {
    templates.push(...diaryTemplates.fullArmy)
  } else {
    templates.push(...diaryTemplates.troops)
  }
  
  // 建筑工人状态
  if (store.freeBuilders === 0) {
    templates.push(...diaryTemplates.upgrading)
  }
  if (store.builderFatigue < 50) {
    templates.push(...diaryTemplates.builderTired)
  }
  
  // 添加通用和其他类型
  templates.push(...diaryTemplates.general)
  templates.push(...diaryTemplates.builder)
  templates.push(...diaryTemplates.defense)
  
  // 随机选择一条
  const randomIndex = Math.floor(Math.random() * templates.length)
  currentDiary.value = templates[randomIndex]
  
  // 更新时间
  const now = new Date()
  diaryTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

function refreshDiary() {
  generateDiary()
}

onMounted(() => {
  // 每分钟检查树木生长
  treeGrowthTimer = setInterval(() => {
    store.checkTreeGrowth()
  }, 60000)
  // 初始检查一次
  store.checkTreeGrowth()
  
  // 生成初始日记
  generateDiary()
  // 每2分钟更新一次日记
  diaryTimer = setInterval(generateDiary, 120000)
})

onUnmounted(() => {
  if (treeGrowthTimer) clearInterval(treeGrowthTimer)
  if (treeResultTimer) clearTimeout(treeResultTimer)
  if (diaryTimer) clearInterval(diaryTimer)
})

function getTreeIcon(type) {
  const icons = {
    '橡树': '🌳',
    '松树': '🌲',
    '灌木': '🌿',
    '蘑菇': '🍄',
    '石头': '🪨',
    '宝箱树': '🎄'
  }
  return icons[type] || '🌳'
}

function handleRemoveTree(treeId) {
  const result = store.removeTree(treeId)
  treeResult.value = result
  
  // 3秒后清除提示
  if (treeResultTimer) clearTimeout(treeResultTimer)
  treeResultTimer = setTimeout(() => {
    treeResult.value = null
  }, 3000)
}

const townHallHP = computed(() => {
  const hpList = [450, 1600, 1850, 2100, 2400, 2800, 3300, 3900, 4600]
  return hpList[store.townHallLevel - 1]
})

const upgradeCost = computed(() => {
  const costs = [1000, 4000, 25000, 150000, 750000, 1000000, 2000000, 3000000]
  return costs[store.townHallLevel - 1] || 0
})

function getUpgradeTime() {
  const times = [10, 10, 450, 900, 1800, 2700, 3600, 7200]
  return times[store.townHallLevel - 1] || 0
}

const goldMineCount = computed(() => {
  const mine = store.buildings.find((b) => b.type === 'goldmine')
  return mine ? mine.count || 1 : 0
})

const elixirCollectorCount = computed(() => {
  const collector = store.buildings.find((b) => b.type === 'elixircollector')
  return collector ? collector.count || 1 : 0
})

const darkDrillCount = computed(() => {
  const drill = store.buildings.find((b) => b.type === 'darkelixirdrill')
  return drill ? drill.count || 1 : 0
})

const totalBuildings = computed(() => store.buildings.reduce((sum, b) => sum + (b.count || 1), 0))

const defenseBuildings = computed(() => {
  const defenseTypes = ['cannon', 'archertower', 'mortar', 'airdefense', 'wizardtower']
  return store.buildings
    .filter((b) => defenseTypes.includes(b.type))
    .reduce((sum, b) => sum + (b.count || 1), 0)
})

const resourceBuildings = computed(() => {
  const resourceTypes = ['goldmine', 'elixircollector', 'goldstorage', 'elixirstorage']
  return store.buildings
    .filter((b) => resourceTypes.includes(b.type))
    .reduce((sum, b) => sum + (b.count || 1), 0)
})

const nextUnlocks = computed(() => {
  // 只显示已实现的功能
  const unlocks = {
    2: [
      { name: '箭塔', type: '防御', icon: '箭' },
      { name: '城墙', type: '防御', icon: '墙' },
      { name: '哥布林', type: '兵种', icon: '哥' },
    ],
    3: [
      { name: '迫击炮', type: '防御', icon: '迫' },
      { name: '实验室', type: '功能', icon: '实' },
      { name: '炸弹人', type: '兵种', icon: '炸' },
    ],
    4: [
      { name: '防空火箭', type: '防御', icon: '防' },
      { name: '气球兵', type: '兵种', icon: '气' },
    ],
    5: [
      { name: '法师塔', type: '防御', icon: '塔' },
      { name: '部落城堡', type: '功能', icon: '城' },
      { name: '法师', type: '兵种', icon: '师' },
    ],
    6: [
      { name: '天使', type: '兵种', icon: '天' },
    ],
    7: [
      { name: '暗黑重油', type: '资源', icon: '暗' },
      { name: '暗黑兵营', type: '功能', icon: '暗' },
      { name: '野蛮人之王', type: '英雄', icon: '王' },
      { name: '飞龙', type: '兵种', icon: '龙' },
      { name: '亡灵', type: '兵种', icon: '亡' },
      { name: '野猪骑士', type: '兵种', icon: '猪' },
    ],
    8: [
      { name: '皮卡超人', type: '兵种', icon: '皮' },
      { name: '戈仑石人', type: '兵种', icon: '戈' },
      { name: '女武神', type: '兵种', icon: '女' },
    ],
    9: [
      { name: 'X连弩', type: '防御', icon: 'X' },
      { name: '弓箭女皇', type: '英雄', icon: '皇' },
      { name: '熔岩猎犬', type: '兵种', icon: '熔' },
      { name: '女巫', type: '兵种', icon: '巫' },
    ],
  }
  return unlocks[store.townHallLevel + 1] || []
})

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
  return num.toString()
}

function formatUpgradeTime(seconds) {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    return `${mins}分钟`
  }
  const hours = Math.floor(seconds / 3600)
  return `${hours}小时`
}

function upgradeTownHall() {
  if (store.spendGold(upgradeCost.value) && store.freeBuilders > 0) {
    const townhall = store.buildings.find((b) => b.type === 'townhall')
    if (townhall) {
      store.startUpgrade(townhall)
    }
  }
}
</script>

<style scoped>
.panel-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--text-primary);
}

/* 首席日记 */
.diary-card {
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border: 1px solid #ffe082;
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
  position: relative;
}

[data-theme="dark"] .diary-card {
  background: linear-gradient(135deg, #3e2723 0%, #4e342e 100%);
  border-color: #5d4037;
}

.diary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.diary-icon {
  font-size: 20px;
}

.diary-title {
  font-size: 14px;
  font-weight: 600;
  color: #8d6e63;
}

[data-theme="dark"] .diary-title {
  color: #bcaaa4;
}

.diary-time {
  font-size: 12px;
  color: #a1887f;
  margin-left: auto;
  padding-right: 32px;
}

.diary-content {
  font-size: 15px;
  line-height: 1.6;
  color: #5d4037;
  font-style: italic;
}

[data-theme="dark"] .diary-content {
  color: #d7ccc8;
}

.diary-content p {
  margin: 0;
}

.diary-refresh {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(141, 110, 99, 0.1);
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.diary-refresh:hover {
  background: rgba(141, 110, 99, 0.2);
  transform: rotate(180deg);
}

[data-theme="dark"] .diary-refresh {
  background: rgba(188, 170, 164, 0.1);
}

[data-theme="dark"] .diary-refresh:hover {
  background: rgba(188, 170, 164, 0.2);
}

.section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 大本营主卡片 */
.main-card {
  background: linear-gradient(135deg, #333 0%, #555 100%);
  border-radius: 16px;
  padding: 24px;
  color: #fff;
  margin-bottom: 28px;
}

.main-card-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.th-badge {
  width: 72px;
  height: 72px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.th-level {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.th-label {
  font-size: 14px;
  opacity: 0.8;
}

.th-info h3 {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 6px;
}

.th-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  opacity: 0.85;
}

.th-stat-divider {
  opacity: 0.4;
}

.th-upgrade-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
}

.upgrade-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.upgrade-label {
  font-size: 15px;
  font-weight: 500;
}

.upgrade-time {
  font-size: 13px;
  opacity: 0.7;
}

.upgrade-cost-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cost-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cost-label {
  font-size: 12px;
  opacity: 0.7;
}

.cost-value {
  font-size: 20px;
  font-weight: 600;
  color: #ffcc00;
}

.cost-item.enough .cost-value {
  color: #8bc34a;
}

.btn-upgrade {
  padding: 10px 28px;
  background: #fff;
  color: #333;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-upgrade:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-upgrade:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.th-maxed {
  text-align: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 14px;
  opacity: 0.8;
}

/* 资源产出 */
.production-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.production-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.production-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.gold-icon {
  background: linear-gradient(135deg, #ffd54f, #ffb300);
}

.elixir-icon {
  background: linear-gradient(135deg, #ce93d8, #9c27b0);
}

.dark-icon {
  background: linear-gradient(135deg, #78909c, #455a64);
}

.production-info {
  flex: 1;
}

.production-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.production-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.production-buildings {
  font-size: 12px;
  color: var(--text-muted);
}

/* 村庄统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-item {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 快捷操作 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  border-color: var(--text-primary);
  box-shadow: 0 4px 12px var(--shadow);
}

.quick-icon {
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

.quick-text {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

/* 解锁内容 */
.unlock-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.unlock-item {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.unlock-icon {
  width: 40px;
  height: 40px;
  background: var(--hover-bg);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.unlock-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
}

.unlock-type {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--hover-bg);
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 村庄树木 */
.tree-count {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--hover-bg);
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
}

.trees-area {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.tree-item {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.tree-icon {
  font-size: 28px;
  line-height: 1;
}

.tree-info {
  flex: 1;
}

.tree-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.btn-remove-tree {
  padding: 6px 12px;
  background: var(--hover-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-remove-tree:hover:not(:disabled) {
  background: var(--text-primary);
  color: var(--bg-secondary);
  border-color: var(--text-primary);
}

.btn-remove-tree:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trees-empty {
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
}

.trees-empty p {
  color: var(--text-secondary);
  margin: 0;
}

.trees-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 8px !important;
}

.tree-result {
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.tree-result.normal {
  background: var(--hover-bg);
  color: var(--text-secondary);
}

.tree-result.success {
  background: #e8f5e9;
  color: #2e7d32;
  font-weight: 500;
}

[data-theme="dark"] .tree-result.success {
  background: rgba(76, 175, 80, 0.15);
  color: #81c784;
}
</style>
