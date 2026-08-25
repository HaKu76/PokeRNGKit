/*
 * PokeRNGKit Gen V Egg WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 EggGenerator5, Searcher5, SHA1,
 * Nazos, Keypresses and Utilities5 by Admiral_Fish, bumba, and EzPzStreamz
 * (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN5EGG_BRIDGE_H
#define POKERNGKIT_GEN5EGG_BRIDGE_H

#include <cstdint>

struct Gen5EggPackedRequest
{
    std::uint32_t operation;
    std::uint32_t version;
    std::uint32_t language;
    std::uint32_t dsType;
    std::uint32_t macLow;
    std::uint32_t macHigh;
    std::uint32_t vcount;
    std::uint32_t timer0Min;
    std::uint32_t timer0Max;
    std::uint32_t gxstat;
    std::uint32_t vframe;
    std::uint32_t keypressCountMask;
    std::uint32_t skipLR;
    std::uint32_t memoryLink;
    std::uint32_t shinyCharm;
    std::uint32_t tid;
    std::uint32_t sid;
    std::uint32_t initialAdvances;
    std::uint32_t maxAdvances;
    std::uint32_t offset;
    std::uint32_t resultLimit;
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
    std::uint32_t seedLow;
    std::uint32_t seedHigh;
    std::uint32_t startYear;
    std::uint32_t startMonth;
    std::uint32_t startDay;
    std::uint32_t endYear;
    std::uint32_t endMonth;
    std::uint32_t endDay;
    std::uint32_t chunkStart;
    std::uint32_t chunkCount;
};

struct Gen5EggPackedResult
{
    std::uint32_t seedLow;
    std::uint32_t seedHigh;
    std::uint32_t date;
    std::uint32_t seconds;
    std::uint32_t timer0Buttons;
    std::uint32_t advances;
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
    std::uint32_t gen5egg_api_version();
    std::uint32_t gen5egg_search(const Gen5EggPackedRequest *request);
    std::uintptr_t gen5egg_result_ptr();
    std::uint32_t gen5egg_result_count();
    std::uint32_t gen5egg_processed_count();
    std::uint32_t gen5egg_limit_reached();
    std::uint32_t gen5egg_last_error();

#ifndef __EMSCRIPTEN__
    std::uint32_t gen5egg_test_generate(
        const Gen5EggPackedRequest *request, Gen5EggPackedResult *output, std::uint32_t capacity);
    std::uint64_t gen5egg_test_seed(
        const Gen5EggPackedRequest *request, std::uint32_t second, std::uint32_t buttonMask, std::uint32_t timer0);
#endif
}

#endif
