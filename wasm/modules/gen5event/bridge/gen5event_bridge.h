/*
 * PokeRNGKit Gen V Event WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 EventGenerator5, Searcher5, SHA1,
 * Nazos, Keypresses and Utilities5 by Admiral_Fish, bumba, and EzPzStreamz
 * (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN5EVENT_BRIDGE_H
#define POKERNGKIT_GEN5EVENT_BRIDGE_H

#include <cstdint>

struct Gen5EventPackedRequest
{
    std::uint32_t operation;
    std::uint32_t version;
    std::uint32_t language;
    std::uint32_t dsType;
    std::uint32_t profileTID;
    std::uint32_t profileSID;
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
    std::uint32_t offset;
    std::uint32_t eventTID;
    std::uint32_t eventSID;
    std::uint32_t species;
    std::uint32_t nature;
    std::uint32_t gender;
    std::uint32_t ability;
    std::uint32_t shiny;
    std::uint32_t level;
    std::uint32_t egg;
    std::uint32_t fixedIVMask;
    std::uint32_t ivs[6];
    std::uint32_t filtersDisabled;
    std::uint32_t abilityFilter;
    std::uint32_t genderFilter;
    std::uint32_t shinyFilter;
    std::uint32_t natureMask;
    std::uint32_t hiddenPowerMask;
    std::uint32_t ivMin[6];
    std::uint32_t ivMax[6];
    std::uint32_t perfectIvValue;
    std::uint32_t perfectIvCount;
    std::uint32_t resultLimit;
    std::uint32_t startYear;
    std::uint32_t startMonth;
    std::uint32_t startDay;
    std::uint32_t endYear;
    std::uint32_t endMonth;
    std::uint32_t endDay;
    std::uint32_t seedLow;
    std::uint32_t seedHigh;
    std::uint32_t chunkStart;
    std::uint32_t chunkCount;
};

struct Gen5EventPackedResult
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
    std::uint32_t gen5event_api_version();
    std::uint32_t gen5event_search(const Gen5EventPackedRequest *request);
    std::uintptr_t gen5event_result_ptr();
    std::uint32_t gen5event_result_count();
    std::uint32_t gen5event_processed_count();
    std::uint32_t gen5event_limit_reached();
    std::uint32_t gen5event_last_error();

#ifndef __EMSCRIPTEN__
    std::uint32_t gen5event_test_generate(
        const Gen5EventPackedRequest *request, Gen5EventPackedResult *output, std::uint32_t capacity);
    std::uint64_t gen5event_test_seed(
        const Gen5EventPackedRequest *request, std::uint32_t second, std::uint32_t buttonMask, std::uint32_t timer0);
#endif
}

#endif
