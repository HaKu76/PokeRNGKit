/*
 * PokeRNGKit Gen VII SOS WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII SOS behavior is adapted from 3DSRNGTool by wwwwwzx (MIT).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN7SOS_BRIDGE_H
#define POKERNGKIT_GEN7SOS_BRIDGE_H

#include <cstdint>

struct Gen7SosPackedRequest
{
    std::uint32_t mode;
    std::uint32_t version;
    std::uint32_t seed;
    std::uint32_t minFrame;
    std::uint32_t maxFrame;
    std::uint32_t resultLimit;
    std::uint32_t tsv;
    std::uint32_t trv;
    std::uint32_t shinyCharm;
    std::uint32_t syncNature;
    std::uint32_t lead;
    std::uint32_t npc;
    std::uint32_t considerDelay;
    std::uint32_t delayTime;
    std::uint32_t sosSeed;
    std::uint32_t sosFrame;
    std::uint32_t chainLength;
    std::uint32_t levelMin;
    std::uint32_t levelMax;
    std::uint32_t weather;
    std::uint32_t callRate;
    std::uint32_t hpBonus;
    std::uint32_t adrenalineOrb;
    std::uint32_t intimidate;
    std::uint32_t lastCallSucceeded;
    std::uint32_t lastCallFailed;
    std::uint32_t superEffective;
    std::uint32_t existingPerfectIvMask;
    std::uint32_t battleDelay;
    std::uint32_t species[9];
    std::uint32_t slotMetadata[9];
    std::uint32_t pokemonFiltersDisabled;
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
    std::uint32_t pokemonSlotMask;
    std::uint32_t pokemonLevelFilter;
    std::uint32_t callFiltersDisabled;
    std::uint32_t successOnly;
    std::uint32_t syncOnly;
    std::uint32_t hiddenAbilityOnly;
    std::uint32_t callSlotMask;
    std::uint32_t callLevelFilter;
};

struct Gen7SosPackedResult
{
    std::uint32_t frame;
    std::uint32_t realTimeFrames;
    std::uint32_t randomLow;
    std::uint32_t randomHigh;
    std::uint32_t ec;
    std::uint32_t pid;
    std::uint32_t ivs;
    std::uint32_t metadata;
    std::uint32_t delayOrAdvance;
    std::uint32_t encounter;
    std::uint32_t callInfo;
    std::uint32_t bumpedIvMask;
    std::uint32_t battleAdvance;
    std::uint32_t reserved;
};

extern "C"
{
    std::uint32_t gen7sos_api_version();
    std::uint32_t gen7sos_begin(const Gen7SosPackedRequest *request);
    std::uint32_t gen7sos_step(std::uint32_t maximumStates);
    std::uintptr_t gen7sos_result_ptr();
    std::uint32_t gen7sos_result_count();
    std::uint32_t gen7sos_step_processed();
    std::uint32_t gen7sos_total_processed();
    std::uint32_t gen7sos_total_results();
    std::uint32_t gen7sos_done();
    std::uint32_t gen7sos_limit_reached();
    std::uint32_t gen7sos_last_error();
}

#endif
