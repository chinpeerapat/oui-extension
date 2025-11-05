<script lang="ts">
  export let title = "Confirm";
  export let message = "Are you sure?";
  export let confirmText = "Confirm";
  export let cancelText = "Cancel";
  export let onConfirm: () => void = () => {};
  export let onCancel: () => void = () => {};
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="tlwd-fixed tlwd-top-0 tlwd-right-0 tlwd-left-0 tlwd-bottom-0 tlwd-w-full tlwd-min-h-screen tlwd-h-screen tlwd-flex tlwd-justify-center tlwd-items-center tlwd-z-[99999999999] tlwd-overflow-hidden tlwd-overscroll-contain"
  on:mousedown={onCancel}
  role="dialog"
  aria-modal="true"
  aria-labelledby="confirm-dialog-title"
  aria-describedby="confirm-dialog-description"
>
  <div class="tlwd-absolute tlwd-inset-0 tlwd-bg-black/60 backdrop-blur-sm backdrop-animation" />
  <div
    class="tlwd-relative tlwd-m-auto tlwd-max-w-sm tlwd-w-full tlwd-mx-4"
    on:mousedown={(e) => e.stopPropagation()}
  >
    <div
      class="tlwd-w-full tlwd-flex tlwd-flex-col tlwd-p-6 tlwd-rounded-2xl tlwd-outline tlwd-outline-1 tlwd-outline-gray-700 tlwd-bg-gray-800 tlwd-shadow-2xl modal-animation"
    >
      <h3
        id="confirm-dialog-title"
        class="tlwd-text-xl tlwd-font-semibold tlwd-text-neutral-100 tlwd-mb-3"
      >
        {title}
      </h3>
      <p
        id="confirm-dialog-description"
        class="tlwd-text-sm tlwd-text-neutral-300 tlwd-mb-6"
      >
        {message}
      </p>
      <div class="tlwd-flex tlwd-gap-3 tlwd-justify-end">
        <button
          class="tlwd-px-4 tlwd-py-2 tlwd-rounded-lg tlwd-bg-transparent tlwd-border tlwd-border-gray-600 tlwd-text-neutral-300 hover:tlwd-bg-gray-700 tlwd-cursor-pointer tlwd-transition-colors tlwd-font-medium"
          on:click={onCancel}
          type="button"
        >
          {cancelText}
        </button>
        <button
          class="tlwd-px-4 tlwd-py-2 tlwd-rounded-lg tlwd-bg-red-600 hover:tlwd-bg-red-700 tlwd-text-white tlwd-cursor-pointer tlwd-transition-colors tlwd-font-medium tlwd-border-none"
          on:click={onConfirm}
          type="button"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
</div>
