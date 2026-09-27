// Saves the journal as a JSON file. Inside the Android app (a Trusted Web
// Activity) a plain <a download> works for blob URLs, but the share sheet is
// the more natural route on a phone, so try that first when it can carry files.

export async function exportJournal(entries) {
  const name = `hadith-journal-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Hadith Reflection journal" });
      return "Journal exported";
    } catch (error) {
      if (error?.name === "AbortError") return "Export cancelled";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return `Saved ${name}`;
}
