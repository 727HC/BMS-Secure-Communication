app.component('correction-modal', {
  props: ['show', 'form', 'correctableFields', 'passport', 'submitting'],
  emits: ['close', 'submit'],
  template: `
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="sn-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>
      <div class="sn-modal relative bg-white shadow-xl border border-gray-200 w-full max-w-md" style="border-radius:1rem">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-base font-bold text-gray-900">데이터 정정</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form @submit.prevent="$emit('submit')" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5">정정 필드 <span class="text-red-500">*</span></label>
            <select v-model="form.fieldName"
              class="sn-input w-full bg-white">
              <option value="">선택하세요</option>
              <option v-for="f in correctableFields" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </div>
          <div v-if="form.fieldName && passport" class="bg-[#fafafa] rounded border border-gray-200 px-4 py-3">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">현재 값</p>
            <p class="text-sm font-mono font-bold text-gray-900">{{ passport[form.fieldName] || '(비어있음)' }}</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5">새 값 <span class="text-red-500">*</span></label>
            <input v-model="form.newValue" type="text" placeholder="정정할 값을 입력하세요"
              class="sn-input w-full" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5">정정 사유 <span class="text-red-500">*</span></label>
            <textarea v-model="form.reason" rows="2" placeholder="정정 사유를 입력하세요"
              class="sn-input w-full resize-none"></textarea>
          </div>
          <div class="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button type="button" @click="$emit('close')"
              class="sn-btn sn-btn-ghost">취소</button>
            <button type="submit" :disabled="!form.fieldName || !form.newValue || !form.reason || submitting"
              class="sn-btn sn-btn-accent disabled:opacity-50">
              {{ submitting ? '처리 중...' : '정정' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
});
