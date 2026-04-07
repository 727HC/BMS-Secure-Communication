// Presentational wrapper for BMU Invalidate modal
export default {
  name: 'ModalBMUInvalidate',
  props: {
    visible: Boolean,
    form: Object,
    submitting: Boolean
  },
  emits: ['close','submit'],
  template: `
    <bmu-invalidate-modal
      :show="visible"
      :form="form"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
    ></bmu-invalidate-modal>
  `
}
