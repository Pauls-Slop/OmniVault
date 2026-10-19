// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Chrome-only offscreen document: overwrites the clipboard (the service worker has no DOM).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.target !== 'offscreen' || sender.id !== chrome.runtime.id) return false;
  if (msg.type === 'clear-clipboard') {
    const t = document.getElementById('t');
    t.value = ' ';
    t.select();
    document.execCommand('copy');
    sendResponse(true);
  }
  return false;
});
