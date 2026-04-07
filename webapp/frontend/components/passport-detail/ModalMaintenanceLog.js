// Presentational wrapper for Maintenance Log modal
export default {
  name: 'ModalMaintenanceLog',
  props: {
    visible: Boolean,
    form: Object,
    submitting: Boolean
  },
  emits: ['close','submit'],
  template: `
    <maintenance-log-modal
      :show="visible"
      :form="form"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
    ></maintenance-log-modal>
  `
}
