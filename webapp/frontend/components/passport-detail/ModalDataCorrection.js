// Presentational wrapper for Data Correction modal.
// This component delegates UI rendering to the existing correction-modal
// while keeping business logic in passport-detail.js.
export default {
  name: 'ModalDataCorrection',
  props: {
    show: Boolean,
    form: Object,
    correctableFields: Array,
    passport: Object,
    submitting: Boolean
  },
  emits: ['close','submit'],
  template: `
    <correction-modal
      :show="show"
      :form="form"
      :correctable-fields="correctableFields"
      :passport="passport"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
    ></correction-modal>
  `
}
