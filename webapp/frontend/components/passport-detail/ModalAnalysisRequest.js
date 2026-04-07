// Presentational wrapper for Analysis Request modal
export default {
  name: 'ModalAnalysisRequest',
  props: {
    visible: Boolean,
    submitting: Boolean
  },
  emits: ['close','submit'],
  template: `
    <analysis-request-modal
      :show="visible"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
    ></analysis-request-modal>
  `
}
