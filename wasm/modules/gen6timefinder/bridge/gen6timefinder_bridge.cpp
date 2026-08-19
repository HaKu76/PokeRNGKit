/*
 * PokeRNGKit Gen VI Time Finder WebAssembly bridge.
 * Initial-seed arithmetic is adapted from 3DSTimeFinder StationarySearcher6.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6timefinder_bridge.h"
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif
extern "C" {
POKERNGKIT_KEEPALIVE std::uint32_t gen6timefinder_api_version() { return 1; }
POKERNGKIT_KEEPALIVE std::uint32_t gen6timefinder_initial_seed(std::uint32_t saveVariable, std::uint32_t timeVariable,
                                                                std::uint32_t epochLow, std::uint32_t epochHigh) {
  (void)epochHigh;
  return saveVariable + timeVariable + epochLow;
}
}
