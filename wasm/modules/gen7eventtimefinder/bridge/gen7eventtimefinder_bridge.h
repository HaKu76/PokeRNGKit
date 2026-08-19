/*
 * PokeRNGKit Gen VII Event Time Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Event search behavior is adapted from 3DSTimeFinder by Admiral-Fish
 * (GPL-3.0-or-later), including its SFMT and EventResult rules.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN7EVENTTIMEFINDER_BRIDGE_H
#define POKERNGKIT_GEN7EVENTTIMEFINDER_BRIDGE_H

#include <cstdint>

struct Gen7EventTimeFinderPackedRequest
{
    std::uint32_t seed;
    std::uint32_t minFrame;
    std::uint32_t maxFrame;
    std::uint32_t version;
    std::uint32_t tid;
    std::uint32_t sid;
    std::uint32_t profileTid;
    std::uint32_t profileSid;
    std::uint32_t ownId;
    std::uint32_t otherInfo;
    std::uint32_t pidType;
    std::uint32_t ec;
    std::uint32_t pid;
    std::uint32_t randomPerfectIvCount;
    std::uint32_t abilityLocked;
    std::uint32_t ability;
    std::uint32_t natureLocked;
    std::uint32_t nature;
    std::uint32_t genderLocked;
    std::uint32_t gender;
    std::int32_t fixedIvs[6];
    std::uint32_t filtersDisabled;
    std::uint32_t shinyFilter;
    std::uint32_t genderFilter;
    std::uint32_t abilityFilter;
    std::uint32_t natureMask;
    std::uint32_t hiddenPowerMask;
    std::uint32_t ivMin[6];
    std::uint32_t ivMax[6];
    std::uint32_t resultLimit;
};

struct Gen7EventTimeFinderPackedResult
{
    std::uint32_t frame;
    std::uint32_t ec;
    std::uint32_t pid;
    std::uint32_t ivs;
    std::uint32_t metadata;
};

extern "C"
{
    std::uint32_t gen7eventtimefinder_api_version();
    std::uint32_t gen7eventtimefinder_begin(const Gen7EventTimeFinderPackedRequest *request);
    std::uint32_t gen7eventtimefinder_step(std::uint32_t maximumStates);
    std::uintptr_t gen7eventtimefinder_result_ptr();
    std::uint32_t gen7eventtimefinder_result_count();
    std::uint32_t gen7eventtimefinder_step_processed();
    std::uint32_t gen7eventtimefinder_total_processed();
    std::uint32_t gen7eventtimefinder_total_results();
    std::uint32_t gen7eventtimefinder_done();
    std::uint32_t gen7eventtimefinder_limit_reached();
    std::uint32_t gen7eventtimefinder_last_error();
}

#endif
