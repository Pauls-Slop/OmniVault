// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// Page script (MAIN world, only with "Passkeys" turned on and access to websites): wraps
// navigator.credentials.create()/get() for passkeys (publicKey). Each call is offered to OmniVault through the
// bridge (content script webauthn.js); when OmniVault has nothing to offer or the user picks "other device",
// the browser's own implementation gets the unchanged call. Runs in the page, so it holds nothing secret:
// it only passes the page's own options out and the page's own credential back.
(() => {
  const CHANNEL = 'omnivault-webauthn';
  const container = globalThis.CredentialsContainer?.prototype;
  if (window.top !== window || !container || typeof PublicKeyCredential === 'undefined') return;
  const nativeCreate = container.create;
  const nativeGet = container.get;
  // DOM events with JSON text: they stay in this document (no other frame can send them), and plain strings pass
  // the boundary to the content script unchanged in every browser (Firefox wraps objects from the page).
  const post = (msg) => document.dispatchEvent(new CustomEvent(`${CHANNEL}:bridge`, { detail: JSON.stringify(msg) }));

  /* ---------- talking to the bridge ---------- */
  let bridge;
  const bridgeReady = new Promise((resolve) => { bridge = resolve; });
  const listeners = new Map();
  document.addEventListener(`${CHANNEL}:page`, (e) => {
    let m;
    try { m = JSON.parse(e.detail); } catch { return; }
    if (m?.type === 'ready') { bridge(true); post({ type: 'seen' }); } // tells the bridge this page script runs
    else listeners.get(m.id)?.(m);
  });
  post({ type: 'hello' });

  /* ---------- binary ↔ base64url ---------- */
  const bytes = (b) => (b instanceof ArrayBuffer ? new Uint8Array(b) : new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
  const enc = (b) => {
    let s = '';
    for (const x of bytes(b)) s += String.fromCharCode(x);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const dec = (s) => {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  };
  const descriptors = (list) => (list ?? []).map((c) => ({ type: c.type, id: enc(c.id), transports: c.transports ? [...c.transports] : undefined }));

  /** The page's options as JSON (throws on anything unexpected → the browser handles the call). */
  function serialize(kind, pk) {
    if (kind === 'create') {
      return {
        rp: { id: pk.rp?.id, name: pk.rp?.name },
        user: { id: enc(pk.user.id), name: pk.user.name, displayName: pk.user.displayName },
        challenge: enc(pk.challenge),
        pubKeyCredParams: (pk.pubKeyCredParams ?? []).map((p) => ({ type: p.type, alg: p.alg })),
        timeout: pk.timeout, excludeCredentials: descriptors(pk.excludeCredentials),
        authenticatorSelection: pk.authenticatorSelection ? { ...pk.authenticatorSelection } : undefined,
        attestation: pk.attestation, extensions: { credProps: !!pk.extensions?.credProps },
      };
    }
    return {
      challenge: enc(pk.challenge), timeout: pk.timeout, rpId: pk.rpId,
      allowCredentials: descriptors(pk.allowCredentials), userVerification: pk.userVerification,
    };
  }

  /** A credential object that behaves like the browser's (instanceof, getters, toJSON). */
  function toCredential(kind, c) {
    const r = c.response;
    const val = (value) => ({ value, enumerable: true });
    const fn = (value) => ({ value });
    const response = kind === 'create'
      ? Object.create(AuthenticatorAttestationResponse.prototype, {
        clientDataJSON: val(dec(r.clientDataJSON)), attestationObject: val(dec(r.attestationObject)),
        getTransports: fn(() => [...r.transports]), getAuthenticatorData: fn(() => dec(r.authenticatorData)),
        getPublicKey: fn(() => dec(r.publicKey)), getPublicKeyAlgorithm: fn(() => r.publicKeyAlgorithm),
      })
      : Object.create(AuthenticatorAssertionResponse.prototype, {
        clientDataJSON: val(dec(r.clientDataJSON)), authenticatorData: val(dec(r.authenticatorData)),
        signature: val(dec(r.signature)), userHandle: val(r.userHandle ? dec(r.userHandle) : null),
      });
    const json = () => ({
      id: c.id, rawId: c.id, type: 'public-key', authenticatorAttachment: c.authenticatorAttachment,
      clientExtensionResults: JSON.parse(JSON.stringify(c.clientExtensionResults ?? {})),
      response: kind === 'create'
        ? { clientDataJSON: r.clientDataJSON, attestationObject: r.attestationObject, authenticatorData: r.authenticatorData,
          publicKey: r.publicKey, publicKeyAlgorithm: r.publicKeyAlgorithm, transports: [...r.transports] }
        : { clientDataJSON: r.clientDataJSON, authenticatorData: r.authenticatorData, signature: r.signature, userHandle: r.userHandle ?? null },
    });
    return Object.create(PublicKeyCredential.prototype, {
      id: val(c.id), rawId: val(dec(c.id)), type: val('public-key'), authenticatorAttachment: val(c.authenticatorAttachment),
      response: val(response), getClientExtensionResults: fn(() => JSON.parse(JSON.stringify(c.clientExtensionResults ?? {}))),
      toJSON: fn(json),
    });
  }

  const MESSAGES = {
    NotAllowedError: 'The operation either timed out or was not allowed.',
    InvalidStateError: 'The authenticator already contains one of the credentials.',
    AbortError: 'The operation was aborted.',
  };
  const aborted = (signal) => signal.reason ?? new DOMException(MESSAGES.AbortError, 'AbortError');

  async function offer(kind, options, browser) {
    const { signal } = options;
    if (signal?.aborted) throw aborted(signal);
    let json;
    try { json = serialize(kind, options.publicKey); } catch { return browser(options); }
    const ready = await Promise.race([bridgeReady, new Promise((r) => { setTimeout(() => r(false), 2000); })]);
    if (!ready) return browser(options);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve, reject) => {
      let done = false;
      let own = null; // the browser's conditional request running next to ours
      const end = (tell) => {
        done = true;
        listeners.delete(id);
        signal?.removeEventListener('abort', onAbort);
        if (tell) post({ type: 'end', id });
      };
      const onAbort = () => { if (done) return; end(true); own?.abort(); reject(aborted(signal)); };
      signal?.addEventListener('abort', onAbort);
      listeners.set(id, (m) => {
        if (done) return;
        if (m.type === 'decision') {
          if (m.action === 'fallback') { end(false); browser(options).then(resolve, reject); return; }
          if (m.action === 'conditional') {
            // the browser's own suggestions stay available; whichever answers first wins
            own = new AbortController();
            browser({ ...options, signal: own.signal }).then(
              (c) => { if (!done) { end(true); resolve(c); } },
              (e) => { if (!done && !own.signal.aborted) { end(true); reject(e); } });
          }
          return;
        }
        if (m.type !== 'result') return;
        end(false);
        own?.abort();
        const r = m.result ?? {};
        if (r.fallback) browser(options).then(resolve, reject);
        else if (r.error) reject(new DOMException(MESSAGES[r.error] ?? MESSAGES.NotAllowedError, r.error));
        else resolve(toCredential(kind, r.credential));
      });
      post({ type: 'request', id, kind, options: json, mediation: options.mediation });
    });
  }

  const wrap = (kind, native) => ({
    [kind](options) {
      if (!options?.publicKey) return native.call(this, options);
      return offer(kind, options, (o) => native.call(this, o));
    },
  })[kind];
  Object.defineProperty(container, 'create', { value: wrap('create', nativeCreate), writable: true, configurable: true, enumerable: true });
  Object.defineProperty(container, 'get', { value: wrap('get', nativeGet), writable: true, configurable: true, enumerable: true });
  // With an account that stores passkeys, OmniVault is a passkey provider that verifies the user (unlock), so
  // sites may offer to create passkeys even where the browser itself has no platform authenticator.
  const uvpaa = PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
  if (uvpaa) {
    const capable = () => new Promise((resolve) => {
      const id = `c${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timer = setTimeout(() => { listeners.delete(id); resolve(false); }, 2000);
      listeners.set(id, (m) => { clearTimeout(timer); listeners.delete(id); resolve(!!m.capable); });
      bridgeReady.then(() => post({ type: 'capable', id }));
    });
    Object.defineProperty(PublicKeyCredential, 'isUserVerifyingPlatformAuthenticatorAvailable', {
      value: async function isUserVerifyingPlatformAuthenticatorAvailable() {
        return (await capable()) || uvpaa.call(PublicKeyCredential);
      },
      writable: true, configurable: true,
    });
  }
})();
