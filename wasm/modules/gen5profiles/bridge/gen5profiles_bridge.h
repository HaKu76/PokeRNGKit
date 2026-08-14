/*
 * PokeRNGKit Gen V Profile Calibrator WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 ProfileSearcher5, SHA1,
 * Nazos, Keypresses, MTFast and Utilities5 by Admiral_Fish, bumba,
 * and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN5PROFILES_BRIDGE_H
#define POKERNGKIT_GEN5PROFILES_BRIDGE_H

#include <cstdint>

struct Gen5ProfilesPackedRequest
{
    std::uint32_t mode;
    std::uint32_t version;
    std::uint32_t language;
    std::uint32_t dsType;
    std::uint32_t macLow;
    std::uint32_t macHigh;
    std::uint32_t buttonMask;
    std::uint32_t year;
    std::uint32_t month;
    std::uint32_t day;
    std::uint32_t hour;
    std::uint32_t minute;
    std::uint32_t minSeconds;
    std::uint32_t maxSeconds;
    std::uint32_t minVCount;
    std::uint32_t maxVCount;
    std::uint32_t minTimer0;
    std::uint32_t maxTimer0;
    std::uint32_t minGxStat;
    std::uint32_t maxGxStat;
    std::uint32_t minVFrame;
    std::uint32_t maxVFrame;
    std::uint32_t minIVs[6];
    std::uint32_t maxIVs[6];
    std::uint32_t needleType;
    std::uint32_t memoryLink;
    std::uint32_t seedLow;
    std::uint32_t seedHigh;
    std::uint32_t resultLimit;
};

struct Gen5ProfilesPackedResult
{
    std::uint32_t seedLow;
    std::uint32_t seedHigh;
    std::uint32_t timeValues;
    std::uint32_t hardwareValues;
};

extern "C"
{
    std::uint32_t gen5profiles_api_version();
    std::uint32_t gen5profiles_search(
        const Gen5ProfilesPackedRequest *request, const std::uint8_t *needles, std::uint32_t needleCount);
    std::uintptr_t gen5profiles_result_ptr();
    std::uint32_t gen5profiles_result_count();
    std::uint32_t gen5profiles_processed_low();
    std::uint32_t gen5profiles_processed_high();
    std::uint32_t gen5profiles_limit_reached();
    std::uint32_t gen5profiles_last_error();
}

#endif
