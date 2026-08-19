/*
 * PokeRNGKit Gen VII Time Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Initial-seed hashing is adapted from 3DSTimeFinder by Admiral-Fish
 * (GPL-3.0-or-later), based on its SHA256::hash implementation.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN7TIMEFINDER_BRIDGE_H
#define POKERNGKIT_GEN7TIMEFINDER_BRIDGE_H

#include <cstdint>

extern "C"
{
    std::uint32_t gen7timefinder_api_version();
    std::uint32_t gen7timefinder_initial_seed(std::uint32_t tick, std::uint32_t epochLow,
                                               std::uint32_t epochHigh);
}

#endif
