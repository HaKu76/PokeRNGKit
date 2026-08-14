/*
 * PokeRNGKit Gen V Adjacent Seeds WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 AdjacentSeedsCalculator,
 * SHA1, Nazos, Keypresses, MT, BWRNG and Utilities5 by Admiral_Fish,
 * bumba, and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN5ADJACENTSEEDS_BRIDGE_H
#define POKERNGKIT_GEN5ADJACENTSEEDS_BRIDGE_H

#include <cstdint>

struct Gen5AdjacentSeedsPackedRequest
{
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
    std::uint32_t memoryLink;
    std::uint32_t year;
    std::uint32_t month;
    std::uint32_t day;
    std::uint32_t hour;
    std::uint32_t minute;
    std::uint32_t second;
    std::uint32_t seconds;
    std::uint32_t buttonMask;
    std::uint32_t roamer;
    std::uint32_t initialIVAdvance;
    std::uint32_t maxIVAdvances;
    std::int32_t minSecondOffset;
    std::int32_t maxSecondOffset;
};

struct Gen5AdjacentSeedsPackedResult
{
    std::uint32_t seedLow;
    std::uint32_t seedHigh;
    std::uint32_t date;
    std::uint32_t time;
    std::uint32_t timer0;
    std::uint32_t ivAdvance;
    std::uint32_t ivs;
    std::uint32_t pidAdvanceTarget;
};

extern "C"
{
    std::uint32_t gen5adjacentseeds_api_version();
    std::uint32_t gen5adjacentseeds_generate(const Gen5AdjacentSeedsPackedRequest *request);
    std::uintptr_t gen5adjacentseeds_result_ptr();
    std::uint32_t gen5adjacentseeds_result_count();
    std::uint32_t gen5adjacentseeds_processed_count();
    std::uint32_t gen5adjacentseeds_preview(std::uint32_t seedLow, std::uint32_t seedHigh, std::uint32_t pidAdvance,
                                            std::uint32_t chatot, std::uint8_t *output, std::uint32_t capacity);
    std::uint32_t gen5adjacentseeds_last_error();
}

#endif
