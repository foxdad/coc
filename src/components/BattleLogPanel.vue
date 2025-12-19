<template>
  <div class="battle-log-panel">
    <div class="panel-header">
      <div class="header-info">
        <h2>⚔️ 战斗日志</h2>
        <p class="panel-desc">查看所有进攻和防守的战斗记录</p>
      </div>
      <div class="header-stats">
        <div class="stat-item attack">
          <span class="stat-icon">⚔️</span>
          <span class="stat-value">{{ attackCount }}</span>
          <span class="stat-label">进攻</span>
        </div>
        <div class="stat-item defense">
          <span class="stat-icon">🛡️</span>
          <span class="stat-value">{{ defenseCount }}</span>
          <span class="stat-label">防守</span>
        </div>
        <div class="stat-item win">
          <span class="stat-icon">🏆</span>
          <span class="stat-value">{{ winRate }}%</span>
          <span class="stat-label">胜率</span>
        </div>
      </div>
    </div>

    <!-- 筛选标签 -->
    <div class="filter-tabs">
      <button class="tab" :class="{ active: currentFilter === 'all' }" @click="currentFilter = 'all'">
        <span class="tab-icon">📋</span>
        <span class="tab-text">全部</span>
        <span class="tab-count">{{ store.battleHistory.length }}</span>
      </button>
      <button class="tab" :class="{ active: currentFilter === 'attack' }" @click="currentFilter = 'attack'">
        <span class="tab-icon">⚔️</span>
        <span class="tab-text">进攻</span>
        <span class="tab-count">{{ attackCount }}</span>
      </button>
      <button class="tab" :class="{ active: currentFilter === 'defense' }" @click="currentFilter = 'defense'">
        <span class="tab-icon">🛡️</span>
        <span class="tab-text">防守</span>
        <span class="tab-count">{{ defenseCount }}</span>
      </button>
    </div>

    <!-- 战斗记录列表 -->
    <div class="battle-list" v-if="filteredBattles.length > 0">
      <div 
        v-for="battle in filteredBattles" 
        :key="battle.id"
        class="battle-card"
        :class="[battle.type, { victory: battle.victory, defeat: !battle.victory }]"
        @click="openBattleDetail(battle)"
      >
        <div class="battle-type-badge">
          {{ battle.type === 'attack' ? '⚔️ 进攻' : '🛡️ 防守' }}
        </div>
        <div class="battle-header">
          <div class="target-info">
            <span class="target-icon">{{ battle.targetIcon }}</span>
            <div class="target-detail">
              <span class="target-name">{{ battle.target }}</span>
              <span class="battle-time">{{ formatTime(battle.time) }}</span>
            </div>
          </div>
          <div class="battle-result" :class="battle.victory ? 'win' : 'lose'">
            {{ battle.victory ? '胜利' : '失败' }}
          </div>
        </div>
        <div class="battle-stats">
          <div class="power-compare">
            <span class="my-power">我方 {{ battle.playerPower }}</span>
            <span class="vs">VS</span>
            <span class="enemy-power">敌方 {{ battle.enemyPower }}</span>
          </div>
          <div class="loot-info" v-if="battle.loot">
            <span class="loot gold" v-if="battle.loot.gold !== 0">
              🪙 {{ battle.loot.gold > 0 ? '+' : '' }}{{ battle.loot.gold }}
            </span>
            <span class="loot elixir" v-if="battle.loot.elixir !== 0">
              💧 {{ battle.loot.elixir > 0 ? '+' : '' }}{{ battle.loot.elixir }}
            </span>
            <span class="loot dark" v-if="battle.loot.dark !== 0">
              🛢️ {{ battle.loot.dark > 0 ? '+' : '' }}{{ battle.loot.dark }}
            </span>
          </div>
        </div>
        <div class="view-detail">
          <span>查看战斗详情</span>
          <span class="arrow">→</span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <span class="empty-icon">📜</span>
      <p>暂无战斗记录</p>
      <span class="empty-hint">去边境邻邦掠夺或等待敌人入侵</span>
    </div>

    <!-- 战斗详情弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div class="battle-modal" v-if="selectedBattle" @click="selectedBattle = null">
          <div class="battle-detail-panel" @click.stop>
            <div class="detail-header" :class="selectedBattle.victory ? 'victory' : 'defeat'">
              <div class="header-badge">{{ selectedBattle.type === 'attack' ? '⚔️ 进攻战报' : '🛡️ 防守战报' }}</div>
              <h3>{{ selectedBattle.victory ? '战斗胜利' : '战斗失败' }}</h3>
              <div class="detail-stats">
                <span>我方战力: {{ selectedBattle.playerPower }}</span>
                <span class="vs">vs</span>
                <span>敌方战力: {{ selectedBattle.enemyPower }}</span>
              </div>
              <button class="btn-close" @click="selectedBattle = null">✕</button>
            </div>
            <div class="detail-body">
              <div 
                v-for="(log, index) in selectedBattle.battleLog" 
                :key="index"
                class="log-item"
                :class="log.type"
              >
                <span class="log-time">[{{ log.time }}]</span>
                <span class="log-text">{{ log.text }}</span>
              </div>
            </div>
            <div class="detail-footer" v-if="selectedBattle.loot">
              <div class="loot-summary">
                <span class="loot-title">{{ selectedBattle.victory ? '战利品' : '损失' }}</span>
                <div class="loot-items">
                  <span class="loot-item gold" v-if="selectedBattle.loot.gold !== 0">
                    🪙 {{ selectedBattle.loot.gold > 0 ? '+' : '' }}{{ selectedBattle.loot.gold }}
                  </span>
                  <span class="loot-item elixir" v-if="selectedBattle.loot.elixir !== 0">
                    💧 {{ selectedBattle.loot.elixir > 0 ? '+' : '' }}{{ selectedBattle.loot.elixir }}
                  </span>
                  <span class="loot-item dark" v-if="selectedBattle.loot.dark !== 0">
                    🛢️ {{ selectedBattle.loot.dark > 0 ? '+' : '' }}{{ selectedBattle.loot.dark }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()
const currentFilter = ref('all')
const selectedBattle = ref(null)

const attackCount = computed(() => store.battleHistory.filter(b => b.type === 'attack').length)
const defenseCount = computed(() => store.battleHistory.filter(b => b.type === 'defense').length)
const winRate = computed(() => {
  if (store.battleHistory.length === 0) return 0
  const wins = store.battleHistory.filter(b => b.victory).length
  return Math.floor((wins / store.battleHistory.length) * 100)
})

const filteredBattles = computed(() => {
  if (currentFilter.value === 'attack') return store.battleHistory.filter(b => b.type === 'attack')
  if (currentFilter.value === 'defense') return store.battleHistory.filter(b => b.type === 'defense')
  return store.battleHistory
})

function formatTime(timestamp) {
  const now = Date.now()
  const diff = now - timestamp
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

function openBattleDetail(battle) {
  selectedBattle.value = battle
}
</script>

<style scoped>
.battle-log-panel { max-width: 1200px; }

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}
.header-info h2 { 
  font-size: 22px; 
  font-weight: 600; 
  color: var(--text-primary); 
  margin: 0 0 6px;
}
.panel-desc { color: var(--text-secondary); margin: 0; font-size: 13px; }
.header-stats { display: flex; gap: 12px; }
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 14px;
  background: var(--bg-card);
  border-radius: 10px;
  min-width: 60px;
}
.stat-icon { font-size: 16px; margin-bottom: 2px; }
.stat-value { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.stat-label { font-size: 11px; color: var(--text-secondary); }
.stat-item.attack .stat-value { color: #ef4444; }
.stat-item.defense .stat-value { color: #3b82f6; }
.stat-item.win .stat-value { color: #22c55e; }

/* 筛选标签 */
.filter-tabs {
  display: flex;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 6px;
  margin-bottom: 20px;
  gap: 6px;
}
.tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.tab:hover { background: var(--hover-bg); color: var(--text-primary); }
.tab.active { 
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  font-weight: 600;
}
.tab-icon { font-size: 14px; }
.tab-count { 
  font-size: 12px; 
  padding: 2px 8px; 
  background: rgba(255,255,255,0.2); 
  border-radius: 10px;
}
.tab:not(.active) .tab-count { background: var(--hover-bg); }

/* 战斗列表 - 网格布局 */
.battle-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  padding: 4px;
}

.battle-card {
  background: var(--bg-card);
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  border: 2px solid transparent;
}
.battle-card:hover { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}
.battle-card.victory { border-color: rgba(34, 197, 94, 0.3); }
.battle-card.defeat { border-color: rgba(239, 68, 68, 0.3); }
.battle-card.attack::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #ef4444, #f97316);
  border-radius: 14px 14px 0 0;
}
.battle-card.defense::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 14px 14px 0 0;
}

.battle-type-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--hover-bg);
  color: var(--text-secondary);
}

