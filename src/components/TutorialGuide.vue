<template>
  <Teleport to="body">
    <div class="tutorial-overlay" v-if="showTutorial">
      <!-- 遮罩层（带镂空） -->
      <div class="tutorial-mask">
        <svg width="100%" height="100%">
          <defs>
            <mask id="tutorial-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect 
                :x="highlightRect.x - 8" 
                :y="highlightRect.y - 8" 
                :width="highlightRect.width + 16" 
                :height="highlightRect.height + 16" 
                rx="12"
                fill="black" 
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#tutorial-mask)" />
        </svg>
      </div>
      
      <!-- 高亮边框 -->
      <div class="highlight-border" :style="highlightStyle"></div>
      
      <!-- 提示卡片 -->
      <div class="tip-card" :style="tipStyle" :class="tipPosition">
        <div class="tip-arrow" :class="tipPosition"></div>
        <div class="tip-header">
          <span class="tip-step">{{ currentStep }}/{{ steps.length }}</span>
          <button class="btn-skip" @click="skipTutorial">跳过</button>
        </div>
        <div class="tip-content">
          <div class="tip-icon">{{ steps[currentStep - 1].icon }}</div>
          <h4>{{ steps[currentStep - 1].title }}</h4>
          <p>{{ steps[currentStep - 1].desc }}</p>
        </div>
        <div class="tip-footer">
          <button class="btn-prev" @click="prevStep" v-if="currentStep > 1">上一步</button>
          <button class="btn-next" @click="nextStep">
            {{ currentStep === steps.length ? '完成' : '下一步' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameStore } from '../stores/gameStore'

const store = useGameStore()

const showTutorial = ref(false)
const currentStep = ref(1)
const highlightRect = ref({ x: 0, y: 0, width: 0, height: 0 })
const tipPosition = ref('bottom')

// 引导步骤配置
const steps = [
  {
    icon: '💰',
    title: '资源栏',
    desc: '这里显示你的金币、圣水等资源数量，以及每分钟的产出速度。',
    target: '.header-center',
    position: 'bottom'
  },
  {
    icon: '👷',
    title: '状态信息',
    desc: '显示建筑工人数量、军队容量、宝石和奖杯数。',
    target: '.header-right .status-group',
    position: 'bottom'
  },
  {
    icon: '🏠',
    title: '大本营等级',
    desc: '你当前的大本营等级，升级大本营可以解锁更多建筑和功能。',
    target: '.th-badge',
    position: 'bottom'
  },
  {
    icon: '📬',
    title: '消息中心',
    desc: '点击这里查看消息通知，包括敌袭警报、邻邦请求等重要信息。',
    target: '.message-btn',
    position: 'right'
  },
  {
    icon: '📋',
    title: '功能菜单',
    desc: '点击左侧菜单切换不同功能：建筑管理、训练部队、进攻掠夺等。',
    target: '.nav-menu',
    position: 'right'
  },
  {
    icon: '🏗️',
    title: '建筑管理',
    desc: '在这里可以升级建筑、建造新建筑。升级需要资源和建筑工人。',
    target: '.nav-item:nth-child(2)',
    position: 'right'
  },
  {
    icon: '⚔️',
    title: '训练部队',
    desc: '训练各种兵种组建你的军队，用于进攻其他村庄掠夺资源。',
    target: '.nav-item:nth-child(3)',
    position: 'right'
  },
  {
    icon: '🏘️',
    title: '边境邻邦',
    desc: '与周边村庄互动，赠送礼物提升好感度，或掠夺敌对村庄获取资源。',
    target: '.nav-item:nth-child(7)',
    position: 'right'
  },
  {
    icon: '🎯',
    title: '进攻掠夺',
    desc: '搜索对手并发起进攻，掠夺金币、圣水和奖杯！',
    target: '.nav-item:nth-child(10)',
    position: 'right'
  },
  {
    icon: '🛒',
    title: '商店',
    desc: '购买资源包、建筑工人，或用宝石加速升级。别忘了领取新手礼包！',
    target: '.nav-item:nth-child(12)',
    position: 'right'
  }
]

// 高亮框样式
const highlightStyle = computed(() => ({
  left: `${highlightRect.value.x - 8}px`,
  top: `${highlightRect.value.y - 8}px`,
  width: `${highlightRect.value.width + 16}px`,
  height: `${highlightRect.value.height + 16}px`
}))

// 提示卡片位置
const tipStyle = computed(() => {
  const rect = highlightRect.value
  const pos = steps[currentStep.value - 1]?.position || 'bottom'
  tipPosition.value = pos
  
  const cardWidth = 320
  const cardHeight = 280 // 估算卡片高度
  
  if (pos === 'bottom') {
    let top = rect.y + rect.height + 24
    // 如果底部空间不够，放到上面
    if (top + cardHeight > window.innerHeight - 20) {
      top = rect.y - cardHeight - 24
      tipPosition.value = 'top'
    }
    return {
      left: `${Math.max(20, Math.min(rect.x + rect.width / 2 - cardWidth / 2, window.innerWidth - cardWidth - 20))}px`,
      top: `${Math.max(20, top)}px`
    }
  } else if (pos === 'right') {
    let left = rect.x + rect.width + 24
    let top = rect.y - 20
    // 如果右侧空间不够，放到左边
    if (left + cardWidth > window.innerWidth - 20) {
      left = rect.x - cardWidth - 24
      tipPosition.value = 'left'
    }
    // 确保不超出底部
    if (top + cardHeight > window.innerHeight - 20) {
      top = window.innerHeight - cardHeight - 20
    }
    return {
      left: `${Math.max(20, left)}px`,
      top: `${Math.max(20, top)}px`
    }
  }
  return {}
})

// 更新高亮区域
function updateHighlight() {
  const step = steps[currentStep.value - 1]
  if (!step) return
  
  const el = document.querySelector(step.target)
  if (el) {
    const rect = el.getBoundingClientRect()
    highlightRect.value = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    }
  }
}

