<script lang="ts">
  import { onMount, tick } from "svelte";
  import { generateOpenAIChatCompletion, getModels } from "../apis";
  import {
    splitStream,
    validateUrl,
    validateApiKey,
    getModifierKey,
    isModifierKey,
  } from "../utils";
  import Toast from "./Toast.svelte";
  import ConfirmDialog from "./ConfirmDialog.svelte";

  let show = false;
  let showConfig = true;
  let showConfirmReset = false;

  let url = "";
  let key = "";
  let model = "";

  let searchValue = "";
  let models = [];

  // Loading and error states
  let isLoadingModels = false;
  let isStreaming = false;
  let urlError = "";
  let keyError = "";

  // Toast notifications
  let toasts: Array<{ id: number; message: string; type: string }> = [];
  let toastId = 0;

  // Platform-aware shortcuts
  let modifierKey = "⌘";

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    const id = toastId++;
    toasts = [...toasts, { id, message, type }];
  };

  const removeToast = (id: number) => {
    toasts = toasts.filter((t) => t.id !== id);
  };

  const resetConfig = () => {
    console.log("resetConfig");

    try {
      chrome.storage.local.clear().then(() => {
        console.log("Value is cleared");
        showToast("Configuration reset successfully", "success");
      });
    } catch (error) {
      console.log(error);

      localStorage.setItem("url", "");
      localStorage.setItem("key", "");
      localStorage.setItem("model", "");
      showToast("Configuration reset successfully", "success");
    }

    url = "";
    key = "";
    model = "";
    models = [];
    urlError = "";
    keyError = "";
    showConfig = true;
    showConfirmReset = false;
  };

  const submitHandler = (e) => {
    e.preventDefault();

    window.open(
      `${url}/?q=${encodeURIComponent(searchValue)}&models=${model}`,
      "_blank"
    );

    searchValue = "";
    show = false;
  };

  const initHandler = async (e) => {
    e.preventDefault();

    // Validate URL
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      urlError = urlValidation.error;
      return;
    }
    urlError = "";
    url = urlValidation.url;

    // Validate API Key
    const keyValidation = validateApiKey(key);
    if (!keyValidation.valid) {
      keyError = keyValidation.error;
      return;
    }
    keyError = "";
    key = keyValidation.key;

    // Validate model selection
    if (!model) {
      showToast("Please select a model", "error");
      return;
    }

    try {
      chrome.storage.local
        .set({ url: url, key: key, model: model })
        .then(() => {
          console.log("Value is set");
          showToast("Configuration saved successfully", "success");
        });
    } catch (error) {
      console.log(error);

      localStorage.setItem("url", url);
      localStorage.setItem("key", key);
      localStorage.setItem("model", model);
      showToast("Configuration saved successfully", "success");
    }

    showConfig = false;
  };

  const fetchModels = async () => {
    // Validate before fetching
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      urlError = urlValidation.error;
      return;
    }
    urlError = "";
    url = urlValidation.url;

    const keyValidation = validateApiKey(key);
    if (!keyValidation.valid) {
      keyError = keyValidation.error;
      return;
    }
    keyError = "";
    key = keyValidation.key;

    isLoadingModels = true;
    try {
      models = await getModels(key, url);
      if (models && models.length > 0) {
        showToast(
          `Successfully loaded ${models.length} model${models.length > 1 ? "s" : ""}`,
          "success"
        );
      } else {
        showToast("No models found", "info");
      }
    } catch (error) {
      console.log(error);
      showToast(
        error?.detail || "Failed to fetch models. Please check your URL and API key.",
        "error"
      );
      models = [];
    } finally {
      isLoadingModels = false;
    }
  };

  onMount(async () => {
    // Set platform-aware modifier key
    modifierKey = getModifierKey();

    let _storageCache = null;

    try {
      _storageCache = await chrome.storage.local.get();
    } catch (error) {
      console.log(error);
    }

    if (_storageCache) {
      url = _storageCache.url ?? "";
      key = _storageCache.key ?? "";
      model = _storageCache.model ?? "";
      if (_storageCache.url && _storageCache.key && _storageCache.model) {
        isLoadingModels = true;
        models = await getModels(_storageCache.key, _storageCache.url).catch(
          (error) => {
            console.log(error);
            showToast(
              "Failed to load models. Please reconfigure.",
              "error"
            );
            resetConfig();
          }
        );
        isLoadingModels = false;

        if (models) {
          showConfig = false;
        }
      }
    }

    // Listen for messages from background script (icon clicks)
    const messageListener = async (message, sender, sendResponse) => {
      if (message.action === "toggleSearch") {
        show = !show;

        if (show) {
          // Use tick() for more reliable focus management
          await tick();
          const inputElement = document.getElementById(
            showConfig ? "open-webui-url-input" : "open-webui-search-input"
          );
          if (inputElement) {
            inputElement.focus();
          }
        }
      }
    };

    try {
      chrome.runtime.onMessage.addListener(messageListener);
    } catch (error) {
      console.log("Failed to add message listener:", error);
    }

    const down = async (e) => {
      // Reset the configuration when Modifier+Shift+Escape is pressed
      if (show && e.shiftKey && e.key === "Escape" && isModifierKey(e)) {
        e.preventDefault();
        showConfirmReset = true;
        return;
      } else if (e.key === "Escape") {
        if (showConfirmReset) {
          showConfirmReset = false;
          return;
        }
        show = false;
      }

      if (
        e.key === " " &&
        isModifierKey(e) &&
        (e.shiftKey || e.altKey)
      ) {
        e.preventDefault();
        try {
          const response = await chrome.runtime.sendMessage({
            action: "getSelection",
          });

          if (response?.data ?? false) {
            searchValue = response.data;
          }
        } catch (error) {
          console.log("catch", error);
        }

        show = !show;

        // Use tick() for more reliable focus management
        await tick();
        const inputElement = document.getElementById(
          "open-webui-search-input"
        );

        if (inputElement) {
          inputElement.focus();
        }
      }

      if (key !== "" && url !== "") {
        if (
          e.key === "Enter" &&
          isModifierKey(e) &&
          (e.shiftKey || e.altKey)
        ) {
          e.preventDefault();

          if (isStreaming) {
            showToast("Please wait for the current completion to finish", "info");
            return;
          }

          try {
            const response = await chrome.runtime.sendMessage({
              action: "getSelection",
            });

            if (response?.data ?? false) {
              isStreaming = true;
              await chrome.runtime.sendMessage({
                action: "writeText",
                text: "\n",
              });

              const [res, controller] = await generateOpenAIChatCompletion(
                key,
                {
                  model: model,
                  messages: [
                    {
                      role: "system",
                      content: "You are a helpful assistant.",
                    },
                    {
                      role: "user",
                      content: response.data,
                    },
                  ],
                  stream: true,
                },

                models.find((m) => m.id === model)?.owned_by === "openai" ??
                  false
                  ? `${url}/openai`
                  : `${url}/ollama/v1`
              );

              if (res && res.ok) {
                const reader = res.body
                  .pipeThrough(new TextDecoderStream())
                  .pipeThrough(splitStream("\n"))
                  .getReader();

                while (true) {
                  const { value, done } = await reader.read();
                  if (done) {
                    break;
                  }

                  try {
                    let lines = value.split("\n");
                    for (const line of lines) {
                      if (line !== "") {
                        console.log(line);
                        if (line === "data: [DONE]") {
                          console.log("DONE");
                        } else {
                          let data = JSON.parse(line.replace(/^data: /, ""));
                          console.log(data);

                          if ("request_id" in data) {
                            console.log(data.request_id);
                          } else {
                            await chrome.runtime.sendMessage({
                              action: "writeText",
                              text: data.choices[0].delta.content ?? "",
                            });
                          }
                        }
                      }
                    }
                  } catch (error) {
                    console.log(error);
                  }
                }
                showToast("AI completion finished", "success");
              } else {
                showToast("Failed to generate completion", "error");
              }
              isStreaming = false;
            }
          } catch (error) {
            console.log(error);
            showToast("An error occurred during completion", "error");
            isStreaming = false;
          }
        }
      }
    };

    document.addEventListener("keydown", down, { capture: true });

    // Cleanup function
    return () => {
      document.removeEventListener("keydown", down);
      try {
        chrome.runtime.onMessage.removeListener(messageListener);
      } catch (error) {
        console.log("Failed to remove message listener:", error);
      }
    };
  });
