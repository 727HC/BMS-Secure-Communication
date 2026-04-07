// Presentational wrapper for Recycle modal
export default {
  name: 'ModalRecycle',
  props: {
    visible: Boolean,
    submitting: Boolean
  },
  emits: ['close','submit'],
  template: `
    <recycle-modal
      :show="visible"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
    ></recycle-modal>
  `
}
