// This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
// If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Die OmniVault-Mitwirkenden
// The few C library functions the Argon2 reference implementation needs, for a WebAssembly build without a libc.
// malloc is a bump allocator on top of the module's own memory; heap_reset() (called after every hash) releases
// and zeroes everything at once. sprintf/strtoul exist only for the encoded-hash helpers, which OmniVault never calls.
#include <stddef.h>

extern unsigned char __heap_base;
static size_t top = 0;

void *memcpy(void *d, const void *s, size_t n) {
  unsigned char *a = d; const unsigned char *b = s;
  while (n--) *a++ = *b++;
  return d;
}

void *memset(void *d, int c, size_t n) {
  unsigned char *a = d;
  while (n--) *a++ = (unsigned char)c;
  return d;
}

size_t strlen(const char *s) { size_t n = 0; while (s[n]) n++; return n; }
int strcmp(const char *a, const char *b) { while (*a && *a == *b) { a++; b++; } return (unsigned char)*a - (unsigned char)*b; }
int strncmp(const char *a, const char *b, size_t n) {
  for (; n; n--, a++, b++) { if (*a != *b || !*a) return (unsigned char)*a - (unsigned char)*b; }
  return 0;
}

void *malloc(size_t n) {
  if (!top) top = (size_t)&__heap_base;
  size_t start = (top + 15) & ~(size_t)15;
  size_t end = start + n;
  size_t have = __builtin_wasm_memory_size(0) * 65536;
  if (end > have && __builtin_wasm_memory_grow(0, (end - have + 65535) / 65536) == (size_t)-1) return NULL;
  top = end;
  return (void *)start;
}

void *calloc(size_t n, size_t s) {
  if (s && n > (size_t)-1 / s) return NULL;
  void *p = malloc(n * s);
  if (p) memset(p, 0, n * s);
  return p;
}

void free(void *p) { (void)p; }

void heap_reset(void) {
  size_t base = (size_t)&__heap_base;
  if (top > base) memset((void *)base, 0, top - base);
  top = base;
}

int sprintf(char *s, const char *f, ...) { (void)f; s[0] = 0; return 0; }
unsigned long strtoul(const char *s, char **e, int b) { (void)b; if (e) *e = (char *)s; return 0; }
