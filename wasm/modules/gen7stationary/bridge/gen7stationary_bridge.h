/*
 * PokeRNGKit Gen VII Stationary WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Stationary behavior is adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including its SFMT implementation by Rei HOBARA.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN7STATIONARY_BRIDGE_H
#define POKERNGKIT_GEN7STATIONARY_BRIDGE_H

#include <cstdint>

struct Gen7StationaryPackedRequest
{
    std::uint32_t seed;
    std::uint32_t minFrame;
    std::uint32_t maxFrame;
    std::uint32_t version;
    std::uint32_t tsv;
    std::uint32_t trv;
    std::uint32_t shinyCharm;
    std::uint32_t syncNature;
    std::uint32_t npc;
    std::int32_t delay;
    std::uint32_t delayType;
    std::uint32_t considerDelay;
    std::uint32_t raining;
    std::uint32_t pelagoShift;
    std::uint32_t species;
    std::uint32_t form;
    std::uint32_t level;
    std::uint32_t gender;
    std::uint32_t randomGender;
    std::uint32_t ability;
    std::int32_t ivs[6];
    std::uint32_t fixedThreeIv;
    std::uint32_t alwaysSync;
    std::uint32_t shinyLocked;
    std::uint32_t forcedShiny;
    std::uint32_t pelago;
    std::uint32_t trade;
    std::uint32_t fateful;
    std::uint32_t postNatureLock;
    std::uint32_t filtersDisabled;
    std::uint32_t shinyOnly;
    std::uint32_t squareShinyOnly;
    std::uint32_t genderFilter;
    std::uint32_t abilityFilter;
    std::uint32_t natureMask;
    std::uint32_t hiddenPowerMask;
    std::uint32_t ivMin[6];
    std::uint32_t ivMax[6];
    std::uint32_t perfectIvValue;
    std::uint32_t perfectIvCount;
    std::uint32_t blinkFilter;
    std::uint32_t resultLimit;
};

struct Gen7StationaryPackedResult
{
    std::uint32_t frame;
    std::uint32_t realTimeFrames;
    std::uint32_t randomLow;
    std::uint32_t randomHigh;
    std::uint32_t ec;
    std::uint32_t pid;
    std::uint32_t ivs;
    std::uint32_t metadata;
    std::uint32_t delay;
};

extern "C"
{
    std::uint32_t gen7stationary_api_version();
    std::uint32_t gen7stationary_begin(const Gen7StationaryPackedRequest *request);
    std::uint32_t gen7stationary_step(std::uint32_t maximumStates);
    std::uintptr_t gen7stationary_result_ptr();
    std::uint32_t gen7stationary_result_count();
    std::uint32_t gen7stationary_step_processed();
    std::uint32_t gen7stationary_total_processed();
    std::uint32_t gen7stationary_total_results();
    std::uint32_t gen7stationary_done();
    std::uint32_t gen7stationary_limit_reached();
    std::uint32_t gen7stationary_last_error();
}

#endif
