app.component('bmu-invalidate-modal', {
  props: ['show', 'form', 'submitting'],
  emits: ['close', 'submit'],
  template: `
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="sn-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>
      <div class="sn-modal relative bg-white shadow-xl border border-gray-200 w-full max-w-sm" style="border-radius:1rem">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-base font-bold text-[#ff6b6b]">BMU 레코드 무효화</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form @submit.prevent="$emit('submit')" class="p-6 space-y-4">
          <div class="bg-[rgba(239,68,68,0.1)] rounded border border-gray-200 p-3">
            <p class="text-xs text-[#ff6b6b]">레코드 ID: <span class="font-mono font-bold">{{ form.recordId }}</span></p>
            <p class="text-[10px] text-red-500 mt-1">무효화된 레코드는 원본이 보존되지만, 유효하지 않은 것으로 표시됩니다.</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5">무효화 사유 <span class="text-red-500">*</span></label>
            <textarea v-model="form.reason" rows="2" placeholder="무효화 사유를 입력하세요"
              class="sn-input w-full resize-none"></textarea>
          </div>
          <div class="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button type="button" @click="$emit('close')"
              class="sn-btn sn-btn-ghost">취소</button>
            <button type="submit" :disabled="!form.reason || submitting"
              class="sn-btn sn-btn-danger disabled:opacity-50">
              {{ submitting ? '처리 중...' : '무효화' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
});
