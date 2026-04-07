// Base modal shell for CDN/no-build environment
// Lightweight modal shell for Vue 3 CDN usage; registers at runtime if possible.
export default {
  name: 'BaseModal',
  props: {
    show: Boolean,
    title: String,
    size: { type: String, default: 'max-w-md' }
  },
  emits: ['close'],
  template: `
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="sn-overlay fixed inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>
      <div :class="['sn-modal relative bg-white shadow-xl border border-gray-200 rounded', size]" style="min-width:300px;">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{{ title || '모달' }}</h3>
        </div>
        <div class="px-6 py-4"><slot name="body"></slot><slot></slot><slot name="footer"></slot></div>
      </div>
    </div>
  `
}
