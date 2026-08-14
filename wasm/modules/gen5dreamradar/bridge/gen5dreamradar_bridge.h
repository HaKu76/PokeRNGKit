/*
 * PokeRNGKit Gen V Dream Radar WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 DreamRadarGenerator, Searcher5,
 * SHA1, Nazos, Keypresses and Utilities5 by Admiral_Fish, bumba, and
 * EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN5DREAMRADAR_BRIDGE_H
#define POKERNGKIT_GEN5DREAMRADAR_BRIDGE_H

#include <cstdint>

struct Gen5DreamRadarPackedRequest
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
    std::uint32_t initialAdvances;
    std::uint32_t maxAdvances;
    std::uint32_t badges;
    std::uint32_t resultLimit;
    std::uint32_t tid;
    std::uint32_t sid;
    std::uint32_t slotCount;
    std::uint32_t encounters[6];
    std::uint32_t genders[6];
    std::uint32_t filtersDisabled;
    std::uint32_t ivMin[6];
    std::uint32_t ivMax[6];
    std::uint32_t natureMask;
    std::uint32_t hiddenPowerMask;
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

struct Gen5DreamRadarPackedResult
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
    std::uint32_t abilityIndex;
};

extern "C"
{
    std::uint32_t gen5dreamradar_api_version();
    std::uint32_t gen5dreamradar_search(const Gen5DreamRadarPackedRequest *request);
    std::uintptr_t gen5dreamradar_result_ptr();
    std::uint32_t gen5dreamradar_result_count();
    std::uint32_t gen5dreamradar_processed_count();
    std::uint32_t gen5dreamradar_limit_reached();
    std::uint32_t gen5dreamradar_last_error();

#ifndef __EMSCRIPTEN__
    std::uint32_t gen5dreamradar_test_generate(
        const Gen5DreamRadarPackedRequest *request, Gen5DreamRadarPackedResult *output, std::uint32_t capacity);
    std::uint64_t gen5dreamradar_test_seed(
        const Gen5DreamRadarPackedRequest *request, std::uint32_t second, std::uint32_t buttonMask, std::uint32_t timer0);
#endif
}

#endif
