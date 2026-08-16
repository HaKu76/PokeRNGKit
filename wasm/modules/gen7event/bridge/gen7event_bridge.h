/*
 * PokeRNGKit Gen VII Event WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Event behavior is adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including its SFMT implementation by Rei HOBARA.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN7EVENT_BRIDGE_H
#define POKERNGKIT_GEN7EVENT_BRIDGE_H

#include <cstdint>

struct Gen7EventPackedRequest
{
    std::uint32_t seed;
    std::uint32_t minFrame;
    std::uint32_t maxFrame;
    std::uint32_t version;
    std::uint32_t tsv;
    std::uint32_t trv;
    std::uint32_t npc;
    std::uint32_t delay;
    std::uint32_t considerDelay;
    std::uint32_t noDexEntry;
    std::uint32_t yourId;
    std::uint32_t isEgg;
    std::uint32_t otherInfo;
    std::uint32_t pidType;
    std::uint32_t tid;
    std::uint32_t sid;
    std::uint32_t ec;
    std::uint32_t pid;
    std::uint32_t abilityLocked;
    std::uint32_t ability;
    std::uint32_t natureLocked;
    std::uint32_t nature;
    std::uint32_t genderLocked;
    std::uint32_t gender;
    std::uint32_t genderSetting;
    std::uint32_t species;
    std::uint32_t form;
    std::uint32_t level;
    std::uint32_t randomPerfectIvCount;
    std::int32_t fixedIvs[6];
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

struct Gen7EventPackedResult
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
    std::uint32_t gen7event_api_version();
    std::uint32_t gen7event_begin(const Gen7EventPackedRequest *request);
    std::uint32_t gen7event_step(std::uint32_t maximumStates);
    std::uintptr_t gen7event_result_ptr();
    std::uint32_t gen7event_result_count();
    std::uint32_t gen7event_step_processed();
    std::uint32_t gen7event_total_processed();
    std::uint32_t gen7event_total_results();
    std::uint32_t gen7event_done();
    std::uint32_t gen7event_limit_reached();
    std::uint32_t gen7event_last_error();
}

#endif
