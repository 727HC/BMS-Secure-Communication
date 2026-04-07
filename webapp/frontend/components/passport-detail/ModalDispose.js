// Presentational wrapper for Dispose modal
export default {
  name: 'ModalDispose',
  props: {
    visible: Boolean,
    submitting: Boolean
  },
  emits: ['close','submit'],
  template: `
    <dispose-modal
      :show="visible"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
    ></dispose-modal>
  `
}