.battle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.target-info { display: flex; align-items: center; gap: 12px; }
.target-icon { font-size: 32px; }
.target-detail { display: flex; flex-direction: column; }
.target-name { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.battle-time { font-size: 12px; color: var(--text-secondary); }

.battle-result {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}
.battle-result.win { background: rgba(34, 197, 94, 0.15); color: #16a34a; }
.battle-result.lose { background: rgba(239, 68, 68, 0.15); color: #dc2626; }

.battle-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--hover-bg);
  border-radius: 10px;
  margin-bottom: 10px;
}
.power-compare {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.my-power { color: #3b82f6; font-weight: 600; }
.vs { color: var(--text-secondary); font-size: 11px; }
.enemy-power { color: #ef4444; font-weight: 600; }

.loot-info { display: flex; gap: 12px; }
.loot { font-size: 13px; font-weight: 600; }
.loot.gold { color: #eab308; }
.loot.elixir { color: #a855f7; }
.loot.dark { color: #1e293b; }

.view-detail {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  padding-top: 8px;
  border-top: 1px dashed var(--border-color);
}
.arrow { transition: transform 0.2s; }
.battle-card:hover .arrow { transform: translateX(4px); }

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}
.empty-icon { font-size: 64px; margin-bottom: 16px; opacity: 0.5; }
.empty-state p { margin: 0 0 8px; font-size: 16px; color: var(--text-primary); }
.empty-hint { font-size: 13px; }

/* 战斗详情弹窗 */
.battle-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.battle-detail-panel {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: var(--bg-card);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
}
.detail-header {
  padding: 20px 24px;
  position: relative;
  color: white;
}
.detail-header.victory { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
.detail-header.defeat { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
.header-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(255,255,255,0.2);
  border-radius: 20px;
  font-size: 12px;
  margin-bottom: 8px;
}
.detail-header h3 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
.detail-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  opacity: 0.9;
}
.btn-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255,255,255,0.2);
  color: white;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
}
.btn-close:hover { background: rgba(255,255,255,0.3); }

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: var(--bg-secondary);
}
.log-item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: var(--bg-card);
  font-size: 13px;
  line-height: 1.5;
}
.log-time {
  color: var(--text-secondary);
  font-family: monospace;
  font-size: 12px;
  min-width: 50px;
  flex-shrink: 0;
}
.log-text { color: var(--text-primary); flex: 1; }
.log-item.system { border-left: 3px solid #3b82f6; }
.log-item.intel { border-left: 3px solid #f59e0b; }
.log-item.deploy { border-left: 3px solid #22c55e; }
.log-item.battle { border-left: 3px solid #ef4444; }
.log-item.result { border-left: 3px solid #a855f7; background: rgba(168, 85, 247, 0.1); }
.log-item.comment { border-left: 3px solid #6b7280; font-style: italic; }

.detail-footer {
  padding: 16px 20px;
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
}
.loot-summary { text-align: center; }
.loot-title { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; display: block; }
.loot-items { display: flex; justify-content: center; gap: 24px; }
.loot-item { font-size: 16px; font-weight: 600; }
.loot-item.gold { color: #eab308; }
.loot-item.elixir { color: #a855f7; }
.loot-item.dark { color: #1e293b; }

/* 弹窗动画 */
.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .battle-detail-panel,
.modal-leave-to .battle-detail-panel { transform: scale(0.9) translateY(20px); }
</style>
