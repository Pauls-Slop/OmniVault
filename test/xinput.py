#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
# If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
# Copyright (c) 2026 Die OmniVault-Mitwirkenden
"""Real X11 input for browser tests under Xvfb, through the XTEST extension (libXtst via ctypes, no packages).

Browser keyboard shortcuts of extensions and the native context menu are handled by Chromium outside the web
page, so DevTools input events do not reach them. Events injected here come from the X server like a real
keyboard and mouse.

  python3 test/xinput.py key ctrl+shift+l          # press a key combination
  python3 test/xinput.py move X Y                  # move the pointer (screen coordinates)
  python3 test/xinput.py click X Y [button]        # click (1 left, 3 right)
  python3 test/xinput.py keys Down Down Return     # several keys one after another

Uses $DISPLAY (xvfb-run sets it)."""
import ctypes
import ctypes.util
import sys
import time

xlib = ctypes.CDLL(ctypes.util.find_library('X11') or 'libX11.so.6')
xtst = ctypes.CDLL(ctypes.util.find_library('Xtst') or 'libXtst.so.6')
xlib.XOpenDisplay.restype = ctypes.c_void_p
xlib.XOpenDisplay.argtypes = [ctypes.c_char_p]
xlib.XStringToKeysym.restype = ctypes.c_ulong
xlib.XStringToKeysym.argtypes = [ctypes.c_char_p]
xlib.XKeysymToKeycode.restype = ctypes.c_ubyte
xlib.XKeysymToKeycode.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
xlib.XFlush.argtypes = [ctypes.c_void_p]
xlib.XSync.argtypes = [ctypes.c_void_p, ctypes.c_int]
xlib.XCloseDisplay.argtypes = [ctypes.c_void_p]
xtst.XTestFakeKeyEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
xtst.XTestFakeButtonEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
xtst.XTestFakeMotionEvent.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_ulong]

NAMES = {'ctrl': 'Control_L', 'control': 'Control_L', 'shift': 'Shift_L', 'alt': 'Alt_L', 'super': 'Super_L',
         'enter': 'Return', 'esc': 'Escape', 'down': 'Down', 'up': 'Up', 'menu': 'Menu'}

dpy = xlib.XOpenDisplay(None)
if not dpy:
    sys.exit('Kein X-Display (DISPLAY nicht gesetzt?)')


def keycode(name):
    sym = xlib.XStringToKeysym(NAMES.get(name.lower(), name).encode())
    if not sym:
        sym = xlib.XStringToKeysym(name.lower().encode())
    code = xlib.XKeysymToKeycode(dpy, sym)
    if not code:
        sys.exit(f'Unbekannte Taste: {name}')
    return code


def sync():
    xlib.XSync(dpy, 0)
    time.sleep(0.03)


def combo(spec):
    codes = [keycode(k) for k in spec.split('+')]
    for c in codes:
        xtst.XTestFakeKeyEvent(dpy, c, 1, 0)
        sync()
    for c in reversed(codes):
        xtst.XTestFakeKeyEvent(dpy, c, 0, 0)
        sync()


cmd, args = sys.argv[1], sys.argv[2:]
if cmd == 'key':
    combo(args[0])
elif cmd == 'keys':
    for k in args:
        combo(k)
        time.sleep(0.08)
elif cmd in ('move', 'click'):
    x, y = int(float(args[0])), int(float(args[1]))
    xtst.XTestFakeMotionEvent(dpy, -1, x, y, 0)
    sync()
    if cmd == 'click':
        button = int(args[2]) if len(args) > 2 else 1
        xtst.XTestFakeButtonEvent(dpy, button, 1, 0)
        sync()
        xtst.XTestFakeButtonEvent(dpy, button, 0, 0)
        sync()
else:
    sys.exit(f'Unbekannter Befehl: {cmd}')
xlib.XCloseDisplay(dpy)
