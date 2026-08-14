/*
 * PokeRNGKit Gen V ID WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 IDGenerator5, IDSearcher5,
 * Searcher5, SHA1, Nazos, Keypresses and Utilities5 by Admiral_Fish,
 * bumba, and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN5ID_BRIDGE_H
#define POKERNGKIT_GEN5ID_BRIDGE_H

#include <cstdint>

struct Gen5IdPackedRequest
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
    std::uint32_t maxAdvances;
    std::uint32_t resultLimit;
    std::uint32_t startYear;
    std::uint32_t startMonth;
    std::uint32_t startDay;
    std::uint32_t endYear;
    std::uint32_t endMonth;
    std::uint32_t endDay;
    std::uint32_t hour;
    std::uint32_t minute;
    std::uint32_t minSecond;
    std::uint32_t maxSecond;
    std::uint32_t pid;
    std::uint32_t filterFlags;
    std::uint32_t tid;
    std::uint32_t sid;
    std::uint32_t chunkStartUnit;
    std::uint32_t chunkUnitCount;
};

struct Gen5IdPackedResult
{
    std::uint32_t seedLow;
    std::uint32_t seedHigh;
    std::uint32_t date;
    std::uint32_t seconds;
    std::uint32_t timer0Buttons;
    std::uint32_t initialAdvances;
    std::uint32_t advances;
    std::uint32_t tidSid;
    std::uint32_t tsv;
};

extern "C"
{
    std::uint32_t gen5id_api_version();
    std::uint32_t gen5id_search(const Gen5IdPackedRequest *request);
    std::uintptr_t gen5id_result_ptr();
    std::uint32_t gen5id_result_count();
    std::uint32_t gen5id_processed_low();
    std::uint32_t gen5id_processed_high();
    std::uint32_t gen5id_limit_reached();
    std::uint32_t gen5id_last_error();

#ifndef __EMSCRIPTEN__
    std::uint64_t gen5id_test_seed(
        const Gen5IdPackedRequest *request, std::uint32_t second, std::uint32_t buttonMask, std::uint32_t timer0);
    std::uint32_t gen5id_test_generate(
        std::uint64_t seed, std::uint32_t version, std::uint32_t maxAdvances, Gen5IdPackedResult *output, std::uint32_t capacity);
#endif
}

#endif
