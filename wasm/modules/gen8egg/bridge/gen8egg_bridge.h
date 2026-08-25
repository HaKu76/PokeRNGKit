/*
 * PokeRNGKit Gen VIII Egg WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 EggGenerator8, EggSettings,
 * StateFilter, Xorshift, XoroshiroBDSP and State by Admiral_Fish, bumba,
 * and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN8EGG_BRIDGE_H
#define POKERNGKIT_GEN8EGG_BRIDGE_H

#include <cstdint>

struct Gen8EggPackedRequest
{
    std::uint32_t seed0Low;
    std::uint32_t seed0High;
    std::uint32_t seed1Low;
    std::uint32_t seed1High;
    std::uint32_t initialAdvances;
    std::uint32_t offset;
    std::uint32_t chunkStart;
    std::uint32_t chunkCount;
    std::uint32_t compatibility;
    std::uint32_t tid;
    std::uint32_t sid;
    std::uint32_t shinyCharm;
    std::uint32_t species;
    std::uint32_t masuda;
    std::uint32_t parentAIVs[6];
    std::uint32_t parentBIVs[6];
    std::uint32_t parentAAbility;
    std::uint32_t parentBAbility;
    std::uint32_t parentAGender;
    std::uint32_t parentBGender;
    std::uint32_t parentAItem;
    std::uint32_t parentBItem;
    std::uint32_t parentANature;
    std::uint32_t parentBNature;
    std::uint32_t filtersDisabled;
    std::uint32_t shinyFilter;
    std::uint32_t genderFilter;
    std::uint32_t abilityFilter;
    std::uint32_t natureMask;
    std::uint32_t hiddenPowerMask;
    std::uint32_t ivMin[6];
    std::uint32_t ivMax[6];
    std::uint32_t perfectIvValue;
    std::uint32_t perfectIvCount;
    std::uint32_t resultLimit;
};

struct Gen8EggPackedResult
{
    std::uint32_t advances;
    std::uint32_t seed;
    std::uint32_t ec;
    std::uint32_t pid;
    std::uint32_t metadata;
    std::uint32_t ivs0;
    std::uint32_t ivs1;
    std::uint32_t inheritance;
    std::uint32_t abilityIndex;
    std::uint32_t stats01;
    std::uint32_t stats23;
    std::uint32_t stats45;
    std::uint32_t species;
};

extern "C"
{
    std::uint32_t gen8egg_api_version();
    std::uint32_t gen8egg_generate(const Gen8EggPackedRequest *request);
    std::uintptr_t gen8egg_result_ptr();
    std::uint32_t gen8egg_result_count();
    std::uint32_t gen8egg_processed_count();
    std::uint32_t gen8egg_limit_reached();
    std::uint32_t gen8egg_last_error();
}

#endif
