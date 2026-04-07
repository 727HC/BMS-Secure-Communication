// Presentational wrapper for VIN Bind modal using existing bind-modal.js
export default {
  name: 'ModalBind',
  props: {
    visible: Boolean,
    form: Object,
    vehicleImageFile: Object,
    submitting: Boolean
  },
  emits: ['close','submit','update:vehicleImageFile'],
  template: `
    <bind-modal
      :show="visible"
      :form="form"
      :vehicle-image-file="vehicleImageFile"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
      @update:vehicleImageFile="$emit('update:vehicleImageFile', $event)"
    ></bind-modal>
  `
}
