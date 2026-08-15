/*
 * PokeRNGKit Gen VII Wild WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Wild behavior is adapted from 3DSRNGTool by wwwwwzx (MIT).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN7WILD_BRIDGE_H
#define POKERNGKIT_GEN7WILD_BRIDGE_H

#include <cstdint>

struct Gen7WildPackedRequest
{
    std::uint32_t version;
    std::uint32_t seed;
    std::uint32_t minFrame;
    std::uint32_t maxFrame;
    std::uint32_t tsv;
    std::uint32_t trv;
    std::uint32_t shinyCharm;
    std::uint32_t syncNature;
    std::uint32_t lead;
    std::uint32_t npc;
    std::uint32_t raining;
    std::uint32_t considerDelay;
    std::uint32_t category;
    std::uint32_t specialRate;
    std::uint32_t levelMin;
    std::uint32_t levelMax;
    std::uint32_t specialLevel;
    std::uint32_t slotType;
    std::uint32_t globalDelayType;
    std::int32_t delayTime;
    std::uint32_t inlineDelayType;
    std::int32_t inlineDelayTime;
    std::uint32_t preHoneyCorrection;
    std::uint32_t honeyDelay;
    std::uint32_t fishing;
    std::uint32_t biteDelay;
    std::uint32_t platformDelay;
    std::uint32_t pokemonDelay;
    std::uint32_t hookedItemThreshold1;
    std::uint32_t hookedItemThreshold2;
    std::uint32_t wildCry;
    std::uint32_t species[11];
    std::uint32_t slotMetadata[11];
    std::uint32_t slotDistribution[12];
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
    std::uint32_t slotMask;
    std::uint32_t specialOnly;
    std::uint32_t levelFilter;
    std::uint32_t resultLimit;
};

struct Gen7WildPackedResult
{
    std::uint32_t frame;
    std::uint32_t realTimeFrames;
    std::uint32_t randomLow;
    std::uint32_t randomHigh;
    std::uint32_t ec;
    std::uint32_t pid;
    std::uint32_t ivs;
    std::uint32_t metadata;
    std::int32_t delay;
    std::uint32_t encounter;
    std::uint32_t specialValue;
};

extern "C"
{
    std::uint32_t gen7wild_api_version();
    std::uint32_t gen7wild_begin(const Gen7WildPackedRequest *request);
    std::uint32_t gen7wild_step(std::uint32_t maximumStates);
    std::uintptr_t gen7wild_result_ptr();
    std::uint32_t gen7wild_result_count();
    std::uint32_t gen7wild_step_processed();
    std::uint32_t gen7wild_total_processed();
    std::uint32_t gen7wild_total_results();
    std::uint32_t gen7wild_done();
    std::uint32_t gen7wild_limit_reached();
    std::uint32_t gen7wild_last_error();
}

#endif
