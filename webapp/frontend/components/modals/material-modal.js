app.component('link-materials-modal', {
  props: ['show', 'availableMaterials', 'selectedMaterialIds', 'passport', 'submitting'],
  emits: ['close', 'submit', 'toggle'],
  template: `
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="sn-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>
      <div class="sn-modal relative bg-white shadow-xl border border-gray-200 w-full max-w-md" style="border-radius:1rem">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 class="text-base font-bold text-gray-900">원자재 연결</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="p-6">
          <p class="text-xs text-gray-400 mb-3">이 여권에 사용된 원자재를 선택하세요.</p>
          <div v-if="availableMaterials.length === 0" class="text-center py-6">
            <p class="text-sm text-gray-400">등록된 원자재가 없습니다.</p>
          </div>
          <div v-else class="space-y-2 max-h-64 overflow-y-auto">
            <label v-for="m in availableMaterials" :key="m.materialId"
              class="flex items-center gap-3 px-3 py-2.5 rounded border cursor-pointer transition-colors"
              :class="selectedMaterialIds.includes(m.materialId) ? 'bg-[rgba(200,255,0,0.08)] border-emerald-300' : 'bg-white border-gray-200 hover:bg-[#fafafa]'">
              <input type="checkbox" :checked="selectedMaterialIds.includes(m.materialId)"
                @change="$emit('toggle', m.materialId)"
                class="w-4 h-4 text-emerald-600 border-gray-200 rounded focus:ring-emerald-500" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">{{ m.name }}</p>
                <p class="text-[10px] text-gray-400">{{ m.origin }} · {{ m.supplier }} · {{ m.quantity }}{{ m.unit }}</p>
              </div>
              <span v-if="(passport?.rawMaterials || []).includes(m.materialId)"
                class="text-[10px] font-medium text-emerald-600 bg-[rgba(200,255,0,0.08)] px-1.5 py-0.5 rounded">연결됨</span>
            </label>
          </div>
        </div>
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button @click="$emit('close')"
            class="sn-btn sn-btn-ghost">취소</button>
          <button @click="$emit('submit')" :disabled="submitting"
            class="sn-btn sn-btn-primary disabled:opacity-50">
            {{ submitting ? '처리 중...' : '연결' }}
          </button>
        </div>
      </div>
    </div>
  `
});
