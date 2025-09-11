export function toastResponse(
  toast,
  res,
  fallbackError = "Something went wrong"
) {
  if (!res) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: fallbackError,
      life: 4000,
    });
    return;
  }

  const { success, message } = res.data || {};

  toast.add({
    severity: success ? "success" : "error",
    summary: success ? "Success" : "Error",
    detail: message || fallbackError,
    life: success ? 3000 : 4000,
  });
}
