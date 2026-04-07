// Presentational wrapper for Link Materials modal
export default {
  name: 'ModalLinkMaterials',
  props: {
    visible: Boolean,
    availableMaterials: Array,
    selectedMaterialIds: Array,
    passport: Object,
    submitting: Boolean
  },
  emits: ['close','submit','toggle'],
  template: `
    <link-materials-modal
      :show="visible"
      :available-materials="availableMaterials"
      :selected-material-ids="selectedMaterialIds"
      :passport="passport"
      :submitting="submitting"
      @close="$emit('close')"
      @submit="$emit('submit')"
      @toggle="$emit('toggle', $event)"
    ></link-materials-modal>
  `
}
