app.component('recycle-modal', {
  props: ['show', 'submitting'],
  emits: ['close', 'submit'],
  template: `
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="sn-overlay fixed inset-0 bg-white/60 backdrop-blur-sm" @click="$emit('close')"></div>
        <div class="sn-modal relative bg-white shadow-2xl w-full max-w-md border border-gray-200/50 overflow-hidden" style="border-radius:1rem">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div class="w-9 h-9 bg-orange-100 rounded flex items-center justify-center">
              <svg class="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-lg font-bold text-gray-900">재활용 판정</h2>
          </div>
          <div class="p-6">
            <p class="text-sm text-gray-600 mb-6">이 배터리의 재활용 가능 여부를 판정합니다.</p>
            <div class="flex justify-end gap-3">
              <button @click="$emit('close')"
                class="sn-btn sn-btn-ghost">취소</button>
              <button @click="$emit('submit', false)" :disabled="submitting"
                class="sn-btn sn-btn-danger disabled:opacity-50">
                재활용 불가
              </button>
              <button @click="$emit('submit', true)" :disabled="submitting"
                class="sn-btn sn-btn-primary disabled:opacity-50">
                재활용 가능
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  `
});

app.component('extract-modal', {
  props: ['show', 'form', 'submitting'],
  emits: ['close', 'submit'],
  template: `
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="sn-overlay fixed inset-0 bg-white/60 backdrop-blur-sm" @click="$emit('close')"></div>
        <div class="sn-modal relative bg-white shadow-2xl w-full max-w-lg border border-gray-200/50 overflow-hidden" style="border-radius:1rem">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-teal-100 rounded flex items-center justify-center">
                <svg class="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                </svg>
              </div>
              <h2 class="text-lg font-bold text-gray-900">원자재 추출</h2>
            </div>
            <button @click="$emit('close')" class="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <form @submit.prevent="$emit('submit')" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">재활용 비율 (JSON)</label>
              <textarea v-model="form.recyclingRatesJson" rows="6"
                class="sn-input w-full font-mono resize-none bg-[#fafafa]"></textarea>
              <p class="text-xs text-gray-400 mt-1.5">예: { "cobalt": 95, "nickel": 90, "lithium": 80 }</p>
            </div>
            <div class="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button type="button" @click="$emit('close')"
                class="sn-btn sn-btn-ghost">취소</button>
              <button type="submit" :disabled="submitting"
                class="sn-btn sn-btn-primary disabled:opacity-50">
                {{ submitting ? '처리 중...' : '등록' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  `
});

app.component('dispose-modal', {
  props: ['show', 'submitting'],
  emits: ['close', 'submit'],
  template: `
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="sn-overlay fixed inset-0 bg-white/60 backdrop-blur-sm" @click="$emit('close')"></div>
        <div class="sn-modal relative bg-white shadow-2xl w-full max-w-sm border border-gray-200/50 overflow-hidden" style="border-radius:1rem">
          <div class="p-6 text-center">
            <div class="mx-auto w-14 h-14 bg-[rgba(239,68,68,0.1)] rounded-full flex items-center justify-center mb-4">
              <svg class="w-7 h-7 text-[#ff6b6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">폐기 처리 확인</h3>
            <p class="text-sm text-gray-400 mb-6">정말로 이 배터리를 폐기 처리하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.</p>
            <div class="flex gap-3">
              <button @click="$emit('close')"
                class="sn-btn sn-btn-ghost flex-1">취소</button>
              <button @click="$emit('submit')" :disabled="submitting"
                class="sn-btn sn-btn-danger flex-1 disabled:opacity-50">
                {{ submitting ? '처리 중...' : '폐기 확인' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  `
});
