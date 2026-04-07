app.component('vc-issue-modal', {
  props: ['show', 'form', 'availableCredTypes', 'passport', 'submitting'],
  emits: ['close', 'submit'],
  template: `
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="sn-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>
      <div class="sn-modal relative bg-white shadow-xl border border-gray-200 w-full max-w-md" style="border-radius:1rem">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-base font-bold text-gray-900">인증서 발급</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form @submit.prevent="$emit('submit')" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5">인증서 유형 <span class="text-red-500">*</span></label>
            <div class="flex flex-wrap gap-2">
              <button v-for="ct in availableCredTypes" :key="ct.value"
                @click="form.credType = ct.value" type="button"
                :class="['px-3 py-2 rounded text-sm font-medium border transition-all',
                  form.credType === ct.value ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-[#fafafa]']">
                {{ ct.label }}
              </button>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5">소유자 DID</label>
            <input v-model="form.holderDid" type="text" :placeholder="passport?.did || 'did:example:...'"
              class="sn-input w-full" />
            <p class="text-[10px] text-gray-400 mt-1">비워두면 여권의 DID가 사용됩니다.</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5">만료일</label>
            <input v-model="form.expiresAt" type="date"
              class="sn-input w-full" />
          </div>
          <div class="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button type="button" @click="$emit('close')"
              class="sn-btn sn-btn-ghost">취소</button>
            <button type="submit" :disabled="submitting"
              class="sn-btn sn-btn-accent disabled:opacity-50">
              {{ submitting ? '발급 중...' : '발급' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
});
