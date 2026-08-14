/*
 * PokeRNGKit Gen VIII ID WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 IDGenerator8, Xorshift,
 * RNGList, IDFilter and IDState8 by Admiral_Fish, bumba, and
 * EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN8ID_BRIDGE_H
#define POKERNGKIT_GEN8ID_BRIDGE_H

#include <cstdint>

struct Gen8IdPackedState
{
    std::uint32_t advances;
    std::uint32_t tidSid;
    std::uint32_t tsv;
    std::uint32_t displayTid;
};

extern "C"
{
    std::uint32_t gen8id_api_version();
    std::uint32_t gen8id_generate(
        std::uint32_t seed0Low, std::uint32_t seed0High, std::uint32_t seed1Low,
        std::uint32_t seed1High, std::uint32_t initialAdvances,
        std::uint32_t chunkOffset, std::uint32_t maxAdvances,
        std::uint32_t filterMode,
        const std::uint32_t *filterValues, std::uint32_t filterCount);
    std::uintptr_t gen8id_result_ptr();
    std::uint32_t gen8id_result_count();
    std::uint32_t gen8id_last_error();
}

#endif
