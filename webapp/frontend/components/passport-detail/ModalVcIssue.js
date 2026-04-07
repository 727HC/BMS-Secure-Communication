/* Minimal presentational VC Issue modal for first-pass isolation.
   This is a no-behavior wrapper that renders the VC modal chrome and
   emits events for submit/close. The business logic remains in passport-detail.js. */
export default {
  name: 'ModalVcIssue',
  props: { visible: Boolean, onSubmit: Function, onClose: Function },
  template: `
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="sn-modal relative bg-white shadow-xl border border-gray-200 w-full max-w-md" style="border-radius:1rem;">
        <div class="p-4">
          <h3 class="text-lg font-semibold text-gray-900">VC 발급</h3>
          <p class="text-sm text-gray-600">VC 발급 모달 (첫 패스용) - UI 경계 추출용으로만 적용합니다.</p>
          <div class="mt-4 flex justify-end gap-2">
            <button class="sn-btn" @click="onClose?.()">닫기</button>
            <button class="sn-btn sn-btn-accent" @click="onSubmit?.()">제출</button>
          </div>
        </div>
      </div>
    </div>
  `,
}
