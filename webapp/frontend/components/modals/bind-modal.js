app.component('bind-modal', {
  props: ['show', 'form', 'submitting', 'vehicleImageFile'],
  emits: ['close', 'submit', 'update:vehicleImageFile'],
  template: `
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="sn-overlay fixed inset-0 bg-white/60 backdrop-blur-sm" @click="$emit('close')"></div>
        <div class="sn-modal relative bg-white shadow-2xl w-full max-w-lg border border-gray-200/50 overflow-hidden" style="border-radius:1rem">
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-[rgba(200,255,0,0.08)] rounded flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
              </div>
              <h2 class="text-lg font-bold text-gray-900">VIN 바인딩</h2>
            </div>
            <button @click="$emit('close')" class="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <form @submit.prevent="$emit('submit')" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">VIN</label>
              <input v-model="form.vin" type="text" placeholder="차량 식별번호"
                class="sn-input w-full" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">장착일자</label>
              <input v-model="form.installDate" type="date"
                class="sn-input w-full" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">EV 제조사</label>
              <input v-model="form.evManufacturer" type="text" placeholder="EV 제조사명"
                class="sn-input w-full" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">EV 조립국가</label>
              <input v-model="form.evAssemblyCountry" type="text" placeholder="KR"
                class="sn-input w-full" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">차량 사진 <span class="text-gray-400 text-[10px] font-normal">(선택)</span></label>
              <label class="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-200 rounded hover:border-emerald-400 hover:bg-[rgba(200,255,0,0.08)]/30 transition-colors cursor-pointer">
                <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span class="text-sm text-gray-400">{{ vehicleImageFile ? vehicleImageFile.name : '이미지 선택...' }}</span>
                <input type="file" accept="image/*" class="hidden" @change="$emit('update:vehicleImageFile', $event.target.files[0])" />
              </label>
              <div v-if="vehicleImageFile" class="mt-2 flex items-center gap-2">
                <span class="text-xs text-emerald-600">{{ vehicleImageFile.name }}</span>
                <button type="button" @click="$emit('update:vehicleImageFile', null)" class="text-xs text-red-500 hover:text-[#ff6b6b]">삭제</button>
              </div>
            </div>
            <div class="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <button type="button" @click="$emit('close')"
                class="sn-btn sn-btn-ghost">취소</button>
              <button type="submit" :disabled="submitting"
                class="sn-btn sn-btn-primary disabled:opacity-50">
                {{ submitting ? '처리 중...' : '바인딩' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  `
});
