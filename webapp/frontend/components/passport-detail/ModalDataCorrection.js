// Presentational wrapper for Data Correction modal.
// This component delegates UI rendering to the existing correction-modal
// while keeping business logic in passport-detail.js.
export default {
  name: 'ModalDataCorrection',
  props: {
    visible: Boolean,
    form: Object,
    correctableFields: Array,
    passport: Object,
    submitting: Boolean
  },
  emits: ['close','submit'],
  template: `
    <correction-modal
      :show="visible"
      :form="form"
      :correctable-fields="correctableFields"
      :passport="passport"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
    ></correction-modal>
  `
}