</script>

<!-- Toast notifications -->
{#each toasts as toast (toast.id)}
  <Toast
    message={toast.message}
    type={toast.type}
    onClose={() => removeToast(toast.id)}
  />
{/each}

<!-- Confirmation dialog for reset -->
{#if showConfirmReset}
  <ConfirmDialog
    title="Reset Configuration?"
    message="This will clear your Open WebUI URL, API key, and selected model. You'll need to reconfigure the extension."
    confirmText="Reset"
    cancelText="Cancel"
    onConfirm={resetConfig}
    onCancel={() => (showConfirmReset = false)}
  />
{/if}

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
{#if show}
  <div
    class="tlwd-fixed tlwd-top-0 tlwd-right-0 tlwd-left-0 tlwd-bottom-0 tlwd-w-full tlwd-min-h-screen tlwd-h-screen tlwd-flex tlwd-justify-center tlwd-z-[9999999999] tlwd-overflow-hidden tlwd-overscroll-contain"
    on:mousedown={() => {
      show = false;
    }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="spotlight-search-title"
  >
    <!-- Backdrop with blur -->
    <div
      class="tlwd-absolute tlwd-inset-0 tlwd-bg-black/50 tlwd-backdrop-blur-sm backdrop-animation"
    />

    {#if showConfig}
      <div class="tlwd-relative tlwd-m-auto tlwd-max-w-md tlwd-w-full tlwd-mx-4 tlwd-pb-32">
        <div
          class="tlwd-w-full tlwd-flex tlwd-flex-col tlwd-justify-between tlwd-py-3 tlwd-px-4 tlwd-rounded-2xl tlwd-outline tlwd-outline-1 tlwd-outline-gray-700 tlwd-backdrop-blur-3xl tlwd-bg-gray-800/95 tlwd-shadow-2xl modal-animation"
        >
          <h2
            id="spotlight-search-title"
            class="tlwd-text-lg tlwd-font-semibold tlwd-text-neutral-100 tlwd-mb-4"
          >
            Configure Open WebUI
          </h2>

          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <form
            class="tlwd-text-gray-200 tlwd-w-full tlwd-p-0 tlwd-m-0"
            on:submit={initHandler}
            on:mousedown={(e) => {
              e.stopPropagation();
            }}
            autocomplete="off"
          >
            <!-- URL Input -->
            <div class="tlwd-mb-4">
              <label
                for="open-webui-url-input"
                class="tlwd-block tlwd-text-sm tlwd-font-medium tlwd-text-neutral-300 tlwd-mb-2"
              >
                Open WebUI URL
                <span class="tlwd-text-neutral-500 tlwd-text-xs"
                  >(e.g., https://openwebui.example.com)</span
                >
              </label>
              <div
                class="tlwd-flex tlwd-items-center tlwd-gap-3 tlwd-w-full tlwd-bg-gray-700/50 tlwd-rounded-lg tlwd-px-3 tlwd-py-2.5 tlwd-transition-colors {urlError
                  ? 'tlwd-outline tlwd-outline-2 tlwd-outline-red-500'
                  : 'focus-within:tlwd-outline focus-within:tlwd-outline-2 focus-within:tlwd-outline-blue-500'}"
              >
                <div class="tlwd-flex tlwd-items-center tlwd-text-neutral-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width={2}
                    stroke="currentColor"
                    class="tlwd-size-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                    />
                  </svg>
                </div>
                <input
                  id="open-webui-url-input"
                  placeholder="https://openwebui.example.com"
                  class="tlwd-p-0 tlwd-m-0 tlwd-text-base tlwd-w-full tlwd-font-medium tlwd-bg-transparent tlwd-border-none placeholder:tlwd-text-gray-500 tlwd-text-neutral-100 tlwd-outline-none"
                  bind:value={url}
                  on:input={() => (urlError = "")}
                  autocomplete="off"
                  required
                />
              </div>
              {#if urlError}
                <p class="tlwd-text-red-400 tlwd-text-xs tlwd-mt-1 tlwd-ml-1">
                  {urlError}
                </p>
              {/if}
            </div>

            <!-- API Key Input -->
            <div class="tlwd-mb-4">
              <label
                for="open-webui-key-input"
                class="tlwd-block tlwd-text-sm tlwd-font-medium tlwd-text-neutral-300 tlwd-mb-2"
              >
                API Key
                <span class="tlwd-text-neutral-500 tlwd-text-xs"
                  >(from your Open WebUI settings)</span
                >
              </label>
              <div
                class="tlwd-flex tlwd-items-center tlwd-gap-3 tlwd-w-full tlwd-bg-gray-700/50 tlwd-rounded-lg tlwd-px-3 tlwd-py-2.5 tlwd-transition-colors {keyError
                  ? 'tlwd-outline tlwd-outline-2 tlwd-outline-red-500'
                  : 'focus-within:tlwd-outline focus-within:tlwd-outline-2 focus-within:tlwd-outline-blue-500'}"
              >
                <div class="tlwd-flex tlwd-items-center tlwd-text-neutral-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width={2}
                    stroke="currentColor"
                    class="tlwd-size-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
                    />
                  </svg>
                </div>
                <input
                  id="open-webui-key-input"
                  type="password"
                  placeholder="sk-..."
                  class="tlwd-p-0 tlwd-m-0 tlwd-text-base tlwd-w-full tlwd-font-medium tlwd-bg-transparent tlwd-border-none placeholder:tlwd-text-gray-500 tlwd-text-neutral-100 tlwd-outline-none"
                  bind:value={key}
                  on:input={() => (keyError = "")}
                  autocomplete="off"
                  required
                />
                <button
                  class="tlwd-flex tlwd-items-center tlwd-bg-transparent tlwd-text-neutral-300 hover:tlwd-text-neutral-100 tlwd-cursor-pointer tlwd-p-1 tlwd-m-0 tlwd-outline-none tlwd-border-none tlwd-transition-colors tlwd-relative tlwd-group"
                  type="button"
                  on:click={fetchModels}
                  disabled={isLoadingModels}
                  aria-label="Fetch available models"
                  title="Fetch available models"
                >
                  {#if isLoadingModels}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width={2}
                      stroke="currentColor"
                      class="tlwd-size-5 tlwd-animate-spin"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                  {:else}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width={2}
                      stroke="currentColor"
                      class="tlwd-size-5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                  {/if}
                  <span
                    class="tlwd-absolute tlwd-bottom-full tlwd-right-0 tlwd-mb-2 tlwd-px-2 tlwd-py-1 tlwd-text-xs tlwd-bg-gray-900 tlwd-text-white tlwd-rounded tlwd-opacity-0 group-hover:tlwd-opacity-100 tlwd-transition-opacity tlwd-whitespace-nowrap tlwd-pointer-events-none"
                  >
                    Fetch models
                  </span>
                </button>
              </div>
              {#if keyError}
                <p class="tlwd-text-red-400 tlwd-text-xs tlwd-mt-1 tlwd-ml-1">
                  {keyError}
                </p>
              {/if}
            </div>

            <!-- Model Selection -->
            {#if models && models.length > 0}
              <div class="tlwd-mb-4">
                <label
                  for="open-webui-model-input"
                  class="tlwd-block tlwd-text-sm tlwd-font-medium tlwd-text-neutral-300 tlwd-mb-2"
                >
                  Select Model
                </label>
                <div
                  class="tlwd-flex tlwd-items-center tlwd-gap-3 tlwd-w-full tlwd-bg-gray-700/50 tlwd-rounded-lg tlwd-px-3 tlwd-py-2.5 focus-within:tlwd-outline focus-within:tlwd-outline-2 focus-within:tlwd-outline-blue-500 tlwd-transition-colors"
                >
                  <div
                    class="tlwd-flex tlwd-items-center tlwd-text-neutral-400"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width={2}
                      stroke="currentColor"
                      class="tlwd-size-5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                      />
                    </svg>
                  </div>
                  <select
                    id="open-webui-model-input"
                    class="tlwd-p-0 tlwd-m-0 tlwd-text-base tlwd-w-full tlwd-font-medium tlwd-bg-transparent tlwd-border-none tlwd-text-neutral-100 tlwd-outline-none tlwd-cursor-pointer"
                    bind:value={model}
                    autocomplete="off"
                    required
                  >
                    <option value="" class="tlwd-bg-gray-800"
                      >Select a model</option
                    >
                    {#each models as modelOption}
                      <option value={modelOption.id} class="tlwd-bg-gray-800"
                        >{modelOption.name ?? modelOption.id}</option
                      >
                    {/each}
                  </select>
                  <button
                    class="tlwd-flex tlwd-items-center tlwd-bg-blue-600 hover:tlwd-bg-blue-700 tlwd-text-white tlwd-cursor-pointer tlwd-px-3 tlwd-py-1.5 tlwd-rounded-md tlwd-outline-none tlwd-border-none tlwd-transition-colors tlwd-font-medium tlwd-text-sm"
                    type="submit"
                    aria-label="Save configuration"
                    title="Save configuration"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width={2.5}
                      stroke="currentColor"
                      class="tlwd-size-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            {:else if !isLoadingModels}
              <div
                class="tlwd-bg-blue-500/10 tlwd-border tlwd-border-blue-500/30 tlwd-rounded-lg tlwd-p-3 tlwd-mb-4"
              >
                <p class="tlwd-text-sm tlwd-text-blue-300">
                  <strong>Tip:</strong> Click the refresh button next to the API
                  key field to load available models.
                </p>
              </div>
            {/if}

            <!-- Help text -->
            <div
              class="tlwd-text-xs tlwd-text-neutral-400 tlwd-mt-4 tlwd-space-y-1"
            >
              <p>
                <strong>Keyboard shortcuts:</strong>
              </p>
              <p>• {modifierKey}+Space+Shift: Toggle search</p>
              <p>• {modifierKey}+Enter+Shift: AI completion on selected text</p>
              <p>• ESC: Close dialog</p>
            </div>
          </form>
        </div>
      </div>
    {:else}
      <div class="tlwd-relative tlwd-m-auto tlwd-max-w-xl tlwd-w-full tlwd-mx-4 tlwd-pb-32">
        <div
          class="tlwd-w-full tlwd-flex tlwd-flex-col tlwd-justify-between tlwd-py-3 tlwd-px-4 tlwd-rounded-2xl tlwd-outline tlwd-outline-1 tlwd-outline-gray-700 tlwd-backdrop-blur-3xl tlwd-bg-gray-800/95 tlwd-shadow-2xl modal-animation"
        >
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <form
            class="tlwd-text-gray-200 tlwd-w-full tlwd-p-0 tlwd-m-0"
            on:submit={submitHandler}
            on:mousedown={(e) => {
              e.stopPropagation();
            }}
            autocomplete="off"
          >
            <div class="tlwd-flex tlwd-items-center tlwd-gap-3 tlwd-w-full">
              <div class="tlwd-flex tlwd-items-center tlwd-text-neutral-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width={2}
                  stroke="currentColor"
                  class="tlwd-size-5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </div>
              <input
                id="open-webui-search-input"
                placeholder="Search Open WebUI..."
                class="tlwd-p-0 tlwd-m-0 tlwd-text-xl tlwd-w-full tlwd-font-medium tlwd-bg-transparent tlwd-border-none placeholder:tlwd-text-gray-500 tlwd-text-neutral-100 tlwd-outline-none"
                bind:value={searchValue}
                autocomplete="off"
              />
              {#if isStreaming}
                <div
                  class="tlwd-flex tlwd-items-center tlwd-text-blue-400 tlwd-text-sm"
                  title="AI completion in progress"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width={2}
                    stroke="currentColor"
                    class="tlwd-size-4 tlwd-animate-pulse"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
                    />
                  </svg>
                </div>
              {/if}
            </div>

            <div
              class="tlwd-flex tlwd-justify-between tlwd-gap-2 tlwd-items-center tlwd-mt-3"
            >
              <div class="tlwd-flex tlwd-items-center tlwd-gap-2">
                <span
                  class="tlwd-text-xs tlwd-text-neutral-400 tlwd-bg-gray-700/50 tlwd-px-2 tlwd-py-1 tlwd-rounded"
                  title="Currently selected model"
                >
                  {models.find((m) => m.id === model)?.name ?? model}
                </span>
              </div>
              <div class="tlwd-flex tlwd-items-center tlwd-gap-2">
                <div
                  class="tlwd-text-right tlwd-text-[0.7rem] tlwd-p-0 tlwd-m-0 tlwd-text-neutral-400 tlwd-h-fit"
                >
                  {modifierKey}+Space+Shift to toggle
                </div>
                <button
                  class="tlwd-h-fit tlwd-flex tlwd-items-center tlwd-bg-transparent tlwd-text-neutral-300 hover:tlwd-text-neutral-100 tlwd-cursor-pointer tlwd-p-1 tlwd-m-0 tlwd-outline-none tlwd-border-none tlwd-transition-colors tlwd-relative tlwd-group"
                  type="button"
                  on:click={() => {
                    showConfig = true;
                  }}
                  aria-label="Open settings"
                  title="Open settings"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width={2}
                    stroke="currentColor"
                    class="tlwd-size-4"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                    />
                  </svg>
                  <span
                    class="tlwd-absolute tlwd-bottom-full tlwd-right-0 tlwd-mb-2 tlwd-px-2 tlwd-py-1 tlwd-text-xs tlwd-bg-gray-900 tlwd-text-white tlwd-rounded tlwd-opacity-0 group-hover:tlwd-opacity-100 tlwd-transition-opacity tlwd-whitespace-nowrap tlwd-pointer-events-none"
                  >
                    Settings
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    {/if}
  </div>
{/if}
