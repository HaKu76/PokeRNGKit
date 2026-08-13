/*
 * PokeRNGKit Gen IV Seed to Time WebAssembly bridge.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 * Copyright (C) 2026 Hakuhiro
 *
 * Derived from PokeFinder's SeedToTimeCalculator4 under GNU GPL-3.0-or-later.
 */

#ifndef POKERNGKIT_GEN4SEEDTOTIME_BRIDGE_H
#define POKERNGKIT_GEN4SEEDTOTIME_BRIDGE_H

#include <cstdint>

struct Gen4SeedToTimePackedState
{
    std::uint32_t year;
    std::uint32_t month;
    std::uint32_t day;
    std::uint32_t hour;
    std::uint32_t minute;
    std::uint32_t second;
    std::uint32_t delay;
};

struct Gen4SeedToTimePackedCalibration
{
    std::uint32_t seed;
    std::uint32_t year;
    std::uint32_t month;
    std::uint32_t day;
    std::uint32_t hour;
    std::uint32_t minute;
    std::uint32_t second;
    std::uint32_t delay;
    std::uint32_t sequenceLow;
    std::uint32_t sequenceHigh;
    std::uint32_t raikouRoute;
    std::uint32_t enteiRoute;
    std::uint32_t latiRoute;
    std::uint32_t skips;
};

extern "C"
{
    std::uint32_t gen4seedtotime_api_version();
    std::uint32_t gen4seedtotime_generate(std::uint32_t seed, std::uint32_t year, std::uint32_t forceSecond,
                                         std::uint32_t forcedSecond, std::uint32_t mode, std::uint32_t roamerMask,
                                         std::uint32_t raikouRoute, std::uint32_t enteiRoute, std::uint32_t latiRoute);
    std::uint32_t gen4seedtotime_calibrate(
        std::uint32_t year, std::uint32_t month, std::uint32_t day, std::uint32_t hour, std::uint32_t minute,
        std::uint32_t second, std::uint32_t delay, std::uint32_t delayCalibration, std::uint32_t secondCalibration,
        std::uint32_t mode, std::uint32_t roamerMask, std::uint32_t raikouRoute, std::uint32_t enteiRoute,
        std::uint32_t latiRoute);
    std::uintptr_t gen4seedtotime_result_ptr();
    std::uint32_t gen4seedtotime_result_count();
    std::uintptr_t gen4seedtotime_calibration_ptr();
    std::uint32_t gen4seedtotime_calibration_count();
    std::uint32_t gen4seedtotime_status_sequence_low();
    std::uint32_t gen4seedtotime_status_sequence_high();
    std::uint32_t gen4seedtotime_status_raikou_route();
    std::uint32_t gen4seedtotime_status_entei_route();
    std::uint32_t gen4seedtotime_status_lati_route();
    std::uint32_t gen4seedtotime_status_skips();
    std::uint32_t gen4seedtotime_last_error();
}

#endif
