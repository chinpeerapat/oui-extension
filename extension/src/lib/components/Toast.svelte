<script lang="ts">
  import { onMount } from "svelte";

  export let message = "";
  export let type: "success" | "error" | "info" = "info";
  export let duration = 3000;
  export let onClose: () => void = () => {};

  let visible = true;

  onMount(() => {
    const timer = setTimeout(() => {
      visible = false;
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  });
</script>

{#if visible}
  <div
    class="tlwd-fixed tlwd-top-4 tlwd-right-4 tlwd-z-[99999999999] tlwd-max-w-sm toast-animation"
    role="alert"
    aria-live="polite"
  >
    <div
      class="tlwd-flex tlwd-items-start tlwd-gap-3 tlwd-py-3 tlwd-px-4 tlwd-rounded-lg tlwd-shadow-lg {type ===
      'error'
        ? 'tlwd-bg-red-600/90'
        : type === 'success'
          ? 'tlwd-bg-green-600/90'
          : 'tlwd-bg-blue-600/90'} tlwd-text-white tlwd-backdrop-blur-sm"
    >
      <div class="tlwd-flex-shrink-0 tlwd-mt-0.5">
        {#if type === "error"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="tlwd-h-5 tlwd-w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
        {:else if type === "success"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="tlwd-h-5 tlwd-w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="tlwd-h-5 tlwd-w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
          </svg>
        {/if}
      </div>
      <div class="tlwd-flex-1 tlwd-text-sm tlwd-font-medium">
        {message}
      </div>
      <button
        class="tlwd-flex-shrink-0 tlwd-p-0 tlwd-m-0 tlwd-bg-transparent tlwd-border-none tlwd-cursor-pointer tlwd-text-white/80 hover:tlwd-text-white tlwd-transition-colors"
        on:click={() => {
          visible = false;
          setTimeout(onClose, 300);
        }}
        aria-label="Close notification"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="tlwd-h-5 tlwd-w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
  </div>
{/if}