function nextStep() {
  if (currentStep.value < steps.length) {
    currentStep.value++
    nextTick(updateHighlight)
  } else {
    completeTutorial()
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
    nextTick(updateHighlight)
  }
}

function skipTutorial() {
  completeTutorial()
}

function completeTutorial() {
  showTutorial.value = false
  store.tutorialCompleted = true
  store.tutorialStep = 0
  store.saveGame()
}

// 窗口大小变化时更新高亮位置
function handleResize() {
  if (showTutorial.value) {
    updateHighlight()
  }
}

// 开始引导
function startTutorial() {
  showTutorial.value = true
  currentStep.value = 1
  nextTick(updateHighlight)
}

// 监听外部触发
function handleStartTutorial() {
  startTutorial()
}

onMounted(() => {
  // 只有新用户且没有存档时显示引导
  if (!store.tutorialCompleted && !store.hasSaveData()) {
    // 延迟显示，等待页面渲染完成
    setTimeout(() => {
      startTutorial()
    }, 500)
  }
  
  window.addEventListener('resize', handleResize)
  window.addEventListener('start-tutorial', handleStartTutorial)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('start-tutorial', handleStartTutorial)
})

// 暴露方法供外部调用
defineExpose({
  startTutorial: () => {
    showTutorial.value = true
    currentStep.value = 1
    nextTick(updateHighlight)
  }
})
</script>

<style scoped>
.tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  pointer-events: none;
}

.tutorial-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}

.highlight-border {
  position: absolute;
  border: 3px solid #4CAF50;
  border-radius: 12px;
  box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.3), 0 0 20px rgba(76, 175, 80, 0.4);
  pointer-events: none;
  transition: all 0.3s ease;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.3), 0 0 20px rgba(76, 175, 80, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(76, 175, 80, 0.2), 0 0 30px rgba(76, 175, 80, 0.5); }
}

.tip-card {
  position: absolute;
  width: 320px;
  background: var(--bg-card);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.tip-arrow {
  position: absolute;
  width: 16px;
  height: 16px;
  background: var(--bg-card);
  transform: rotate(45deg);
}

.tip-arrow.bottom {
  top: -8px;
  left: 50%;
  margin-left: -8px;
}

.tip-arrow.top {
  bottom: -8px;
  left: 50%;
  margin-left: -8px;
}

.tip-arrow.right {
  left: -8px;
  top: 30px;
}

.tip-arrow.left {
  right: -8px;
  top: 30px;
}

.tip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.tip-step {
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--hover-bg);
  padding: 4px 10px;
  border-radius: 10px;
}

.btn-skip {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
}

.btn-skip:hover {
  color: var(--text-primary);
}

.tip-content {
  padding: 20px;
  text-align: center;
}

.tip-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.tip-content h4 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.tip-content p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.tip-footer {
  display: flex;
  gap: 10px;
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.btn-prev, .btn-next {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-prev {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.btn-prev:hover {
  background: var(--border-color);
}

.btn-next {
  background: #4CAF50;
  color: white;
}

.btn-next:hover {
  background: #43A047;
}
</style>
