app.component('analysis-request-modal', {
  props: ['show', 'submitting'],
  emits: ['close', 'submit'],
  template: `
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="sn-overlay fixed inset-0 bg-white/60 backdrop-blur-sm" @click="$emit('close')"></div>
        <div class="sn-modal relative bg-white shadow-2xl w-full max-w-md border border-gray-200/50 overflow-hidden" style="border-radius:1rem">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div class="w-9 h-9 bg-[rgba(192,132,252,0.1)] rounded flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <h2 class="text-lg font-bold text-gray-900">분석 요청</h2>
          </div>
          <div class="p-6">
            <p class="text-sm text-gray-600 mb-5">이 배터리에 대한 분석을 요청하시겠습니까?<br><span class="text-xs text-gray-400 mt-1 block">상태가 ANALYSIS로 변경됩니다.</span></p>
            <div class="flex justify-end gap-3">
              <button @click="$emit('close')"
                class="sn-btn sn-btn-ghost">취소</button>
              <button @click="$emit('submit')" :disabled="submitting"
                class="sn-btn sn-btn-accent disabled:opacity-50">
                {{ submitting ? '처리 중...' : '분석 요청' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  `
});

app.component('analysis-result-modal', {
  props: ['show', 'form', 'submitting'],
  emits: ['close', 'submit'],
  template: `
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="sn-overlay fixed inset-0 bg-white/60 backdrop-blur-sm" @click="$emit('close')"></div>
        <div class="sn-modal relative bg-white shadow-2xl w-full max-w-lg border border-gray-200/50 overflow-hidden" style="border-radius:1rem">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-indigo-100 rounded flex items-center justify-center">
                <svg class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h2 class="text-lg font-bold text-gray-900">분석 결과 제출</h2>
            </div>
            <button @click="$emit('close')" class="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <form @submit.prevent="$emit('submit')" class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-400 mb-1.5">SOH (%)</label>
                <input v-model="form.soh" type="number" step="0.1" placeholder="85"
                  class="sn-input w-full" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-400 mb-1.5">SOCE (%)</label>
                <input v-model="form.soce" type="number" step="0.1" placeholder="90"
                  class="sn-input w-full" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">잔여 수명 주기</label>
              <input v-model="form.remainingLifeCycle" type="number" placeholder="1500"
                class="sn-input w-full" />
            </div>
            <div class="flex items-center gap-3 py-2 px-3.5 bg-[#fafafa] rounded border border-gray-200">
              <input v-model="form.recycleAvailable" type="checkbox" id="recycleCheckDetail2"
                class="w-4 h-4 text-emerald-600 border-gray-200 rounded focus:ring-emerald-500" />
              <label for="recycleCheckDetail2" class="text-sm text-gray-600 font-medium">재활용 가능</label>
            </div>
            <div class="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button type="button" @click="$emit('close')"
                class="sn-btn sn-btn-ghost">취소</button>
              <button type="submit" :disabled="submitting"
                class="sn-btn sn-btn-accent disabled:opacity-50">
                {{ submitting ? '처리 중...' : '제출' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  `
});
