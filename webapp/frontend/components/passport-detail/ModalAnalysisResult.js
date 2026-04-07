// Presentational wrapper for Analysis Result modal
export default {
  name: 'ModalAnalysisResult',
  props: {
    visible: Boolean,
    form: Object,
    submitting: Boolean
  },
  emits: ['close','submit'],
  template: `
    <analysis-result-modal
      :show="visible"
      :form="form"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
    ></analysis-result-modal>
  `
}
