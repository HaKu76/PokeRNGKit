/*
 * PokeRNGKit Gen VII Main RNG Tool WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN7_MAIN_BRIDGE_H
#define POKERNGKIT_GEN7_MAIN_BRIDGE_H

#include <cstdint>

struct Gen7MainSeedResult
{
    std::uint32_t seed;
    std::uint32_t correction;
};

struct Gen7MainQrResult
{
    std::uint32_t lastClockFrame;
    std::uint32_t afterQrFrame;
};

extern "C"
{
    std::uint32_t gen7main_api_version();
    std::uint32_t gen7main_search_seed(std::uint32_t startSeed, std::uint32_t seedCount,
                                       std::uint32_t offset, const std::uint32_t *needles,
                                       std::uint32_t needleCount, std::uint32_t fuzzy);
    const Gen7MainSeedResult *gen7main_seed_result_ptr();
    std::uint32_t gen7main_seed_result_count();
    std::uint32_t gen7main_qr_search(std::uint32_t seed, std::uint32_t minimumFrame,
                                     std::uint32_t maximumFrame, const std::uint32_t *needles,
                                     std::uint32_t needleCount);
    const Gen7MainQrResult *gen7main_qr_result_ptr();
    std::uint32_t gen7main_qr_result_count();
    std::uint32_t gen7main_calculate_time(std::uint32_t seed, std::uint32_t startingFrame,
                                          std::uint32_t targetFrame, std::uint32_t npc,
                                          std::uint32_t fidget, std::uint32_t raining);
    std::int32_t gen7main_time_primary();
    std::int32_t gen7main_time_secondary();
    std::uint32_t gen7main_last_error();
}

#endif
