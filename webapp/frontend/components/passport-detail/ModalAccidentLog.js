// Presentational wrapper for Accident Log modal
export default {
  name: 'ModalAccidentLog',
  props: {
    visible: Boolean,
    form: Object,
    submitting: Boolean
  },
  emits: ['close','submit'],
  template: `
    <accident-log-modal
      :show="visible"
      :form="form"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
    ></accident-log-modal>
  `
}
