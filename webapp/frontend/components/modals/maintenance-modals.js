app.component('maintenance-request-modal', {
  props: ['show', 'submitting'],
  emits: ['close', 'submit'],
  template: `
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="sn-overlay fixed inset-0 bg-white/60 backdrop-blur-sm" @click="$emit('close')"></div>
        <div class="sn-modal relative bg-white shadow-2xl w-full max-w-md border border-gray-200/50 overflow-hidden" style="border-radius:1rem">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
            <div class="w-9 h-9 bg-[rgba(255,184,0,0.1)] rounded flex items-center justify-center">
              <svg class="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h2 class="text-lg font-bold text-gray-900">정비 요청</h2>
          </div>
          <div class="p-6">
            <p class="text-sm text-gray-600 mb-5">이 배터리에 대한 정비를 요청하시겠습니까?<br><span class="text-xs text-gray-400 mt-1 block">상태가 MAINTENANCE로 변경됩니다.</span></p>
            <div class="flex justify-end gap-3">
              <button @click="$emit('close')"
                class="sn-btn sn-btn-ghost">취소</button>
              <button @click="$emit('submit')" :disabled="submitting"
                class="sn-btn sn-btn-accent disabled:opacity-50">
                {{ submitting ? '처리 중...' : '정비 요청' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  `
});

app.component('maintenance-log-modal', {
  props: ['show', 'form', 'submitting'],
  emits: ['close', 'submit'],
  template: `
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="sn-overlay fixed inset-0 bg-white/60 backdrop-blur-sm" @click="$emit('close')"></div>
        <div class="sn-modal relative bg-white shadow-2xl w-full max-w-lg border border-gray-200/50 overflow-hidden" style="border-radius:1rem">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-[rgba(200,255,0,0.08)] rounded flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </div>
              <h2 class="text-lg font-bold text-gray-900">정비 기록 추가</h2>
            </div>
            <button @click="$emit('close')" class="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <form @submit.prevent="$emit('submit')" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">날짜</label>
              <input v-model="form.date" type="date"
                class="sn-input w-full" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">유형</label>
              <input v-model="form.type" type="text" placeholder="정기점검 / 부품교체 / 긴급수리"
                class="sn-input w-full" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">내용</label>
              <textarea v-model="form.description" rows="3" placeholder="정비 내용을 상세히 기입하세요"
                class="sn-input w-full resize-none"></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">기술자</label>
              <input v-model="form.technician" type="text" placeholder="기술자명"
                class="sn-input w-full" />
            </div>
            <div class="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button type="button" @click="$emit('close')"
                class="sn-btn sn-btn-ghost">취소</button>
              <button type="submit" :disabled="submitting"
                class="sn-btn sn-btn-primary disabled:opacity-50">
                {{ submitting ? '처리 중...' : '추가' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  `
});

app.component('accident-log-modal', {
  props: ['show', 'form', 'submitting'],
  emits: ['close', 'submit'],
  template: `
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="sn-overlay fixed inset-0 bg-white/60 backdrop-blur-sm" @click="$emit('close')"></div>
        <div class="sn-modal relative bg-white shadow-2xl w-full max-w-lg border border-gray-200/50 overflow-hidden" style="border-radius:1rem">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-[rgba(239,68,68,0.1)] rounded flex items-center justify-center">
                <svg class="w-5 h-5 text-[#ff6b6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h2 class="text-lg font-bold text-gray-900">사고 기록 추가</h2>
            </div>
            <button @click="$emit('close')" class="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <form @submit.prevent="$emit('submit')" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">심각도</label>
              <div class="flex gap-2">
                <button v-for="s in [{value:'minor',label:'경미'},{value:'moderate',label:'보통'},{value:'severe',label:'심각'},{value:'critical',label:'위험'}]" :key="s.value"
                  @click="form.severity = s.value" type="button"
                  :class="['px-3 py-2 rounded text-sm font-medium border transition-all',
                    form.severity === s.value ? 'bg-[rgba(239,68,68,0.1)] text-[#ff6b6b] border-red-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-[#fafafa]']">
                  {{ s.label }}
                </button>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">내용 <span class="text-red-500">*</span></label>
              <textarea v-model="form.description" rows="3" placeholder="사고 상세 내용"
                class="sn-input w-full resize-none"></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">보고자 <span class="text-red-500">*</span></label>
              <input v-model="form.reporter" type="text" placeholder="보고자명"
                class="sn-input w-full" />
            </div>
            <div class="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button type="button" @click="$emit('close')"
                class="sn-btn sn-btn-ghost">취소</button>
              <button type="submit" :disabled="submitting"
                class="sn-btn sn-btn-danger disabled:opacity-50">
                {{ submitting ? '처리 중...' : '추가' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  `
});
