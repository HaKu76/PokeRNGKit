/*
 * PokeRNGKit Gen VII Wild Time Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Wild search behavior is adapted from 3DSTimeFinder by Admiral-Fish
 * (GPL-3.0-or-later), including its WildSearcher7 frame-consumption rules.
 */
#ifndef POKERNGKIT_GEN7WILDTIMEFINDER_BRIDGE_H
#define POKERNGKIT_GEN7WILDTIMEFINDER_BRIDGE_H

#include <cstdint>

struct Gen7WildTimeFinderPackedRequest
{
    std::uint32_t seed;
    std::uint32_t minFrame;
    std::uint32_t maxFrame;
    std::uint32_t encounterType;
    std::uint32_t useSynchronize;
    std::uint32_t synchronizeNature;
    std::uint32_t genderRatio;
    std::uint32_t tid;
    std::uint32_t sid;
    std::uint32_t shinyCharm;
    std::uint32_t filtersDisabled;
    std::uint32_t shinyFilter;
    std::uint32_t genderFilter;
    std::uint32_t abilityFilter;
    std::uint32_t natureMask;
    std::uint32_t hiddenPowerMask;
    std::uint32_t slotMask;
    std::uint32_t ivMin[6];
    std::uint32_t ivMax[6];
    std::uint32_t resultLimit;
};

struct Gen7WildTimeFinderPackedResult
{
    std::uint32_t frame;
    std::uint32_t ec;
    std::uint32_t pid;
    std::uint32_t ivs;
    std::uint32_t metadata;
    std::uint32_t slot;
};

extern "C"
{
    std::uint32_t gen7wildtimefinder_api_version();
    std::uint32_t gen7wildtimefinder_begin(const Gen7WildTimeFinderPackedRequest *request);
    std::uint32_t gen7wildtimefinder_step(std::uint32_t maximumStates);
    std::uintptr_t gen7wildtimefinder_result_ptr();
    std::uint32_t gen7wildtimefinder_result_count();
    std::uint32_t gen7wildtimefinder_step_processed();
    std::uint32_t gen7wildtimefinder_total_processed();
    std::uint32_t gen7wildtimefinder_total_results();
    std::uint32_t gen7wildtimefinder_done();
    std::uint32_t gen7wildtimefinder_limit_reached();
    std::uint32_t gen7wildtimefinder_last_error();
}

#endif
