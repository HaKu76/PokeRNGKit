/*
 * PokeRNGKit Researcher WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_RESEARCHER_BRIDGE_H
#define POKERNGKIT_RESEARCHER_BRIDGE_H

#include <cstdint>

struct ResearcherCustomSpec
{
    std::uint32_t enabled;
    std::uint32_t left;
    std::uint32_t operation;
    std::uint32_t right;
    std::uint32_t rightLow;
    std::uint32_t rightHigh;
};

extern "C"
{
    std::uint32_t researcher_api_version();
    std::uint32_t researcher_begin(std::uint32_t rng, const std::uint32_t *seedWords,
                                   std::uint32_t seedWordCount, std::uint32_t initialAdvances,
                                   const ResearcherCustomSpec *customs, std::uint32_t customCount);
    std::uint32_t researcher_generate(std::uint32_t stateCount);
    std::uintptr_t researcher_result_ptr();
    std::uint32_t researcher_result_count();
    std::uint32_t researcher_last_error();
}

#endif
