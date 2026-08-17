/*
 * PokeRNGKit Gen VII Festival Plaza WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Festival Plaza behavior is adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including FPFacility, RNGPool and MiscRNGTool.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN7FESTIVALPLAZA_BRIDGE_H
#define POKERNGKIT_GEN7FESTIVALPLAZA_BRIDGE_H

#include <cstdint>

struct Gen7FestivalPlazaPackedRequest
{
    std::uint32_t seed;
    std::uint32_t minFrame;
    std::uint32_t maxFrame;
    std::uint32_t version;
    std::uint32_t npc;
    std::uint32_t delay;
    std::uint32_t rank;
    std::uint32_t starFilter;
    std::uint32_t facilityFilter;
    std::uint32_t npcTypeFilter;
    std::uint32_t colorFilter;
    std::uint32_t includeNpcStatus;
    std::uint32_t resultLimit;
};

extern "C"
{
    std::uint32_t gen7festivalplaza_api_version();
    std::uint32_t gen7festivalplaza_begin(const Gen7FestivalPlazaPackedRequest *request);
    std::uint32_t gen7festivalplaza_step(std::uint32_t maximumStates);
    std::uintptr_t gen7festivalplaza_result_ptr();
    std::uint32_t gen7festivalplaza_result_count();
    std::uint32_t gen7festivalplaza_step_processed();
    std::uint32_t gen7festivalplaza_total_processed();
    std::uint32_t gen7festivalplaza_total_results();
    std::uint32_t gen7festivalplaza_done();
    std::uint32_t gen7festivalplaza_limit_reached();
    std::uint32_t gen7festivalplaza_last_error();
}

#endif
