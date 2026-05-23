# Hadith Reflection

A simple, offline-first web application designed to help users read, reflect, and save their personal thoughts on Hadith narrations.

## Features

- **Library**: Browse through various Hadith collections and select a chapter to focus on.
- **Focus Mode (Reader)**: Read the selected Hadith with its original Arabic text and English translation. Adjust font sizes to your preference, and write your personal reflections directly within the app.
- **Journal**: All your reflections are automatically saved to your device. You can view them chronologically in your journal.
- **Offline First**: The app caches collections as you read them, so you can continue reading and reflecting even without an internet connection.
- **Privacy & Export/Import**: All data is stored locally on your device. There are no accounts, no tracking, and no servers. You can easily back up your reflections by exporting them to a JSON file, and restore them later by importing the file in the Settings menu.

## How it works

The application is built as a single-page React app. It uses the device's local storage to persist user settings, cached Hadith collections, and all personal reflections. This guarantees your data remains private and entirely in your control.

## Usage

1. Open the **Library** to explore available Hadith collections.
2. Select a chapter to enter **Focus** mode, where you can read narrations and write down your thoughts.
3. Access your **Journal** to review all your saved reflections.
4. Use the **Settings** (accessible via the ⚙️ icon in the Library or Journal pages) to adjust font sizes, manage cached data, or export/import your journal.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
