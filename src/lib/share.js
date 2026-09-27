/** Shares text via the native sheet, falling back to the clipboard. */
export async function shareText({ title, parts, showToast }) {
  const body = [...parts, "Shared from Hadith Reflection · https://hadith-reflection.netlify.app/"].join("\n\n");
  if (navigator.share) {
    try {
      await navigator.share({ title, text: body });
    } catch {
      /* dismissed */
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(body);
    showToast("Copied to clipboard");
  } catch {
    showToast("Sharing isn't available in this browser");
  }
}
