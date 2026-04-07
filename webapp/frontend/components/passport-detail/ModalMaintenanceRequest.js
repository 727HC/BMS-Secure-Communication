// Presentational wrapper for Maintenance Request modal
export default {
  name: 'ModalMaintenanceRequest',
  props: {
    visible: Boolean,
    submitting: Boolean
  },
  emits: ['close','submit'],
  template: `
    <maintenance-request-modal
      :show="visible"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
    ></maintenance-request-modal>
  `
}
