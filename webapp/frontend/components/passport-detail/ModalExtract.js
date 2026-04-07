// Presentational wrapper for Extract modal
export default {
  name: 'ModalExtract',
  props: {
    visible: Boolean,
    form: Object,
    submitting: Boolean
  },
  emits: ['close','submit'],
  template: `
    <extract-modal
      :show="visible"
      :form="form"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
    ></extract-modal>
  `
}
